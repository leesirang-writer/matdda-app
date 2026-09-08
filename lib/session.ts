import { cookies } from "next/headers";

/**
 * 아주 가벼운 세션입니다. 비밀번호도, 이메일 인증 메일도 없습니다.
 * "사내 이메일(@kpr.co.kr)을 아는 사람만 들어올 수 있다"는 정도의 신뢰 모델이고,
 * 심사위원이 데모할 때 바로 로그인해서 리뷰를 써볼 수 있어야 한다는 우선순위를
 * 반영한 선택입니다. 실제 서비스로 확장한다면 이 부분을 정식 인증으로 바꿔야 합니다.
 */

const SESSION_COOKIE = "mm_profile_id";
const NINETY_DAYS = 60 * 60 * 24 * 90;

export async function getSessionProfileId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionProfileId(profileId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, profileId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: NINETY_DAYS,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
