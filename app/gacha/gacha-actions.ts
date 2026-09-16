"use server";

// 2026-09-16(19차): "🎰 오늘 랜덤 여기는 어떠냥?!" 가챠 페이지의 서버 로직.
// - spinGacha(): 밥집 하나를 무작위로 뽑고, 조건 추천과 동일한
//   getPairedCafe()로 "회사 기준 도보시간이 비슷한" 연계 카페를 근사치로
//   붙인다(두 장소 사이 실제 거리 데이터가 없다는 제약은 조건 추천과 동일 —
//   recommend-queries.ts 상단 주석 참고). 새 규칙을 따로 만들지 않고 기존
//   함수를 그대로 재사용해서 "같은 페어링 로직, 다른 진입 방식"을 유지한다.
// - decideGachaCourse(): "🎯 오늘 점심은 이 코스로 결정!" 버튼 — 조건
//   추천의 decideRecommendation()과 같은 테이블(recommendation_logs)에
//   conditions.situation = 'gacha'로 구분해서 남긴다.
import { sql } from "@/lib/db";
import { getSessionProfileId } from "@/lib/session";
import { getPairedCafe } from "../recommend/recommend-queries";
import type { GachaCafe, GachaMeal, GachaResult } from "./gacha-display";

// 가챠는 상황을 묻지 않으므로 상황별 값 대신 "보통의 점심 한 끼" 기준
// 고정값을 쓴다 — recommend-queries.ts의 hearty(25분)/light(15분) 중간값.
const GACHA_MEAL_MINUTES = 20;
const GACHA_FALLBACK_WAIT_MINUTES = 8;
// 카페에서 머무는 시간은 실측 데이터가 없는 순수 가정치다 — 화면에도 이
// 가정을 숨기지 않고 "총 소요시간" 계산에만 반영한다(정직한 데이터 원칙).
const CAFE_STAY_MINUTES = 15;
// "KPR 90분 풀코스" 컨셉 고정 — 가챠는 시간 질문 자체가 없다.
const COURSE_BUDGET_MINUTES = 90;

function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildTimelineText(courseTotalMinutes: number): { text: string; warn: boolean } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "12") % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const nowMinutes = hour * 60 + minute;
  const inLunchWindow = nowMinutes >= 11 * 60 && nowMinutes <= 13 * 60;

  if (!inLunchWindow) {
    return {
      warn: false,
      text: `총 소요시간 ${courseTotalMinutes}분 — 지금은 점심시간이 아니니 여유롭게 즐기세요!`,
    };
  }

  const deadline = 13 * 60;
  const diff = deadline - (nowMinutes + courseTotalMinutes);
  if (diff >= 0) {
    return {
      warn: false,
      text: `총 소요시간 ${courseTotalMinutes}분 — 1시 복귀 ${diff}분 전 완벽 보장!`,
    };
  }
  return {
    warn: true,
    text: `총 소요시간 ${courseTotalMinutes}분 — 지금 출발하면 1시보다 약 ${-diff}분 늦을 수 있어요.`,
  };
}

export async function spinGacha(): Promise<GachaResult | null> {
  const rows = await sql`
    select
      pl.id, pl.name, pl.category, pl.signature_menu, pl.walk_minutes,
      pl.image_url,
      photo.storage_path as thumbnail_url,
      wait.avg_wait_minutes
    from places pl
    left join lateral (
      select rp.storage_path
      from review_photos rp
      join reviews r3 on r3.id = rp.review_id
      where r3.place_id = pl.id and r3.status = 'published'
      order by r3.created_at desc, rp.sort_order asc
      limit 1
    ) photo on true
    left join lateral (
      select round(avg(r.wait_minutes)::numeric, 0) as avg_wait_minutes
      from reviews r
      where r.place_id = pl.id and r.status = 'published' and r.wait_minutes is not null
    ) wait on true
    where pl.place_type in ('meal', 'both') and pl.walk_minutes is not null
    order by random()
    limit 1
  `;

  const row = (rows as Record<string, unknown>[])[0];
  if (!row) return null;

  const walkMinutes = toNumOrNull(row.walk_minutes) ?? 0;
  const roundTrip = walkMinutes * 2;
  const realWait = toNumOrNull(row.avg_wait_minutes);
  const wait = realWait ?? GACHA_FALLBACK_WAIT_MINUTES;
  const mealTotal = roundTrip + wait + GACHA_MEAL_MINUTES;

  const meal: GachaMeal = {
    id: row.id as string,
    name: row.name as string,
    category: (row.category as string) ?? null,
    signature_menu: (row.signature_menu as string) ?? null,
    walk_minutes: walkMinutes,
    image_url: (row.image_url as string) ?? null,
    thumbnail_url: (row.thumbnail_url as string) ?? null,
  };

  const remaining = COURSE_BUDGET_MINUTES - mealTotal;
  const pairedCafe = await getPairedCafe(meal.id, walkMinutes, remaining);
  const cafe: GachaCafe | null = pairedCafe
    ? {
        id: pairedCafe.id,
        name: pairedCafe.name,
        walk_minutes: pairedCafe.walk_minutes,
        signature_menu: pairedCafe.signature_menu,
        image_url: pairedCafe.image_url,
        thumbnail_url: pairedCafe.thumbnail_url,
        category: pairedCafe.category,
      }
    : null;

  const courseTotalMinutes = cafe
    ? mealTotal + cafe.walk_minutes * 2 + CAFE_STAY_MINUTES
    : mealTotal;
  const { text, warn } = buildTimelineText(courseTotalMinutes);

  return { meal, cafe, courseTotalMinutes, timelineText: text, timelineWarn: warn };
}

export async function decideGachaCourse(formData: FormData) {
  const profileId = await getSessionProfileId();
  const mealId = formData.get("meal_id")?.toString() ?? "";
  const cafeId = formData.get("cafe_id")?.toString() ?? "";

  if (!mealId) return { ok: false as const, error: "장소 정보가 없어요." };

  const recommendedIds = [mealId, ...(cafeId ? [cafeId] : [])];

  try {
    await sql`
      insert into recommendation_logs (
        user_id, purpose, conditions, recommended_place_ids, selected_place_id
      )
      values (
        ${profileId},
        'lunch',
        ${{ situation: "gacha" }},
        ${recommendedIds},
        ${mealId}
      )
    `;
    return { ok: true as const };
  } catch (err) {
    console.error("가챠 결정 기록 저장 실패:", err);
    return { ok: false as const, error: "기록 저장에 실패했어요." };
  }
}
