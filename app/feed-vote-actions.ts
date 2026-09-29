"use server";

// 카드 하단 원터치 반응([🔥 또 갈래요]/[🤔 굳이]) 전용 서버 액션. 로그인도,
// 소속팀도 묻지 않는 이 서비스에서 가장 가벼운 참여 방식이라, decide-button.tsx
// (조건 추천의 "오늘 여기로 결정!" 버튼)와 같은 방식으로 client component가
// 이 함수를 폼 없이 직접 호출한다.

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { sql } from "@/lib/db";
import { getOrCreateAnonVoterId } from "@/lib/anon-profile";

const VALID_PURPOSES = ["client", "remote_work", "lunch", "dinner", "cafe"] as const;
type Purpose = (typeof VALID_PURPOSES)[number];

function normalizePurpose(v: string): Purpose {
  return (VALID_PURPOSES as readonly string[]).includes(v) ? (v as Purpose) : "lunch";
}

// 2026-09-23(21차-3): 로그인이 없다 보니 "새로고침하고 또 누르기"를 반복하면
// 같은 사람이 같은 장소 숫자를 무한정 올릴 수 있었던 문제를 막기 위한
// 익명 브라우저 식별 쿠키. 누가 눌렀는지는 여전히 전혀 모름 — "이 브라우저가
// 이 장소에 이미 반응을 남겼는지"만 db/add_quick_vote_guard.sql의
// quick_vote_guard 테이블로 확인하는 용도로만 쓴다.
const DEVICE_COOKIE = "mm_device_id";

async function getOrSetDeviceId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(DEVICE_COOKIE)?.value;
  if (existing) return existing;
  const id = randomUUID();
  store.set(DEVICE_COOKIE, id, {
    maxAge: 60 * 60 * 24 * 365 * 5, // 5년 — 사실상 영구
    sameSite: "lax",
    path: "/",
  });
  return id;
}

/**
 * 카드에서 [🔥 또 갈래요]/[🤔 굳이] 버튼을 누르면 바로 호출된다. content는
 * 일부러 null — 텍스트가 전혀 없는 순수 반응이라는 뜻이고(스키마 12-2 참고),
 * 그래서 상세 페이지의 "사내 꿀팁 모음"에는 나타나지 않고 재방문율 집계에만
 * 반영된다.
 *
 * 2026-09-23(21차-3): reviews에 바로 insert하기 전에 quick_vote_guard에
 * (place_id, device_id)로 먼저 "선점"을 시도한다 — 이미 이 브라우저가 이
 * 장소에 반응을 남긴 적이 있으면 선점이 실패하고, 그러면 reviews에는 아무
 * 것도 추가하지 않은 채 alreadyVoted:true로 알려준다(숫자 조작 방지).
 * 순수 네트워크 실패는 여전히 조용히 무시 — 가벼운 반응 하나 유실되는 것보다
 * 로딩 상태로 사용자를 붙잡아두는 게 더 나쁜 트레이드오프라고 판단.
 */
export async function castQuickVote(
  placeId: string,
  purpose: string,
  verdict: "again" | "no"
): Promise<{ ok: boolean; alreadyVoted?: boolean; verdict?: "again" | "no" }> {
  if (!placeId) return { ok: false };
  if (verdict !== "again" && verdict !== "no") return { ok: false };
  const safePurpose = normalizePurpose(purpose);

  try {
    const deviceId = await getOrSetDeviceId();

    const guardRows = await sql`
      insert into quick_vote_guard (place_id, device_id, verdict)
      values (${placeId}, ${deviceId}, ${verdict})
      on conflict (place_id, device_id) do nothing
      returning place_id
    `;

    if (guardRows.length === 0) {
      // 이미 이 브라우저가 이 장소에 반응을 남긴 적이 있음 — reviews에는
      // 아무 것도 추가하지 않고, 예전에 어떤 반응을 남겼었는지만 알려준다.
      const existing = await sql`
        select verdict from quick_vote_guard
        where place_id = ${placeId} and device_id = ${deviceId}
      `;
      return {
        ok: false,
        alreadyVoted: true,
        verdict: (existing[0]?.verdict as "again" | "no" | undefined) ?? undefined,
      };
    }

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
