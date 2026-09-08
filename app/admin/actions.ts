"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { sql } from "@/lib/db";
import { isAdmin, setAdminSession, clearAdminSession } from "@/lib/admin-session";

// 비밀번호는 환경변수(ADMIN_PASSWORD)로 바꿀 수 있고, 안 넣으면 기본값
// "kpr1234"를 쓴다 — 해커톤 데모 기준으로는 충분한 문턱.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "kpr1234";

const VALID_PLACE_TYPES = ["meal", "cafe", "both"] as const;

function toIntOrNull(v: FormDataEntryValue | null): number | null {
  if (v === null) return null;
  const s = v.toString().trim();
  if (s.length === 0) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * "photo" 필드로 실제 사진 파일이 올라왔으면 Vercel Blob에 업로드하고 그 URL을
 * 돌려준다 (review 작성 화면의 사진 업로드와 동일한 방식). 파일이 없으면 null —
 * 이 경우 호출부에서 기존 image_url 텍스트 입력값(URL 직접 붙여넣기, 여전히
 * 지원함)으로 대체한다. 업로드 자체가 실패해도 나머지 저장은 막지 않는다.
 */
async function uploadPlacePhoto(formData: FormData, pathHint: string): Promise<string | null> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return null;
  try {
    const blob = await put(`places/${pathHint}/${randomUUID()}-${file.name}`, file, {
      access: "public",
    });
    return blob.url;
  } catch (err) {
    console.error("장소 사진 업로드 실패 (URL 입력값이 있으면 그걸로 대신 저장됨):", err);
    return null;
  }
}

export async function adminLogin(formData: FormData) {
  const password = formData.get("password")?.toString() ?? "";
  if (password !== ADMIN_PASSWORD) {
    redirect("/admin?error=" + encodeURIComponent("비밀번호가 올바르지 않아요."));
  }
  await setAdminSession();
  redirect("/admin");
}

export async function adminLogout() {
  await clearAdminSession();
  redirect("/admin");
}

/** 장소별 대표 메뉴 / 대표 사진 URL / 20대 트렌드 여부를 저장한다. */
export async function updatePlaceExtras(formData: FormData) {
  if (!(await isAdmin())) {
    redirect("/admin");
  }

  const placeId = formData.get("place_id")?.toString();
  if (!placeId) return;

  const signatureMenuRaw = formData.get("signature_menu")?.toString().trim() ?? "";
  const imageUrlRaw = formData.get("image_url")?.toString().trim() ?? "";
  const signatureMenu = signatureMenuRaw.length > 0 ? signatureMenuRaw : null;
  // 사진 파일을 새로 올렸으면 그걸 최우선으로 쓰고, 없으면 URL 텍스트 입력값
  // (기존 방식, 계속 지원)을 쓴다. 둘 다 비어 있으면 사진을 지우는 것으로 처리.
  const uploadedUrl = await uploadPlacePhoto(formData, placeId);
  const imageUrl = uploadedUrl ?? (imageUrlRaw.length > 0 ? imageUrlRaw : null);
  // 체크박스는 체크됐을 때만 formData에 실려온다 ("on") — 안 실려오면 꺼진 것.
  const isTrendy = formData.get("is_trendy") === "on";

  await sql`
    update places
    set signature_menu = ${signatureMenu}, image_url = ${imageUrl}, is_trendy = ${isTrendy}
    where id = ${placeId}
  `;

  // 관리자 페이지 자신과, 실제로 이 값을 보여주는 메인 피드/상세 페이지 캐시를
  // 함께 갱신해서 저장 즉시 반영되게 한다.
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/places/${placeId}`);
}

/**
 * 을지로3가 힙지로 확장처럼, 카카오 로컬 API로 다시 수집하지 않고도 관리자가
 * 직접 새 핫플(올디스타코, 아소토베이커리 등)을 등록할 수 있게 하는 액션.
 * 정확한 위경도는 모르는 게 정상이라 latitude/longitude는 비워두고
 * (스키마에서 이미 nullable로 완화해뒀음), kakao_place_id는 유니크 제약을
 * 만족시키기 위해 서버에서 자동 생성한다.
 */
export async function createPlace(formData: FormData) {
  if (!(await isAdmin())) {
    redirect("/admin");
  }

  const name = formData.get("name")?.toString().trim() ?? "";
  const categoryRaw = formData.get("category")?.toString().trim() ?? "";
  const roadAddressRaw = formData.get("road_address")?.toString().trim() ?? "";
  const kakaoUrlRaw = formData.get("kakao_url")?.toString().trim() ?? "";
  const signatureMenuRaw = formData.get("signature_menu")?.toString().trim() ?? "";
  const imageUrlRaw = formData.get("image_url")?.toString().trim() ?? "";
  const placeTypeRaw = formData.get("place_type")?.toString() ?? "meal";
  const walkMinutes = toIntOrNull(formData.get("walk_minutes"));
  const isTrendy = formData.get("is_trendy") === "on";

  if (!name) {
    redirect("/admin?error=" + encodeURIComponent("새 장소 이름을 입력해주세요."));
  }
  if (!(VALID_PLACE_TYPES as readonly string[]).includes(placeTypeRaw)) {
    redirect("/admin?error=" + encodeURIComponent("장소 타입이 올바르지 않아요."));
  }
  const placeType = placeTypeRaw as (typeof VALID_PLACE_TYPES)[number];

  const category = categoryRaw.length > 0 ? categoryRaw : null;
  const roadAddress = roadAddressRaw.length > 0 ? roadAddressRaw : null;
  const kakaoUrl = kakaoUrlRaw.length > 0 ? kakaoUrlRaw : null;
  const signatureMenu = signatureMenuRaw.length > 0 ? signatureMenuRaw : null;

  // 카카오 로컬 API로 수집한 90곳은 진짜 kakao_place_id를 갖고 있지만, 수동
  // 등록분은 "manual-" 접두사가 붙은 임의의 고유값을 대신 채워 넣는다.
  const kakaoPlaceId = `manual-${randomUUID()}`;

  // 아직 place_id가 없는(등록 전) 상태라 kakaoPlaceId를 업로드 경로로 대신 쓴다.
  const uploadedUrl = await uploadPlacePhoto(formData, kakaoPlaceId);
  const imageUrl = uploadedUrl ?? (imageUrlRaw.length > 0 ? imageUrlRaw : null);

  await sql`
    insert into places (
      kakao_place_id, name, category, road_address, place_type,
      walk_minutes, kakao_url, signature_menu, image_url, is_trendy
    ) values (
      ${kakaoPlaceId}, ${name}, ${category}, ${roadAddress}, ${placeType},
      ${walkMinutes}, ${kakaoUrl}, ${signatureMenu}, ${imageUrl}, ${isTrendy}
    )
  `;

  revalidatePath("/admin");
  revalidatePath("/");
}

/** 부적절하거나 테스트용인 리뷰를 삭제한다 (review_photos 등은 cascade로 함께 삭제). */
export async function deleteReview(formData: FormData) {
  if (!(await isAdmin())) {
    redirect("/admin");
  }

  const reviewId = formData.get("review_id")?.toString();
  if (!reviewId) return;

  await sql`delete from reviews where id = ${reviewId}`;

  revalidatePath("/admin");
  revalidatePath("/");
}

/**
 * 잘못 등록됐거나 이제 영업하지 않는 업체를 완전히 삭제한다. `places.reviews`는
 * `on delete cascade`가 걸려 있어서 이 장소에 달린 리뷰(사진/태그 포함)도
 * 함께 사라진다 — places-panel.tsx가 삭제 전에 리뷰 수를 보여주며 한 번 더
 * 확인을 받는 이유. `recommendation_logs.selected_place_id`는 `on delete set
 * null`이라 과거 추천 채택 기록 자체는 안전하게 남는다.
 */
export async function deletePlace(formData: FormData) {
  if (!(await isAdmin())) {
    redirect("/admin");
  }

  const placeId = formData.get("place_id")?.toString();
  if (!placeId) return;

  await sql`delete from places where id = ${placeId}`;

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/recommend");
}
