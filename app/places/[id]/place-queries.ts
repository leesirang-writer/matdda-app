import { sql } from "@/lib/db";

export type PlaceDetail = {
  id: string;
  name: string;
  category: string | null;
  road_address: string | null;
  phone: string | null;
  kakao_url: string | null;
  walk_minutes: number | null;
  place_type: "meal" | "cafe" | "both";
  has_room: boolean | null;
  max_party_size: number | null;
  reservation_required: boolean | null;
  has_parking: boolean | null;
  has_outlet: boolean | null;
  is_quiet: boolean | null;
  long_stay_ok: boolean | null;
  review_count: number;
  again_rate: number | null;
  avg_price_per_person: number | null;
};

export type PlaceReview = {
  id: string;
  author_display_name: string;
  author_department: string | null;
  purpose: string;
  verdict: string;
  // 한 줄 꿀팁은 이제 선택 입력이라(8차) 비어있을 수 있다.
  content: string | null;
  price_per_person: number | null;
  wait_minutes: number | null;
  party_size: number | null;
  created_at: string;
};

// Postgres 드라이버가 numeric/count를 문자열로 돌려주는 경우가 있어서 화면에서
// 쓰기 전에 안전하게 숫자로 바꿔준다 (feed-queries.ts와 동일한 이유).
function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function getPlaceDetail(id: string): Promise<PlaceDetail | null> {
  const rows = await sql`
    select
      pl.id, pl.name, pl.category, pl.road_address, pl.phone, pl.kakao_url,
      pl.walk_minutes, pl.place_type, pl.has_room, pl.max_party_size,
      pl.reservation_required, pl.has_parking, pl.has_outlet, pl.is_quiet, pl.long_stay_ok,
      coalesce(ps.review_count, 0) as review_count,
      ps.again_rate,
      ps.avg_price_per_person
    from places pl
    left join place_stats ps on ps.place_id = pl.id
    where pl.id = ${id}
    limit 1
  `;
  if (rows.length === 0) return null;

  const row = rows[0] as Record<string, unknown>;
  return {
    id: row.id as string,
    name: row.name as string,
    category: (row.category as string) ?? null,
    road_address: (row.road_address as string) ?? null,
    phone: (row.phone as string) ?? null,
    kakao_url: (row.kakao_url as string) ?? null,
    walk_minutes: toNumOrNull(row.walk_minutes),
    place_type: row.place_type as PlaceDetail["place_type"],
    has_room: (row.has_room as boolean) ?? null,
    max_party_size: toNumOrNull(row.max_party_size),
    reservation_required: (row.reservation_required as boolean) ?? null,
    has_parking: (row.has_parking as boolean) ?? null,
    has_outlet: (row.has_outlet as boolean) ?? null,
    is_quiet: (row.is_quiet as boolean) ?? null,
    long_stay_ok: (row.long_stay_ok as boolean) ?? null,
    review_count: toNumOrNull(row.review_count) ?? 0,
    again_rate: toNumOrNull(row.again_rate),
    avg_price_per_person: toNumOrNull(row.avg_price_per_person),
  };
}

// 작성자 표시명: 2026-09-09(8차, 완전 익명 리뷰 전환) 이후 새 리뷰는
// r.author_dept/r.author_name에 곧바로 저장된다("부서 · 닉네임 또는 익명의
// 동료" 형태). author_id가 없는(=이메일 로그인 없이 작성된) 행이 기본이고,
// 옛 이메일 로그인 시절 리뷰(author_id만 있고 author_dept/author_name은
// 비어있음)만 profiles를 left join해서 예전 방식(실명/별명 표시 선택)으로
// 채워준다.
export async function getPlaceReviews(id: string): Promise<PlaceReview[]> {
  const rows = await sql`
    select
      r.id,
      coalesce(
        nullif(r.author_name, ''),
        case
          when r.display_mode = 'nickname' and pr.nickname is not null and pr.nickname <> ''
          then pr.nickname
          else pr.name
        end
      ) as author_display_name,
      coalesce(nullif(r.author_dept, ''), pr.department) as author_department,
      r.purpose, r.verdict, r.content,
      r.price_per_person, r.wait_minutes, r.party_size,
      r.created_at
    from reviews r
    left join profiles pr on pr.id = r.author_id
    where r.place_id = ${id} and r.status = 'published'
    order by r.created_at desc
  `;
  return (rows as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    author_display_name: row.author_display_name as string,
    author_department: (row.author_department as string) ?? null,
    purpose: row.purpose as string,
    verdict: row.verdict as string,
    content: (row.content as string) ?? null,
    price_per_person: toNumOrNull(row.price_per_person),
    wait_minutes: toNumOrNull(row.wait_minutes),
    party_size: toNumOrNull(row.party_size),
    created_at: (row.created_at as Date | string) instanceof Date
      ? (row.created_at as Date).toISOString()
      : (row.created_at as string),
  }));
}
