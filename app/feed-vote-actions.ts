"use server";

// 카드 하단 원터치 반응([🔥 또 갈래요]/[🤔 굳이]) 전용 서버 액션. 로그인도,
// 소속팀도 묻지 않는 이 서비스에서 가장 가벼운 참여 방식이라, decide-button.tsx
// (조건 추천의 "오늘 여기로 결정!" 버튼)와 같은 방식으로 client component가
// 이 함수를 폼 없이 직접 호출한다.

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getOrCreateAnonVoterId } from "@/lib/anon-profile";

const VALID_PURPOSES = ["client", "remote_work", "lunch", "dinner", "cafe"] as const;
type Purpose = (typeof VALID_PURPOSES)[number];

function normalizePurpose(v: string): Purpose {
  return (VALID_PURPOSES as readonly string[]).includes(v) ? (v as Purpose) : "lunch";
}

/**
 * 카드에서 [🔥 또 갈래요]/[🤔 굳이] 버튼을 누르면 바로 호출된다. content는
 * 일부러 null — 텍스트가 전혀 없는 순수 반응이라는 뜻이고(스키마 12-2 참고),
 * 그래서 상세 페이지의 "사내 꿀팁 모음"에는 나타나지 않고 재방문율 집계에만
 * 반영된다. 실패해도(네트워크 등) 화면은 이미 낙관적으로 갱신돼 있으므로
 * 조용히 무시 — 가벼운 반응 하나 유실되는 것보다, 매번 로딩 상태로 사용자를
 * 붙잡아두는 게 더 나쁜 트레이드오프라고 판단.
 */
export async function castQuickVote(
  placeId: string,
  purpose: string,
  verdict: "again" | "no"
): Promise<{ ok: boolean }> {
  if (!placeId) return { ok: false };
  if (verdict !== "again" && verdict !== "no") return { ok: false };
  const safePurpose = normalizePurpose(purpose);

  try {
    const authorId = await getOrCreateAnonVoterId();
    await sql`
      insert into reviews (place_id, author_id, purpose, verdict, content, display_mode)
      values (${placeId}, ${authorId}, ${safePurpose}, ${verdict}, null, 'nickname')
    `;
    revalidatePath("/");
    revalidatePath(`/places/${placeId}`);
    return { ok: true };
  } catch (err) {
    console.error("원터치 반응 저장 실패:", err);
    return { ok: false };
  }
}
