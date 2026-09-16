"use server";

// "15초 꿀팁 제보" 모달(quick-tip-modal.tsx) 전용 서버 액션. 원터치 반응
// (feed-vote-actions.ts)과 달리 소속팀을 물어보므로, 그 부서 이름이 붙은
// content(한 줄 팁, 선택 사항)가 상세 페이지 "사내 꿀팁 모음"에 실제로 노출된다.

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getOrCreateDeptProfile } from "@/lib/anon-profile";
import { QUICK_TIP_DEPARTMENTS } from "./feed-display";

const VALID_PURPOSES = ["client", "remote_work", "lunch", "dinner", "cafe"] as const;
type Purpose = (typeof VALID_PURPOSES)[number];

// "use server" 파일은 async 함수만 export할 수 있어서 소속 목록 원본은
// feed-display.ts(client-safe)에 두고 여기서 가져다 검증만 한다 —
// quick-tip-modal.tsx도 같은 원본을 가져다 쓴다.

export async function submitQuickTip(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const placeId = formData.get("place_id")?.toString() || "";
  const purposeRaw = formData.get("purpose")?.toString() || "";
  const verdict = formData.get("verdict")?.toString() || "";
  const department = formData.get("department")?.toString() || "";
  const tipRaw = (formData.get("tip")?.toString() || "").trim();

  if (!placeId) return { ok: false, error: "장소 정보가 없어요." };
  if (verdict !== "again" && verdict !== "no") {
    return { ok: false, error: "또 갈래요 / 굳이 중 하나를 골라주세요." };
  }
  if (!(QUICK_TIP_DEPARTMENTS as readonly string[]).includes(department)) {
    return { ok: false, error: "소속을 선택해주세요." };
  }

  const purpose: Purpose = (VALID_PURPOSES as readonly string[]).includes(purposeRaw)
    ? (purposeRaw as Purpose)
    : "lunch";
  // 한 줄 팁은 선택 사항 — 비어 있으면 null로 저장(스키마 12-2에서 이미
  // content를 nullable 취급하도록 제약을 완화해뒀음).
  const tip = tipRaw.length > 0 ? tipRaw.slice(0, 500) : null;

  try {
    const authorId = await getOrCreateDeptProfile(department);
    await sql`
      insert into reviews (place_id, author_id, purpose, verdict, content, display_mode)
      values (${placeId}, ${authorId}, ${purpose}, ${verdict}, ${tip}, 'name')
    `;
    revalidatePath("/");
    revalidatePath(`/places/${placeId}`);
    return { ok: true };
  } catch (err) {
    console.error("꿀팁 제보 저장 실패:", err);
    return { ok: false, error: "저장하지 못했어요. 다시 시도해주세요." };
  }
}
