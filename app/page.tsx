import FeedBrowser, { type AxisTab, type FilterTab } from "./feed-browser";
import {
  getFeedPlaces,
  getFeedSummary,
  FOOD_DEFAULT_FILTER,
  STYLE_DEFAULT_FILTER,
  type FeedAxis,
  type FoodFilter,
  type StyleFilter,
} from "./feed-queries";

// "전체" 탭은 없앴다 — 축을 누르면 바로 첫 번째(기본) 상황 필터로 들어간다.
// "trendy"는 을지로3가 힙지로 반경 확장에 맞춰 새로 추가한 20대 트렌드 필터
// (관리자가 /admin에서 is_trendy를 켠 장소만 모아 보여줌).
const FOOD_FILTERS: { value: FoodFilter; label: string }[] = [
  { value: "lunch", label: "🍚 데일리 점심" },
  { value: "trendy", label: "🌮 힙지로·트렌드" },
  { value: "client", label: "👔 룸/접대" },
  { value: "dinner", label: "🍺 저녁/회식" },
];

const STYLE_FILTERS: { value: StyleFilter; label: string }[] = [
  { value: "remote", label: "💻 자유 외근" },
  { value: "trendy", label: "✨ 힙플레이스·디저트" },
  { value: "quiet", label: "☕️ 조용한 미팅" },
];

const AXIS_TAB_META: Record<FeedAxis, { label: string; sub: string }> = {
  food: { label: "🍚 맛따라", sub: "식사" },
  style: { label: "☕️ 멋따라", sub: "공간·커피" },
};

const EMPTY_MESSAGES: Record<FeedAxis, Record<string, string[]>> = {
  food: {
    lunch: ["아직 점심으로 남긴 리뷰가 없어요."],
    trendy: ["아직 관리자가 등록한 힙지로 트렌드 핫플이 없어요.", "/admin에서 20대 트렌드를 켜보세요!"],
    client: ["아직 이 상황에 맞는 리뷰가 없어요.", "첫 리뷰를 남겨서 채워보세요!"],
    dinner: ["아직 저녁·회식으로 남긴 리뷰가 없어요."],
  },
  style: {
    remote: ["아직 외근하기 좋은 곳으로 남긴 리뷰가 없어요."],
    trendy: ["아직 관리자가 등록한 힙플레이스·디저트 핫플이 없어요.", "/admin에서 20대 트렌드를 켜보세요!"],
    quiet: ["아직 '조용함'이 확인된 카페가 없어요.", "리뷰 쓸 때 살짝 알려주세요!"],
  },
};

function isValidAxis(v: string | undefined): v is FeedAxis {
  return v === "food" || v === "style";
}
function isValidFoodFilter(v: string | undefined): v is FoodFilter {
  return v === "lunch" || v === "trendy" || v === "client" || v === "dinner";
}
function isValidStyleFilter(v: string | undefined): v is StyleFilter {
  return v === "remote" || v === "trendy" || v === "quiet";
}

function axisHref(axis: FeedAxis): string {
  return axis === "food" ? "/" : "/?axis=style";
}

function filterHref(axis: FeedAxis, value: string): string {
  const defaultValue = axis === "food" ? FOOD_DEFAULT_FILTER : STYLE_DEFAULT_FILTER;
  const qs = new URLSearchParams();
  if (axis === "style") qs.set("axis", "style");
  if (value !== defaultValue) qs.set("filter", value);
  const s = qs.toString();
  return s ? `/?${s}` : "/";
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ axis?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const axis: FeedAxis = isValidAxis(params.axis) ? params.axis : "food";
  const filter: string =
    axis === "food"
      ? isValidFoodFilter(params.filter)
        ? params.filter
        : FOOD_DEFAULT_FILTER
      : isValidStyleFilter(params.filter)
        ? params.filter
        : STYLE_DEFAULT_FILTER;

  const situationalFilters = axis === "food" ? FOOD_FILTERS : STYLE_FILTERS;

  const [places, summary] = await Promise.all([
    getFeedPlaces(axis, filter),
    getFeedSummary(),
  ]);

  // 사이드바에 그대로 넘길 수 있게 href/active 상태를 서버에서 미리 계산해둔다 —
  // feed-browser.tsx(클라이언트 컴포넌트)는 그냥 렌더링만 하면 되도록.
  const axisTabs: AxisTab[] = (["food", "style"] as const).map((a) => ({
    value: a,
    label: AXIS_TAB_META[a].label,
    sub: AXIS_TAB_META[a].sub,
    href: axisHref(a),
    active: axis === a,
  }));

  const filterTabs: FilterTab[] = situationalFilters.map((f) => ({
    value: f.value,
    label: f.label,
    href: filterHref(axis, f.value),
    active: f.value === filter,
  }));

  return (
    <FeedBrowser
      axis={axis}
      filter={filter}
      axisTabs={axisTabs}
      filterTabs={filterTabs}
      places={places}
      reviewCount={summary.review_count}
      emptyMessages={EMPTY_MESSAGES[axis][filter]}
    />
  );
}
