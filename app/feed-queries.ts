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
//
// 2026-09-15(14차): 임직원 실제 이용 패턴에 맞춰 필터 테마를 "매일 겪는 실속
// 점심"과 "카페·작업 공간" 중심으로 전면 개편. 무거운 "룸/접대"(client)는
// 완전히 빼지는 않되 맨 뒤로 내렸고(회식/접대가 가끔은 필요하니까), 대신
// 새로 추가한 "light"(가벼운 점심)가 맛따라의 2번 자리로 들어왔다. 멋따라는
// 기본값이 remote(자유 외근)에서 trendy(힙플레이스·디저트)로 바뀌었다.
export type FeedAxis = "food" | "style";
export type FoodFilter = "lunch" | "light" | "trendy" | "dinner" | "client";
export type StyleFilter = "trendy" | "remote" | "quiet";

export const FOOD_DEFAULT_FILTER: FoodFilter = "lunch";
export const STYLE_DEFAULT_FILTER: StyleFilter = "trendy";

// "가벼운 점심" 매칭에 쓰는 키워드 — category(카카오 카테고리 문자열,
// 예: "음식점 > 한식 > 국밥")와 signature_menu(관리자가 입력한 대표 메뉴)를
// 합친 텍스트에서 정규식으로 찾는다. "국수"는 라이트 취급이지만 "칼국수"는
// (곰탕/설렁탕류처럼 국물이 진하고 든든한 메뉴라) 든든한 점심 쪽으로 남겨두기
// 위해 별도로 제외한다.
const LIGHT_LUNCH_PATTERN =
  "샐러드|포케|샌드위치|브런치|스무디|국수|베이글|토스트|빵|베이커리";

// "든든한 점심" 쪽에서 상단에 먼저 보여줄 스테디셀러 키워드 — lunch 필터는
// light 패턴에 안 걸리는 모든 밥집을 보여주는 게 기본이지만(그래야 아직
// 카테고리가 애매한 곳도 "사라지지" 않는다), 이 키워드에 걸리는 곳을 먼저
// 정렬해서 보여준다.
// "정식"은 뺐다 — 검증 중 "홍콩가정식"(중식) 같은 곳이 "가정식"의 "정식" 부분에
// 걸려 엉뚱하게 hearty로 분류되는 걸 확인해서, 더 구체적인 "한정식"만 남겼다.
const HEARTY_LUNCH_PATTERN =
  "국밥|설렁탕|곰탕|수육|해장국|추어탕|삼계탕|백숙|찌개|백반|한정식|칼국수|쭈꾸미|갈비|불고기|곱창|덮밥|비빔밥|돈까스|냉면";

// "저녁/회식" 쪽에서 상단에 먼저 보여줄 키워드 — 아직 회식(dinner) 목적
// 리뷰가 0건이라 review_count로는 정렬이 안 먹혀서 사실상 전체 밥집이
// 이름순으로만 나오고 있었음(2026-09-15, 14차 배포 후 사용자 발견). "든든한
// 점심"과 똑같은 방식으로, 장소를 목록에서 빼지는 않되(정직한 데이터 원칙
// 유지 — 리뷰 쌓이기 전까지 이걸로 대체 정렬) 이자카야/호프/포차/고깃집처럼
// 저녁·회식 자리로 흔히 쓰이는 카테고리를 먼저 정렬해서 보여준다. 실제
// 회식 리뷰가 쌓이기 시작하면 review_count가 자연스럽게 우선순위를 가져감.
const DINNER_PATTERN =
  "이자카야|호프|포차|요리주점|칵테일바|하이볼|노가리|술집|고기|구이|삼겹살|갈비|곱창|양꼬치|전골|찜";

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
      // 저녁/회식 — 실제 회식 리뷰가 쌓이면 review_count가 1순위로 올라오고,
      // 그 전까지는 이자카야/호프/고깃집 등 회식 자리로 흔한 카테고리를 먼저
      // 보여준다(dinner_rank). 장소 자체를 목록에서 빼진 않음(위 주석 참고).
      const rows = await sql`
        select
          pl.id, pl.name, pl.category, pl.road_address, pl.phone, pl.walk_minutes, pl.kakao_url,
          pl.place_type, pl.has_room, pl.max_party_size, pl.has_outlet, pl.is_quiet, pl.long_stay_ok,
          pl.signature_menu, pl.image_url, pl.is_trendy,
          coalesce(agg.review_count, 0) as review_count,
          agg.again_rate,
          agg.avg_price_per_person,
          photo.storage_path as thumbnail_url,
          case
            when (coalesce(pl.category, '') || ' ' || coalesce(pl.signature_menu, '')) ~* ${DINNER_PATTERN}
            then 0 else 1
          end as dinner_rank
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
        order by coalesce(agg.review_count, 0) desc, dinner_rank asc, pl.name asc
      `;
      return (rows as Record<string, unknown>[]).map(normalizePlaceRow);
    }

    if (filter === "client") {
      // 룸/접대 — 구조적 추측 없이, 실제 접대 목적 리뷰가 있는 곳만 보여준다.
      // 2026-09-15(14차)부터 사이드바 맨 아래로 내려감(page.tsx의 FOOD_FILTERS
      // 순서 참고) — 매일 겪는 실속 점심/카페 테마를 앞으로 내세우기 위함.
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

    if (filter === "light") {
      // 가벼운 점심 — 샐러드/포케/샌드위치/국수 등, category+signature_menu에
      // LIGHT_LUNCH_PATTERN이 걸리는 곳만(단, "칼국수"는 든든한 점심 쪽에 남김).
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
          and (coalesce(pl.category, '') || ' ' || coalesce(pl.signature_menu, '')) ~* ${LIGHT_LUNCH_PATTERN}
          and (coalesce(pl.category, '') || ' ' || coalesce(pl.signature_menu, '')) !~* '칼국수'
        order by coalesce(agg.review_count, 0) desc, pl.name asc
      `;
      return (rows as Record<string, unknown>[]).map(normalizePlaceRow);
    }

    // food / lunch (기본값, "든든한 점심") — light 패턴에 걸리는 곳(가벼운 점심
    // 쪽으로 뺀 곳)만 빼고 나머지 밥집을 전부 보여준다. 이렇게 해야 아직
    // 카테고리/대표메뉴가 애매하게 적힌 곳도 어느 필터에서도 "사라지지" 않고
    // 기본 목록엔 남아있는다. HEARTY_LUNCH_PATTERN에 걸리는 스테디셀러
    // (국밥/찌개/고기 등)를 먼저 정렬해서 보여준다.
    const rows = await sql`
      select
        pl.id, pl.name, pl.category, pl.road_address, pl.phone, pl.walk_minutes, pl.kakao_url,
        pl.place_type, pl.has_room, pl.max_party_size, pl.has_outlet, pl.is_quiet, pl.long_stay_ok,
        pl.signature_menu, pl.image_url, pl.is_trendy,
        coalesce(agg.review_count, 0) as review_count,
        agg.again_rate,
        agg.avg_price_per_person,
        photo.storage_path as thumbnail_url,
        case
          when (coalesce(pl.category, '') || ' ' || coalesce(pl.signature_menu, '')) ~* ${HEARTY_LUNCH_PATTERN}
          then 0 else 1
        end as hearty_rank
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
        and not (
          (coalesce(pl.category, '') || ' ' || coalesce(pl.signature_menu, '')) ~* ${LIGHT_LUNCH_PATTERN}
          and (coalesce(pl.category, '') || ' ' || coalesce(pl.signature_menu, '')) !~* '칼국수'
        )
      order by hearty_rank asc, coalesce(agg.review_count, 0) desc, pl.name asc
    `;
    return (rows as Record<string, unknown>[]).map(normalizePlaceRow);
  }

  // 멋따라 (카페·공간): place_type이 cafe 또는 both인 곳만.
  if (filter === "trendy") {
    // 힙플레이스·디저트 — 관리자가 /admin에서 직접 켠 20대 인기 카페만.
    // 2026-09-15(14차)부터 STYLE_DEFAULT_FILTER가 됨(예전엔 remote가 기본).
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
    // 조용한 힐링(2026-09-15 14차부터 명칭 변경, 예전 이름 "조용한 미팅") —
    // 특정 방문 목적이 아니라 장소 자체의 "조용함" 속성으로 거른다.
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

  // style / remote ("자유 외근·작업") — 콘센트가 넉넉히 확인된 곳만 보여준다
  // (구조적 추측 없이 has_outlet = true로 확정된 곳만, 이 프로젝트의 "정직한
  // 데이터" 원칙을 quiet 필터와 동일하게 적용. 2026-09-15(14차)부터 더 이상
  // 기본 필터가 아니라 두 번째 필터임 — STYLE_DEFAULT_FILTER는 trendy).
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
    where pl.place_type in ('cafe', 'both') and pl.has_outlet = true
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
