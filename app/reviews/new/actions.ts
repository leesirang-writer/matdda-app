"use server";

import { redirect } from "next/navigation";
import { put } from "@vercel/blob";
import { sql } from "@/lib/db";

// review-form.tsx의 DEPARTMENTS와 반드시 동일하게 유지 — 서버가 최종 검증하는
// 화이트리스트라 여기가 원본이다.
const DEPARTMENTS = [
  "홍보본부",
  "디지털본부",
  "경영지원/총무",
  "기획/제안",
  "인사이트/연구",
  "기타",
];

function toIntOrNull(v: FormDataEntryValue | null): number | null {
  if (v === null) return null;
  const n = parseInt(v.toString(), 10);
  return Number.isFinite(n) ? n : null;
}

function fail(message: string): never {
  redirect("/reviews/new?error=" + encodeURIComponent(message));
}

/** 체크된 시설 정보만 골라 places 테이블에 반영한다 (컬럼명은 화이트리스트로 고정). */
async function applyFacilityUpdates(placeId: string, formData: FormData) {
  const boolFlag = (name: string): boolean | undefined => {
    const v = formData.get(name);
    // "있음/없음/모름" 3단 확인: "모름"이거나 아예 답하지 않은 경우엔 undefined를
    // 돌려줘서 아래에서 업데이트 자체를 건너뛴다 — 다른 동료가 이미 확인해둔
    // 값을 "모름"으로 실수로 덮어쓰지 않기 위함.
    if (v === "true") return true;
    if (v === "false") return false;
    return undefined;
  };

  const hasRoom = boolFlag("has_room");
  const reservationRequired = boolFlag("reservation_required");
  const hasParking = boolFlag("has_parking");
  const hasOutlet = boolFlag("has_outlet");
  const isQuiet = boolFlag("is_quiet");
  const longStayOk = boolFlag("long_stay_ok");
  const maxPartySize = toIntOrNull(formData.get("max_party_size"));

  if (hasRoom !== undefined) {
    await sql`update places set has_room = ${hasRoom} where id = ${placeId}`;
  }
  if (reservationRequired !== undefined) {
    await sql`update places set reservation_required = ${reservationRequired} where id = ${placeId}`;
  }
  if (hasParking !== undefined) {
    await sql`update places set has_parking = ${hasParking} where id = ${placeId}`;
  }
  if (hasOutlet !== undefined) {
    await sql`update places set has_outlet = ${hasOutlet} where id = ${placeId}`;
  }
  if (isQuiet !== undefined) {
    await sql`update places set is_quiet = ${isQuiet} where id = ${placeId}`;
  }
  if (longStayOk !== undefined) {
    await sql`update places set long_stay_ok = ${longStayOk} where id = ${placeId}`;
  }
  if (maxPartySize !== null) {
    await sql`update places set max_party_size = ${maxPartySize} where id = ${placeId}`;
  }
}

/**
 * 2026-09-09(8차, 완전 익명 리뷰 전환): 이메일 로그인이 완전히 사라졌다.
 * 세션/프로필을 조회하지 않고, 폼에서 받은 소속 본부/팀(author_dept)과
 * 닉네임(author_name, 비웠으면 "익명의 동료")을 리뷰 행에 직접 저장한다.
 * author_email/author_id는 전혀 남기지 않는다 — QR이나 링크로 처음 들어온
 * 사람도 바로 제출할 수 있어야 한다는 게 이 변경의 핵심이다.
 */
export async function submitReview(formData: FormData) {
  const placeId = formData.get("place_id")?.toString() || "";
  const purpose = formData.get("purpose")?.toString() || "";
  const verdict = formData.get("verdict")?.toString() || "";
  const contentRaw = (formData.get("content")?.toString() || "").trim();
  // 한 줄 꿀팁은 이제 선택 입력이라, 비어있으면 DB에도 그냥 null로 남긴다
  // (컬럼의 char_length(content) between 1 and 500 체크는 null에는 적용되지
  // 않으므로 빈 문자열("") 대신 반드시 null을 넘겨야 한다).
  const content = contentRaw.length > 0 ? contentRaw : null;
  const pricePerPerson = toIntOrNull(formData.get("price_per_person"));
  const waitMinutes = toIntOrNull(formData.get("wait_minutes"));
  const partySize = toIntOrNull(formData.get("party_size"));
  const visitDateRaw = formData.get("visit_date")?.toString();
  const visitDate = visitDateRaw && visitDateRaw.length > 0 ? visitDateRaw : null;

  const authorDept = formData.get("author_dept")?.toString().trim() || "";
  const authorNameRaw = (formData.get("author_name")?.toString() || "").trim();
  const authorName = authorNameRaw.length > 0 ? authorNameRaw : "익명의 동료";

  if (!placeId) fail("장소를 선택해주세요.");
  if (!["client", "remote_work", "lunch", "dinner", "cafe"].includes(purpose)) {
    fail("방문 목적을 선택해주세요.");
  }
  if (!["again", "ok", "no"].includes(verdict)) fail("평가를 선택해주세요.");
  if (content && content.length > 500) fail("코멘트는 500자 이내로 적어주세요.");
  if (!DEPARTMENTS.includes(authorDept)) fail("소속 본부/팀을 선택해주세요.");

  const inserted = await sql`
    insert into reviews (
      place_id, purpose, verdict, content,
      price_per_person, wait_minutes, party_size, visit_date,
      author_dept, author_name
    )
    values (
      ${placeId}, ${purpose}, ${verdict}, ${content},
      ${pricePerPerson}, ${waitMinutes}, ${partySize}, ${visitDate},
      ${authorDept}, ${authorName}
    )
    returning id
  `;
  const reviewId = inserted[0].id as string;

  // 장소 시설 정보 보완 (선택 입력된 것만) — 리뷰 저장이 이미 끝난 뒤라
  // 여기서 문제가 생겨도 리뷰 자체는 안전하게 남는다.
  try {
    await applyFacilityUpdates(placeId, formData);
  } catch (err) {
    console.error("장소 시설 정보 업데이트 실패 (리뷰는 정상 저장됨):", err);
  }

  // 사진 업로드 (선택) — 실패해도 리뷰 저장 자체는 막지 않는다.
  const photos = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  let sortOrder = 0;
  for (const file of photos) {
    try {
      const blob = await put(
        `reviews/${reviewId}/${crypto.randomUUID()}-${file.name}`,
        file,
        { access: "public" }
      );
      await sql`
        insert into review_photos (review_id, storage_path, sort_order)
        values (${reviewId}, ${blob.url}, ${sortOrder})
      `;
      sortOrder += 1;
    } catch (err) {
      console.error("사진 업로드 실패 (리뷰는 정상 저장됨):", err);
    }
  }

  redirect("/reviews/thanks");
}
