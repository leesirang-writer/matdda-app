import { sql } from "@/lib/db";
import {
  type Situation,
  type TimeBudgetKey,
  type PriceBudgetKey,
  timeBudgetMinutes,
} from "./recommend-display";

// "조건 추천"의 핵심 차별점: 사내 최고참 개발자가 만든 경쟁 앱은 스트레스/업무형태
// 같은 심리테스트형 조건만 묻고 "정보"를 준다. 우리는 시간을 실제로 계산해서
// "실무 의사결정"을 준다 — 왕복 도보시간 + (실측 or 추정)대기시간 + 예상 식사시간을
// 더해 "총 소요시간"을 뽑고, 회사가 실제로 검증한 사내 리뷰 데이터(재방문율,
// 부서명)를 근거로 붙인다. 좌표가 없는 장소가 섞여 있어서(을지로 확장분) 두 장소
// 사이의 실제 거리는 계산할 수 없다 — 그래서 "연계 카페"는 회사 기준 도보시간이
// 비슷한 곳을 고르는 근사치이고, 화면 문구도 "회사에서 도보 N분"처럼 우리가 실제로
// 아는 값만 정직하게 보여준다(가짜로 "두 장소 사이 도보 1분"이라고 주장하지 않음).
//
// 상황/시간/가격 옵션 상수와 타입은 DB에 전혀 의존하지 않는 recommend-display.ts에
// 있다 — 클라이언트 컴포넌트(recommend-input.tsx, decide-button.tsx)는 반드시
// 거기서만 import할 것.
export type { Situation, TimeBudgetKey, PriceBudgetKey };
export {
  SITUATION_OPTIONS,
  TIME_BUDGET_OPTIONS,
  PRICE_BUDGET_OPTIONS,
  isSituation,
  isTimeBudget,
  isPriceBudget,
  timeBudgetMinutes,
} from "./recommend-display";

// 상황별 "식사 시간" 고정 가정치(분) — 실측 데이터가 없어서 상식적인 값으로
// 잡아둔 추정치다. 접대는 여유있게, 스피드는 짧게.
const MEAL_MINUTES: Record<Situation, number> = {
  trendy: 25,
  client: 35,
  speed: 15,
  remote: 20,
};

// 실측 대기시간(reviews.wait_minutes) 데이터가 아예 없을 때 쓰는 추정 대기시간(분).
// 화면에는 반드시 "추정"이라고 표시하고, 실측 데이터가 하나라도 있으면 그걸
// 우선한다 — 데이터 정직성 원칙 유지.
const FALLBACK_WAIT_MINUTES: Record<Situation, number> = {
  trendy: 12,
  client: 5,
  speed: 3,
  remote: 5,
};

function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export type RecommendCandidate = {
  id: string;
  name: string;
  category: string | null;
  road_address: string | null;
  phone: string | null;
  kakao_url: string | null;
  walk_minutes: number;
  place_type: "meal" | "cafe" | "both";
  has_room: boolean | null;
  max_party_size: number | null;
  has_outlet: boolean | null;
  is_quiet: boolean | null;
  long_stay_ok: boolean | null;
  signature_menu: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  is_trendy: boolean;
  review_count: number;
  again_rate: number | null;
  avg_price_per_person: number | null;
  verifier_department: string | null;
  // 계산된 값들
  round_trip_minutes: number;
  wait_minutes: number;
  has_real_wait_data: boolean;
  meal_minutes: number;
  total_minutes: number;
  fits_time_budget: boolean;
  fits_price_budget: boolean;
};

function deriveCandidate(
  row: Record<string, unknown>,
  situation: Situation,
  timeBudget: number,
  priceBudget: PriceBudgetKey
): RecommendCandidate {
  const walkMinutes = toNumOrNull(row.walk_minutes) ?? 0;
  const roundTrip = walkMinutes * 2;
  const realWait = toNumOrNull(row.avg_wait_minutes);
  const hasRealWait = realWait != null;
  const wait = hasRealWait ? (realWait as number) : FALLBACK_WAIT_MINUTES[situation];
  const mealMinutes = MEAL_MINUTES[situation];
  const total = roundTrip + wait + mealMinutes;
  const avgPrice = toNumOrNull(row.avg_price_per_person);

  let fitsPrice = true;
  if (avgPrice != null) {
    if (priceBudget === "10000") fitsPrice = avgPrice <= 10000;
    else if (priceBudget === "15000") fitsPrice = avgPrice <= 15000;
    else fitsPrice = avgPrice >= 30000;
  }

  // 상황별 리뷰 통계(purpose 한정)가 있으면 그걸, 없으면 장소 전체 통계로 보완.
  const purposeReviewCount = toNumOrNull(row.purpose_review_count) ?? 0;
  const overallReviewCount = toNumOrNull(row.review_count) ?? 0;
  const useOverall = purposeReviewCount === 0;
  const reviewCount = useOverall ? overallReviewCount : purposeReviewCount;
  const againRate = useOverall
    ? toNumOrNull(row.again_rate)
    : toNumOrNull(row.purpose_again_rate);

  return {
    id: row.id as string,
    name: row.name as string,
    category: (row.category as string) ?? null,
    road_address: (row.road_address as string) ?? null,
    phone: (row.phone as string) ?? null,
    kakao_url: (row.kakao_url as string) ?? null,
    walk_minutes: walkMinutes,
    place_type: row.place_type as RecommendCandidate["place_type"],
    has_room: (row.has_room as boolean) ?? null,
    max_party_size: toNumOrNull(row.max_party_size),
    has_outlet: (row.has_outlet as boolean) ?? null,
    is_quiet: (row.is_quiet as boolean) ?? null,
    long_stay_ok: (row.long_stay_ok as boolean) ?? null,
    signature_menu: (row.signature_menu as string) ?? null,
    image_url: (row.image_url as string) ?? null,
    thumbnail_url: (row.thumbnail_url as string) ?? null,
    is_trendy: (row.is_trendy as boolean) ?? false,
    review_count: reviewCount,
    again_rate: againRate,
    avg_price_per_person: avgPrice,
    verifier_department: (row.verifier_department as string) ?? null,
    round_trip_minutes: roundTrip,
    wait_minutes: wait,
    has_real_wait_data: hasRealWait,
    meal_minutes: mealMinutes,
    total_minutes: total,
    fits_time_budget: total <= timeBudget,
    fits_price_budget: fitsPrice,
  };
}

function rankAndTake(
  candidates: RecommendCandidate[],
  take: number
): RecommendCandidate[] {
  return [...candidates]
    .sort((a, b) => {
      if (a.fits_time_budget !== b.fits_time_budget) return a.fits_time_budget ? -1 : 1;
      if (a.fits_price_budget !== b.fits_price_budget) return a.fits_price_budget ? -1 : 1;
      const ar = a.again_rate ?? -1;
      const br = b.again_rate ?? -1;
      if (ar !== br) return br - ar;
      return a.total_minutes - b.total_minutes;
    })
    .slice(0, take);
}

export async function getRecommendations(
  situation: Situation,
  timeBudget: TimeBudgetKey,
  priceBudget: PriceBudgetKey
): Promise<RecommendCandidate[]> {
  const budgetMinutes = timeBudgetMinutes(timeBudget);

  if (situation === "trendy") {
    // 👶 20대 동기들과 힙지로 핫플 — is_trendy가 켜진 곳(밥집/카페 무관), 전체
    // 리뷰 통계 기준(특정 purpose로 좁히지 않음 — 힙플레이스는 방문 목적이
    // 다양해서).
    const rows = await sql`
      select
        pl.id, pl.name, pl.category, pl.road_address, pl.phone, pl.kakao_url,
        pl.walk_minutes, pl.place_type, pl.has_room, pl.max_party_size,
        pl.has_outlet, pl.is_quiet, pl.long_stay_ok,
        pl.signature_menu, pl.image_url, pl.is_trendy,
        coalesce(ps.review_count, 0) as review_count,
        ps.again_rate,
        ps.avg_price_per_person,
        photo.storage_path as thumbnail_url,
        ps.review_count as purpose_review_count,
        ps.again_rate as purpose_again_rate,
        wait.avg_wait_minutes,
        dep.department as verifier_department
      from places pl
      left join place_stats ps on ps.place_id = pl.id
      left join lateral (
        select round(avg(r.wait_minutes)::numeric, 0) as avg_wait_minutes
        from reviews r
        where r.place_id = pl.id and r.status = 'published' and r.wait_minutes is not null
      ) wait on true
      left join lateral (
        select pr.department
        from reviews r2
        join profiles pr on pr.id = r2.author_id
        where r2.place_id = pl.id and r2.status = 'published'
          and pr.department is not null and pr.department <> ''
        order by r2.created_at desc
        limit 1
      ) dep on true
      left join lateral (
        select rp.storage_path
        from review_photos rp
        join reviews r3 on r3.id = rp.review_id
        where r3.place_id = pl.id and r3.status = 'published'
        order by r3.created_at desc, rp.sort_order asc
        limit 1
      ) photo on true
      where pl.is_trendy = true and pl.walk_minutes is not null
      order by pl.walk_minutes asc
      limit 20
    `;
    const candidates = (rows as Record<string, unknown>[]).map((r) =>
      deriveCandidate(r, situation, budgetMinutes, priceBudget)
    );
    return rankAndTake(candidates, 3);
  }

  if (situation === "client") {
    // 👔 클라이언트/임원 접대 — 룸 필수. purpose='client' 리뷰 통계 우선.
    const rows = await sql`
      select
        pl.id, pl.name, pl.category, pl.road_address, pl.phone, pl.kakao_url,
        pl.walk_minutes, pl.place_type, pl.has_room, pl.max_party_size,
        pl.has_outlet, pl.is_quiet, pl.long_stay_ok,
        pl.signature_menu, pl.image_url, pl.is_trendy,
        coalesce(ps.review_count, 0) as review_count,
        ps.again_rate,
        ps.avg_price_per_person,
        photo.storage_path as thumbnail_url,
        pps.purpose_review_count,
        pps.purpose_again_rate,
        wait.avg_wait_minutes,
        dep.department as verifier_department
      from places pl
      left join place_stats ps on ps.place_id = pl.id
      left join lateral (
        select
          count(r.id) as purpose_review_count,
          round(count(*) filter (where r.verdict = 'again')::numeric / nullif(count(r.id), 0) * 100, 1) as purpose_again_rate
        from reviews r
        where r.place_id = pl.id and r.status = 'published' and r.purpose = 'client'
      ) pps on true
      left join lateral (
        select round(avg(r.wait_minutes)::numeric, 0) as avg_wait_minutes
        from reviews r
        where r.place_id = pl.id and r.status = 'published' and r.purpose = 'client' and r.wait_minutes is not null
      ) wait on true
      left join lateral (
        select pr.department
        from reviews r2
        join profiles pr on pr.id = r2.author_id
        where r2.place_id = pl.id and r2.status = 'published' and r2.purpose = 'client'
          and pr.department is not null and pr.department <> ''
        order by r2.created_at desc
        limit 1
      ) dep on true
      left join lateral (
        select rp.storage_path
        from review_photos rp
        join reviews r3 on r3.id = rp.review_id
        where r3.place_id = pl.id and r3.status = 'published'
        order by r3.created_at desc, rp.sort_order asc
        limit 1
      ) photo on true
      where pl.has_room = true and pl.place_type in ('meal', 'both') and pl.walk_minutes is not null
      order by pl.walk_minutes asc
      limit 20
    `;
    const candidates = (rows as Record<string, unknown>[]).map((r) =>
      deriveCandidate(r, situation, budgetMinutes, priceBudget)
    );
    return rankAndTake(candidates, 3);
  }

  if (situation === "speed") {
    // ⚡️ 스피드 식사 — 회사에서 가까운 순, purpose='lunch' 리뷰 통계 우선.
    const rows = await sql`
      select
        pl.id, pl.name, pl.category, pl.road_address, pl.phone, pl.kakao_url,
        pl.walk_minutes, pl.place_type, pl.has_room, pl.max_party_size,
        pl.has_outlet, pl.is_quiet, pl.long_stay_ok,
        pl.signature_menu, pl.image_url, pl.is_trendy,
        coalesce(ps.review_count, 0) as review_count,
        ps.again_rate,
        ps.avg_price_per_person,
        photo.storage_path as thumbnail_url,
        pps.purpose_review_count,
        pps.purpose_again_rate,
        wait.avg_wait_minutes,
        dep.department as verifier_department
      from places pl
      left join place_stats ps on ps.place_id = pl.id
      left join lateral (
        select
          count(r.id) as purpose_review_count,
          round(count(*) filter (where r.verdict = 'again')::numeric / nullif(count(r.id), 0) * 100, 1) as purpose_again_rate
        from reviews r
        where r.place_id = pl.id and r.status = 'published' and r.purpose = 'lunch'
      ) pps on true
      left join lateral (
        select round(avg(r.wait_minutes)::numeric, 0) as avg_wait_minutes
        from reviews r
        where r.place_id = pl.id and r.status = 'published' and r.purpose = 'lunch' and r.wait_minutes is not null
      ) wait on true
      left join lateral (
        select pr.department
        from reviews r2
        join profiles pr on pr.id = r2.author_id
        where r2.place_id = pl.id and r2.status = 'published' and r2.purpose = 'lunch'
          and pr.department is not null and pr.department <> ''
        order by r2.created_at desc
        limit 1
      ) dep on true
      left join lateral (
        select rp.storage_path
        from review_photos rp
        join reviews r3 on r3.id = rp.review_id
        where r3.place_id = pl.id and r3.status = 'published'
        order by r3.created_at desc, rp.sort_order asc
        limit 1
      ) photo on true
      where pl.place_type in ('meal', 'both') and pl.walk_minutes is not null
      order by pl.walk_minutes asc
      limit 20
    `;
    const candidates = (rows as Record<string, unknown>[]).map((r) =>
      deriveCandidate(r, situation, budgetMinutes, priceBudget)
    );
    return rankAndTake(candidates, 3);
  }

  // 💻 외근/혼밥 — 밥집이면 'lunch', 카페면 'remote_work' 리뷰 통계를 각 행의
  // place_type에 맞게 골라 쓴다(장소마다 다른 purpose라 SQL의 case로 처리).
  const rows = await sql`
    select
      pl.id, pl.name, pl.category, pl.road_address, pl.phone, pl.kakao_url,
        pl.walk_minutes, pl.place_type, pl.has_room, pl.max_party_size,
        pl.has_outlet, pl.is_quiet, pl.long_stay_ok,
        pl.signature_menu, pl.image_url, pl.is_trendy,
        coalesce(ps.review_count, 0) as review_count,
        ps.again_rate,
        ps.avg_price_per_person,
        photo.storage_path as thumbnail_url,
      pps.purpose_review_count,
      pps.purpose_again_rate,
      wait.avg_wait_minutes,
      dep.department as verifier_department
    from places pl
    left join place_stats ps on ps.place_id = pl.id
    left join lateral (
      select
        count(r.id) as purpose_review_count,
        round(count(*) filter (where r.verdict = 'again')::numeric / nullif(count(r.id), 0) * 100, 1) as purpose_again_rate
      from reviews r
      where r.place_id = pl.id and r.status = 'published'
        and r.purpose = case when pl.place_type = 'meal' then 'lunch' else 'remote_work' end
    ) pps on true
    left join lateral (
      select round(avg(r.wait_minutes)::numeric, 0) as avg_wait_minutes
      from reviews r
      where r.place_id = pl.id and r.status = 'published' and r.wait_minutes is not null
        and r.purpose = case when pl.place_type = 'meal' then 'lunch' else 'remote_work' end
    ) wait on true
    left join lateral (
      select pr.department
      from reviews r2
      join profiles pr on pr.id = r2.author_id
      where r2.place_id = pl.id and r2.status = 'published'
        and r2.purpose = case when pl.place_type = 'meal' then 'lunch' else 'remote_work' end
        and pr.department is not null and pr.department <> ''
      order by r2.created_at desc
      limit 1
    ) dep on true
    left join lateral (
      select rp.storage_path
      from review_photos rp
      join reviews r3 on r3.id = rp.review_id
      where r3.place_id = pl.id and r3.status = 'published'
      order by r3.created_at desc, rp.sort_order asc
      limit 1
    ) photo on true
    where pl.place_type in ('meal', 'cafe', 'both') and pl.walk_minutes is not null
    order by pl.walk_minutes asc
    limit 20
  `;
  const candidates = (rows as Record<string, unknown>[]).map((r) =>
    deriveCandidate(r, situation, budgetMinutes, priceBudget)
  );
  return rankAndTake(candidates, 3);
}

export type PairedCafe = {
  id: string;
  name: string;
  walk_minutes: number;
  signature_menu: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  category: string | null;
};

/**
 * 밥집 추천 뒤에 붙이는 "연계 카페" — 정확한 두 장소 사이 거리는 알 수 없어서
 * (좌표 없는 곳이 섞여 있음), 회사 기준 도보시간이 비슷한 카페를 근사치로
 * 고른다. remainingMinutes(허용시간 - 식사 총 소요시간)가 카페 왕복 시간보다
 * 짧으면 아예 추천하지 않는다.
 */
export async function getPairedCafe(
  mealPlaceId: string,
  mealWalkMinutes: number,
  remainingMinutes: number
): Promise<PairedCafe | null> {
  if (remainingMinutes < 10) return null;

  // 왕복(walk_minutes*2)이 남는 시간 안에 들어오는 카페만 애초에 후보로 놓고,
  // 그중에서 회사 기준 도보시간이 밥집과 가장 비슷한 곳을 고른다. (예전엔
  // "가장 가까운 5곳"을 먼저 뽑은 뒤 시간 조건으로 걸러서, 근접순 5위 밖에
  // 있지만 실제로는 시간이 남는 카페를 놓치는 버그가 있었다.)
  const maxCafeWalk = Math.floor(remainingMinutes / 2);
  const rows = await sql`
    select
      pl.id, pl.name, pl.walk_minutes, pl.signature_menu, pl.image_url, pl.category,
      photo.storage_path as thumbnail_url
    from places pl
    left join lateral (
      select rp.storage_path
      from review_photos rp
      join reviews r3 on r3.id = rp.review_id
      where r3.place_id = pl.id and r3.status = 'published'
      order by r3.created_at desc, rp.sort_order asc
      limit 1
    ) photo on true
    where pl.place_type in ('cafe', 'both')
      and pl.id <> ${mealPlaceId}
      and pl.walk_minutes is not null
      and pl.walk_minutes <= ${maxCafeWalk}
    order by abs(pl.walk_minutes - ${mealWalkMinutes}) asc, pl.walk_minutes asc
    limit 1
  `;

  const row = (rows as Record<string, unknown>[])[0];
  if (!row) return null;
  return {
    id: row.id as string,
    name: row.name as string,
    walk_minutes: toNumOrNull(row.walk_minutes) ?? 0,
    signature_menu: (row.signature_menu as string) ?? null,
    image_url: (row.image_url as string) ?? null,
    thumbnail_url: (row.thumbnail_url as string) ?? null,
    category: (row.category as string) ?? null,
  };
}
