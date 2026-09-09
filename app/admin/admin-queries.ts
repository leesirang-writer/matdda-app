import { sql } from "@/lib/db";

export type AdminPlace = {
  id: string;
  name: string;
  category: string | null;
  road_address: string | null;
  walk_minutes: number | null;
  place_type: "meal" | "cafe" | "both";
  signature_menu: string | null;
  image_url: string | null;
  /** 20대 트렌드 핫플 여부 (을지로3가 힙지로 확장 필터/배지에 쓰임). */
  is_trendy: boolean;
  /** 이 장소에 달린 리뷰 수 — 삭제 전에 "리뷰 N건도 함께 삭제돼요" 경고에 씀. */
  review_count: number;
};

export type AdminReview = {
  id: string;
  place_name: string;
  author_name: string;
  author_department: string | null;
  purpose: string;
  verdict: string;
  // 한 줄 꿀팁은 이제 선택 입력이라(8차) 비어있을 수 있다.
  content: string | null;
  created_at: string;
};

function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function getAdminPlaces(): Promise<AdminPlace[]> {
  const rows = await sql`
    select
      pl.id, pl.name, pl.category, pl.road_address, pl.walk_minutes, pl.place_type,
      pl.signature_menu, pl.image_url, pl.is_trendy,
      coalesce(rc.review_count, 0) as review_count
    from places pl
    left join lateral (
      select count(*)::int as review_count
      from reviews r
      where r.place_id = pl.id and r.status = 'published'
    ) rc on true
    order by pl.name
  `;
  return (rows as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    category: (row.category as string) ?? null,
    road_address: (row.road_address as string) ?? null,
    walk_minutes: toNumOrNull(row.walk_minutes),
    place_type: row.place_type as AdminPlace["place_type"],
    signature_menu: (row.signature_menu as string) ?? null,
    image_url: (row.image_url as string) ?? null,
    is_trendy: (row.is_trendy as boolean) ?? false,
    review_count: (row.review_count as number) ?? 0,
  }));
}

// 2026-09-09(8차, 완전 익명 리뷰 전환): 이메일 로그인이 없어져서 새 리뷰는
// author_id(profiles)가 아예 없다 — 관리자 화면도 이제 "실명"이 아니라
// author_dept/author_name(닉네임 또는 익명의 동료)을 보여준다. 익명 시스템의
// 목적 자체가 "누가 썼는지 특정 못 하게"이므로, 부적절한 리뷰 판단은
// 부서+내용 기준으로 한다. 옛 이메일 로그인 시절 리뷰(author_id만 있는 행)만
// profiles를 left join해서 그때 실명을 계속 보여준다.
export async function getAdminReviews(): Promise<AdminReview[]> {
  const rows = await sql`
    select
      r.id,
      pl.name as place_name,
      coalesce(nullif(r.author_name, ''), pr.name) as author_name,
      coalesce(nullif(r.author_dept, ''), pr.department) as author_department,
      r.purpose, r.verdict, r.content,
      r.created_at
    from reviews r
    join places pl on pl.id = r.place_id
    left join profiles pr on pr.id = r.author_id
    where r.status = 'published'
    order by r.created_at desc
  `;
  return (rows as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    place_name: row.place_name as string,
    author_name: (row.author_name as string) ?? "익명의 동료",
    author_department: (row.author_department as string) ?? null,
    purpose: row.purpose as string,
    verdict: row.verdict as string,
    content: (row.content as string) ?? null,
    created_at:
      (row.created_at as Date | string) instanceof Date
        ? (row.created_at as Date).toISOString()
        : (row.created_at as string),
  }));
}
