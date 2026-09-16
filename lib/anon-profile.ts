import { sql } from "./db";

// 2026-09-16(17차, "1초 반응 + 15초 꿀팁" 라이트 리뷰 전환): reviews.author_id는
// profiles(id)를 필수로 참조하므로(스키마 변경 없이 그대로 유지), 로그인 없는
// 원터치 반응/꿀팁 제보도 실제로는 "누군가의 프로필"이 있어야 한다. 대신
// 실명 로그인을 거치지 않고 아래 두 종류의 "공유 익명 프로필"을 앱이 자동으로
// 만들어(최초 호출 시 upsert) 재사용한다 — 새 프로필을 매번 만들지 않으므로
// profiles 테이블이 불필요하게 늘어나지 않는다.

/**
 * 카드에서 바로 누르는 원터치 반응([🔥 또 갈래요]/[🤔 굳이])이 쓰는 단일 공유
 * 익명 프로필. 소속팀조차 묻지 않는, 이 서비스에서 가장 가벼운 참여 방식이라
 * 프로필도 하나만 공유한다 — "누가 눌렀는지"가 아니라 "몇 번 눌렸는지"만
 * 정직하게 세는 용도.
 */
export async function getOrCreateAnonVoterId(): Promise<string> {
  const email = "anon-quickvote@internal.matdda.local";
  const rows = await sql`
    insert into profiles (email, name, nickname, department)
    values (${email}, '익명 동료', '동료', null)
    on conflict (email) do update set updated_at = now()
    returning id
  `;
  return rows[0].id as string;
}

/**
 * "15초 꿀팁 제보" 모달이 쓰는, 부서별로 공유되는 익명 프로필. 실명 대신
 * 소속팀만 물어보기 때문에, 같은 부서를 고른 동료들은 모두 이 프로필 하나를
 * 공유한다 — 개인 식별 없이 "그 팀에서 나온 팁"이라는 신뢰도만 표시하기
 * 위함.
 */
export async function getOrCreateDeptProfile(department: string): Promise<string> {
  const email = `anon-dept-${slugify(department)}@internal.matdda.local`;
  const rows = await sql`
    insert into profiles (email, name, nickname, department)
    values (${email}, '동료', '동료', ${department})
    on conflict (email) do update set department = excluded.department, updated_at = now()
    returning id
  `;
  return rows[0].id as string;
}

function slugify(s: string): string {
  const slug = s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "");
  return slug.length > 0 ? slug : "dept";
}
