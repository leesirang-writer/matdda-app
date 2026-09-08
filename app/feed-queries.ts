import { sql } from "@/lib/db";
import {
  type FeedPlace,
  simplifyCategory,
  fallbackImage,
  thumbnailFor,
  trendyBadgeLabel,
} from "./feed-display";

// 표시용 타입/헬퍼(FeedPlace, simplifyCategory, thumbnailFor 등)는 DB에 전혀
// 의존하지 않는 feed-display.ts에 있고, 여기서는 기존 코드가 계속
// "./feed-queries"에서 import할 수 있도록 그대로 재수출만 한다. 클라이언트
// 컴포넌트(feed-browser.tsx)는 반드시 feed-display.ts에서 직접 import할 것 —
// 이 파일을 client component에서 import하면 아래 neon() 호출이 브라우저
// 번들에 딸려 들어가 즉시 에러가 난다.
export type { FeedPlace };
export { simplifyCategory, fallbackImage, thumbnailFor, trendyBadgeLabel };

// 2대 축: 맛따라(밥집) / 멋따라(카페·공간). 축에 따라 보여주는 장소(place_type)와
// 상황 필터 종류 자체가 다르다. "전체" 탭은 없앴고, 축을 누르면 바로 그 축의
// 첫 번째 상황 필터가 기본 선택된다 (FOOD_DEFAULT_FILTER / STYLE_DEFAULT_FILTER).
//
// "trendy"는 두 축에 공통으로 쓰는 20대 트렌드 필터 — places.is_trendy 하나로
// 관리하고, food/trendy는 밥집(meal/both)만, style/trendy는 카페(cafe/both)만
// 걸러서 보여준다 (을지로3가 힙지로 반경 확장에 맞춘 신규 필터).
export type FeedAxis = "food" | "style";
export type FoodFilter = "lunch" | "trendy" | "client" | "dinner";
export type StyleFilter = "remote" | "trendy" | "quiet";

export const FOOD_DEFAULT_FILTER: FoodFilter = "lunch";
export const STYLE_DEFAULT_FILTER: StyleFilter = "remote";

// Postgres의 numeric/count 결과는 드라이버에 따라 문자열로 올 수 있어서
// (정밀도 손실을 피하려는 의도) 화면에서 쓰기 전에 안전하게 숫자로 바꿔준다.
function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizePlaceRow(row: Record<string, unknown>): FeedPlace {
  return {
    id: row.id as string,
    name: row.name as string,
    category: (row.category as string) ?? null,
    road_address: (row.road_address as string) ?? null,
    phone: (row.phone as string) ?? null,
    walk_minutes: toNumOrNull(row.walk_minutes),
    kakao_url: (row.kakao_url as string) ?? null,
    place_type: row.place_type as FeedPlace["place_type"],
    has_room: (row.has_room as boolean) ?? null,
    max_party_size: toNumOrNull(row.max_party_size),
    has_outlet: (row.has_outlet as boolean) ?? null,
    is_quiet: (row.is_quiet as boolean) ?? null,
    long_stay_ok: (row.long_stay_ok as boolean) ?? null,
    review_count: toNumOrNull(row.review_count) ?? 0,
    again_rate: toNumOrNull(row.again_rate),
    avg_price_per_person: toNumOrNull(row.avg_price_per_person),
    thumbnail_url: (row.thumbnail_url as string) ?? null,
    signature_menu: (row.signature_menu as string) ?? null,
    image_url: (row.image_url as string) ?? null,
    is_trendy: (row.is_trendy as boolean) ?? false,
  };
}

// 아래 각 쿼리는 "그 장소의 대표 리뷰 사진 1장"을 고르는 photo lateral join을
// 반복해서 쓰고 있다 (가장 최근에 발행된 리뷰의 첫 번째 사진 우선). select
// 목록에도 signature_menu/image_url/is_trendy를 매번 포함시킨다.

export async function getFeedPlaces(axis: FeedAxis, filter: string): Promise<FeedPlace[]> {
  if (axis === "food") {
    if (filter === "dinner") {
      const rows = await sql`
        select
          pl.id, pl.name, pl.category, pl.road_address, pl.phone, pl.walk_minutes, pl.kakao_url,
          pl.place_type, pl.has_room, pl.max_party_size, pl.has_outlet, pl.is_quiet, pl.long_stay_ok,
          pl.signature_menu, pl.image_url, pl.is_trendy,
          coalesce(agg.review_count, 0) as review_count,
          agg.again_rate,
          agg.avg_price_per_person,
          photo.storage_path as thumbnail_url
        from places pl
        left join lateral (
          select
            count(r.id) as review_count,
            round(count(*) filter (where r.verdict = 'again')::numeric / nullif(count(r.id), 0) * 100, 1) as again_rate,
            round(avg(r.price_per_person)::numeric, 0) as avg_price_per_person
          from reviews r
          where r.place_id = pl.id and r.status = 'published' and r.purpose = 'dinner'
        ) agg on true
        left join lateral (
          select rp.storage_path
          from review_photos rp
          join reviews r2 on r2.id = rp.review_id
          where r2.place_id = pl.id and r2.status = 'published'
          order by r2.created_at desc, rp.sort_order asc
          limit 1
        ) photo on true
        where pl.place_type in ('meal', 'both')
        order by coalesce(agg.review_count, 0) desc, pl.name asc
      `;
      return (rows as Record<string, unknown>[]).map(normalizePlaceRow);
    }

    if (filter === "client") {
      // 룸/접대 — 구조적 추측 없이, 실제 접대 목적 리뷰가 있는 곳만 보여준다.
      const rows = await sql`
        select
          pl.id, pl.name, pl.category, pl.road_address, pl.phone, pl.walk_minutes, pl.kakao_url,
          pl.place_type, pl.has_room, pl.max_party_size, pl.has_outlet, pl.is_quiet, pl.long_stay_ok,
          pl.signature_menu, pl.image_url, pl.is_trendy,
          agg.review_count,
          agg.again_rate,
          agg.avg_price_per_person,
          photo.storage_path as thumbnail_url
        from places pl
        join lateral (
          select
            count(r.id) as review_count,
            round(count(*) filter (where r.verdict = 'again')::numeric / nullif(count(r.id), 0) * 100, 1) as again_rate,
            round(avg(r.price_per_person)::numeric, 0) as avg_price_per_person
          from reviews r
          where r.place_id = pl.id and r.status = 'published' and r.purpose = 'client'
          having count(r.id) > 0
        ) agg on true
        left join lateral (
          select rp.storage_path
          from review_photos rp
          join reviews r2 on r2.id = rp.review_id
          where r2.place_id = pl.id and r2.status = 'published'
          order by r2.created_at desc, rp.sort_order asc
          limit 1
        ) photo on true
        where pl.place_type in ('meal', 'both')
        order by agg.review_count desc, pl.name asc
      `;
      return (rows as Record<string, unknown>[]).map(normalizePlaceRow);
    }

    if (filter === "trendy") {
      // 힙지로·트렌드 — 관리자가 /admin에서 직접 켠 20대 인기 밥집만.
      const rows = await sql`
        select
          pl.id, pl.name, pl.category, pl.road_address, pl.phone, pl.walk_minutes, pl.kakao_url,
          pl.place_type, pl.has_room, pl.max_party_size, pl.has_outlet, pl.is_quiet, pl.long_stay_ok,
          pl.signature_menu, pl.image_url, pl.is_trendy,
          coalesce(agg.review_count, 0) as review_count,
          agg.again_rate,
          agg.avg_price_per_person,
          photo.storage_path as thumbnail_url
        from places pl
        left join lateral (
          select
            count(r.id) as review_count,
            round(count(*) filter (where r.verdict = 'again')::numeric / nullif(count(r.id), 0) * 100, 1) as again_rate,
            round(avg(r.price_per_person)::numeric, 0) as avg_price_per_person
          from reviews r
          where r.place_id = pl.id and r.status = 'published'
        ) agg on true
        left join lateral (
          select rp.storage_path
          from review_photos rp
          join reviews r2 on r2.id = rp.review_id
          where r2.place_id = pl.id and r2.status = 'published'
          order by r2.created_at desc, rp.sort_order asc
          limit 1
        ) photo on true
        where pl.place_type in ('meal', 'both') and pl.is_trendy = true
        order by pl.name asc
      `;
      return (rows as Record<string, unknown>[]).map(normalizePlaceRow);
    }

    // food / lunch (기본값)
    const rows = await sql`
      select
        pl.id, pl.name, pl.category, pl.road_address, pl.phone, pl.walk_minutes, pl.kakao_url,
        pl.place_type, pl.has_room, pl.max_party_size, pl.has_outlet, pl.is_quiet, pl.long_stay_ok,
        pl.signature_menu, pl.image_url, pl.is_trendy,
        coalesce(agg.review_count, 0) as review_count,
        agg.again_rate,
        agg.avg_price_per_person,
        photo.storage_path as thumbnail_url
      from places pl
      left join lateral (
        select
          count(r.id) as review_count,
          round(count(*) filter (where r.verdict = 'again')::numeric / nullif(count(r.id), 0) * 100, 1) as again_rate,
          round(avg(r.price_per_person)::numeric, 0) as avg_price_per_person
        from reviews r
        where r.place_id = pl.id and r.status = 'published' and r.purpose = 'lunch'
      ) agg on true
      left join lateral (
        select rp.storage_path
        from review_photos rp
        join reviews r2 on r2.id = rp.review_id
        where r2.place_id = pl.id and r2.status = 'published'
        order by r2.created_at desc, rp.sort_order asc
        limit 1
      ) photo on true
      where pl.place_type in ('meal', 'both')
      order by coalesce(agg.review_count, 0) desc, pl.name asc
    `;
    return (rows as Record<string, unknown>[]).map(normalizePlaceRow);
  }

  // 멋따라 (카페·공간): place_type이 cafe 또는 both인 곳만.
  if (filter === "trendy") {
    // 힙플레이스·디저트 — 관리자가 /admin에서 직접 켠 20대 인기 카페만.
    const rows = await sql`
      select
        pl.id, pl.name, pl.category, pl.road_address, pl.phone, pl.walk_minutes, pl.kakao_url,
        pl.place_type, pl.has_room, pl.max_party_size, pl.has_outlet, pl.is_quiet, pl.long_stay_ok,
        pl.signature_menu, pl.image_url, pl.is_trendy,
        coalesce(agg.review_count, 0) as review_count,
        agg.again_rate,
        agg.avg_price_per_person,
        photo.storage_path as thumbnail_url
      from places pl
      left join lateral (
        select
          count(r.id) as review_count,
          round(count(*) filter (where r.verdict = 'again')::numeric / nullif(count(r.id), 0) * 100, 1) as again_rate,
          round(avg(r.price_per_person)::numeric, 0) as avg_price_per_person
        from reviews r
        where r.place_id = pl.id and r.status = 'published'
      ) agg on true
      left join lateral (
        select rp.storage_path
        from review_photos rp
        join reviews r2 on r2.id = rp.review_id
        where r2.place_id = pl.id and r2.status = 'published'
        order by r2.created_at desc, rp.sort_order asc
        limit 1
      ) photo on true
      where pl.place_type in ('cafe', 'both') and pl.is_trendy = true
      order by pl.name asc
    `;
    return (rows as Record<string, unknown>[]).map(normalizePlaceRow);
  }

  if (filter === "quiet") {
    // 조용한 미팅 — 특정 방문 목적이 아니라 장소 자체의 "조용함" 속성으로 거른다.
    const rows = await sql`
      select
        pl.id, pl.name, pl.category, pl.road_address, pl.phone, pl.walk_minutes, pl.kakao_url,
        pl.place_type, pl.has_room, pl.max_party_size, pl.has_outlet, pl.is_quiet, pl.long_stay_ok,
        pl.signature_menu, pl.image_url, pl.is_trendy,
        coalesce(ps.review_count, 0) as review_count,
        ps.again_rate,
        ps.avg_price_per_person,
        photo.storage_path as thumbnail_url
      from places pl
      left join place_stats ps on ps.place_id = pl.id
      left join lateral (
        select rp.storage_path
        from review_photos rp
        join reviews r2 on r2.id = rp.review_id
        where r2.place_id = pl.id and r2.status = 'published'
        order by r2.created_at desc, rp.sort_order asc
        limit 1
      ) photo on true
      where pl.place_type in ('cafe', 'both') and pl.is_quiet = true
      order by coalesce(ps.review_count, 0) desc, pl.name asc
    `;
    return (rows as Record<string, unknown>[]).map(normalizePlaceRow);
  }

  // style / remote (기본값)
  const rows = await sql`
    select
      pl.id, pl.name, pl.category, pl.road_address, pl.phone, pl.walk_minutes, pl.kakao_url,
      pl.place_type, pl.has_room, pl.max_party_size, pl.has_outlet, pl.is_quiet, pl.long_stay_ok,
      pl.signature_menu, pl.image_url, pl.is_trendy,
      coalesce(agg.review_count, 0) as review_count,
      agg.again_rate,
      agg.avg_price_per_person,
      photo.storage_path as thumbnail_url
    from places pl
    left join lateral (
      select
        count(r.id) as review_count,
        round(count(*) filter (where r.verdict = 'again')::numeric / nullif(count(r.id), 0) * 100, 1) as again_rate,
        round(avg(r.price_per_person)::numeric, 0) as avg_price_per_person
      from reviews r
      where r.place_id = pl.id and r.status = 'published' and r.purpose = 'remote_work'
    ) agg on true
    left join lateral (
      select rp.storage_path
      from review_photos rp
      join reviews r2 on r2.id = rp.review_id
      where r2.place_id = pl.id and r2.status = 'published'
      order by r2.created_at desc, rp.sort_order asc
      limit 1
    ) photo on true
    where pl.place_type in ('cafe', 'both')
    order by coalesce(agg.review_count, 0) desc, pl.name asc
  `;
  return (rows as Record<string, unknown>[]).map(normalizePlaceRow);
}

export async function getFeedSummary(): Promise<{ place_count: number; review_count: number }> {
  const rows = await sql`
    select
      (select count(*) from places) as place_count,
      (select count(*) from reviews where status = 'published') as review_count
  `;
  const row = rows[0] as Record<string, unknown>;
  return {
    place_count: toNumOrNull(row.place_count) ?? 0,
    review_count: toNumOrNull(row.review_count) ?? 0,
  };
}
