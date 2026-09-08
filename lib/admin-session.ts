import { cookies } from "next/headers";

/**
 * 관리자 페이지용 아주 가벼운 게이트입니다. 정식 로그인이 아니라 "비밀번호를
 * 아는 사람만 90개 장소 정보를 고칠 수 있다"는 정도의 문턱이고, 일반 직원이
 * 실수로 데이터를 건드리는 걸 막는 목적입니다. mm_profile_id 세션(lib/session.ts)과
 * 같은 철학을 따릅니다 — 실제 서비스로 확장한다면 정식 권한 체계로 바꿔야 합니다.
 */

const ADMIN_COOKIE = "mm_admin";
const ONE_DAY = 60 * 60 * 24;

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === "1";
}

export async function setAdminSession() {
  const store = await cookies();
  store.set(ADMIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_DAY,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}
