"use client";

// 둘러보기 피드의 클라이언트 사이드 필터링/정렬을 전담하는 훅. 서버에서 이미
// 내려받은 places 배열 안에서만 동작하며(DB 재조회 없음), feed-browser.tsx는
// 이 훅이 돌려주는 값만 그대로 렌더링한다.
//
// feed-display.ts 에서만 순수 헬퍼(mealWeightFor 등)를 가져온다 — feed-queries.ts를
// 여기서 import하면 lib/db.ts의 neon() 호출이 브라우저 번들에 끼어들어간다.
import { useEffect, useMemo, useState } from "react";
import { mealWeightFor, type FeedPlace, type MealWeight } from "./feed-display";

export type SortKey = "distance" | "again_rate" | "price";
export type DistanceKey = "near" | "far";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "distance", label: "거리 가까운 순" },
  { value: "again_rate", label: "재방문율 높은 순" },
  { value: "price", label: "가격 낮은 순" },
];

// min~max 구간 필터. 원래는 5분/6~10분/11~15분 3단계였는데, 실제 등록된
// 장소가 회사 바로 앞(1~2분)이거나 을지로 힙지로 원정대(12~14분)에만 몰려
// 있어서 그 사이(6~10분) 구간은 늘 0곳이었다. 그래서 "회사 바로 앞 스피드
// 식사" vs "조금 걸어 나가는 힙지로·명동 원정"이라는 실제 두 동선에 맞춰
// 2단계로 통합함(2026-09-08). far는 상한을 안 둬서(max: null) 앞으로 더 먼
// 곳이 추가돼도 항상 걸리도록 열어둔다.
export const DISTANCE_OPTIONS: { value: DistanceKey; min: number; max: number | null; label: string }[] = [
  { value: "near", min: 1, max: 5, label: "⚡️ 도보 5분 컷 (회사 바로 앞)" },
  { value: "far", min: 6, max: null, label: "🏃 도보 6분 이상 (힙지로·명동 원정)" },
];

const SEARCH_DEBOUNCE_MS = 250;

/** value가 delayMs 동안 안 바뀌고 멈춰있을 때만 반영되는 지연 값. 검색창에 매
 * 키 입력마다 필터링/재렌더가 돌아 버벅거리는 걸 막는다 — 입력창 자체(rawQuery)는
 * 즉시 반영되므로 타이핑감은 그대로 유지된다. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function useFeedFilters(places: FeedPlace[], isLunchFilter: boolean) {
  const [rawQuery, setRawQuery] = useState("");
  const query = useDebouncedValue(rawQuery, SEARCH_DEBOUNCE_MS);
  const [distance, setDistance] = useState<DistanceKey | null>(null);
  const [sort, setSort] = useState<SortKey>("distance");
  const [mealWeight, setMealWeight] = useState<MealWeight | null>(null);

  // '데일리 점심' 서브 필터(mealWeight)는 isLunchFilter가 아닐 때 아래
  // filteredSorted 로직에서 그냥 무시된다 — 화면에도 그 상황에서는 칩 자체가
  // 안 보이므로(feed-browser.tsx), 값을 굳이 렌더 중/effect에서 강제로
  // null로 되돌리지 않는다 (React Compiler 린트가 금지하는 두 패턴 — effect
  // 안 setState, 렌더 중 ref 접근 — 을 피하기 위한 선택).

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const distRange = distance ? DISTANCE_OPTIONS.find((d) => d.value === distance) ?? null : null;

    let list = places.filter((p) => {
      if (
        distRange &&
        (p.walk_minutes == null ||
          p.walk_minutes < distRange.min ||
          (distRange.max != null && p.walk_minutes > distRange.max))
      ) {
        return false;
      }
      if (isLunchFilter && mealWeight && mealWeightFor(p) !== mealWeight) {
        return false;
      }
      if (!q) return true;
      const haystack = [p.name, p.signature_menu ?? "", p.category ?? ""].join(" ").toLowerCase();
      return haystack.includes(q);
    });

    list = [...list].sort((a, b) => {
      if (sort === "distance") {
        return (a.walk_minutes ?? 999) - (b.walk_minutes ?? 999);
      }
      if (sort === "again_rate") {
        return (b.again_rate ?? -1) - (a.again_rate ?? -1);
      }
      // price
      const ap = a.avg_price_per_person ?? Number.MAX_SAFE_INTEGER;
      const bp = b.avg_price_per_person ?? Number.MAX_SAFE_INTEGER;
      return ap - bp;
    });

    return list;
  }, [places, query, distance, sort, mealWeight, isLunchFilter]);

  /** 빈 결과 카드의 "필터 초기화" 버튼 — 검색어/거리/정렬/서브필터를 전부 기본값으로. */
  function resetFilters() {
    setRawQuery("");
    setDistance(null);
    setSort("distance");
    setMealWeight(null);
  }

  /** 빈 결과 카드의 "거리 제한 없이 넓게 보기" 버튼 — 거리 구간 제한만 풀어준다. */
  function widenDistance() {
    setDistance(null);
  }

  return {
    rawQuery,
    setRawQuery,
    distance,
    setDistance,
    sort,
    setSort,
    mealWeight,
    setMealWeight,
    filteredSorted,
    resetFilters,
    widenDistance,
  };
}
