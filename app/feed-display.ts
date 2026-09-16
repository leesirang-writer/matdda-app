// 서버 쿼리(feed-queries.ts, lib/db 의존)와 완전히 분리된 순수 표시용 헬퍼 모음.
//
// 클라이언트 컴포넌트(feed-browser.tsx)가 이 파일에서 직접 import해야 한다 —
// feed-queries.ts를 클라이언트 컴포넌트에서 import하면, 실제로 쓰지 않는
// getFeedPlaces 등과 함께 lib/db.ts의 neon(process.env.DATABASE_URL) 호출까지
// 브라우저 번들에 딸려 들어가서, DATABASE_URL이 없는 브라우저 환경에서 즉시
// "DATABASE_URL 환경변수가 없습니다" 에러가 터진다. 그래서 DB에 전혀 의존하지
// 않는 타입/함수만 이 파일에 두고, feed-queries.ts는 이 파일 걸 재수출한다.

export type FeedPlace = {
  id: string;
  name: string;
  category: string | null;
  road_address: string | null;
  /** 데스크톱 카드에 표시할 전화번호. 없는 곳도 많아서 nullable. */
  phone: string | null;
  walk_minutes: number | null;
  kakao_url: string | null;
  place_type: "meal" | "cafe" | "both";
  has_room: boolean | null;
  max_party_size: number | null;
  has_outlet: boolean | null;
  is_quiet: boolean | null;
  long_stay_ok: boolean | null;
  review_count: number;
  again_rate: number | null;
  avg_price_per_person: number | null;
  /** 실제 리뷰 사진의 Vercel Blob URL. 없으면 null (그때는 fallbackImage 사용). */
  thumbnail_url: string | null;
  /** 관리자가 /admin에서 채워 넣은 대표 메뉴. */
  signature_menu: string | null;
  /** 관리자가 /admin에서 직접 지정한 대표 사진 URL. 있으면 최우선으로 쓴다. */
  image_url: string | null;
  /** 관리자가 /admin에서 켠 "20대 트렌드 핫플" 여부. */
  is_trendy: boolean;
  /** 관리자가 /admin에서 켠 "총무팀 픽" 여부 — 리뷰가 없어도 주는 신뢰 신호. */
  is_staff_pick: boolean;
  /** 이 장소 전체(방문 목적 무관)에 달린 "🔥 또 갈래요" 원터치 반응 수. */
  again_count: number;
  /** 이 장소 전체(방문 목적 무관)에 달린 "🤔 굳이" 원터치 반응 수. */
  no_count: number;
};

/** 원터치 반응/꿀팁 제보 모달이 공통으로 쓰는 방문 목적 값. */
export type VotePurpose = "client" | "remote_work" | "lunch" | "dinner" | "cafe";

/** "15초 꿀팁 제보" 모달의 소속팀 선택지 — quick-tip-modal.tsx와
 * quick-tip-actions.ts(서버 검증)가 이 원본 하나를 함께 쓴다. */
export const QUICK_TIP_DEPARTMENTS = [
  "홍보본부",
  "디지털본부",
  "경영지원/총무",
  "기획",
  "기타",
] as const;

/** GNB "꿀팁 제보하기"의 장소 검색 단계에서 쓰는 가벼운 장소 목록 타입
 * (feed-queries.ts의 getAllPlacesLite()가 이 타입으로 돌려준다). */
export type PlaceLite = {
  id: string;
  name: string;
  place_type: FeedPlace["place_type"];
  category: string | null;
  road_address: string | null;
  walk_minutes: number | null;
};

/**
 * 카드에서 원터치 반응을 누를 때 어떤 방문 목적(purpose)으로 기록할지 —
 * 지금 보고 있는 축/상황 필터 컨텍스트를 그대로 반영한다. 실제로 물어보진
 * 않지만, 사용자가 어떤 상황을 보다가 눌렀는지는 이미 알고 있으니 이걸
 * 쓰는 게 "굳이 다시 물어보지 않아도 되는 정직한 추정"에 가깝다.
 */
export function inferVotePurpose(axis: "food" | "style", filter: string): VotePurpose {
  if (axis === "food") {
    if (filter === "dinner") return "dinner";
    if (filter === "client") return "client";
    return "lunch"; // lunch, light, trendy
  }
  if (filter === "remote") return "remote_work";
  return "cafe"; // trendy, quiet
}

/** '음식점 > 한식 > 육류,고기 > 닭요리' -> '한식' 처럼 대표 분류만 뽑는다. */
export function simplifyCategory(raw: string | null): string {
  if (!raw) return "";
  const parts = raw
    .split(">")
    .map((p) => p.trim())
    .filter((p) => p && p !== "음식점");
  return parts[0] ?? raw.trim();
}

// 리뷰 사진이 아직 없는 장소를 위한 카테고리별 대표 이미지. 전부 Unsplash
// 무료 라이선스 사진(출처 표기 불필요)이고, 실제로 열리는 것까지 확인된
// URL만 넣어뒀다. 카카오 카테고리 원문(raw category)에 특정 키워드가
// 포함되어 있으면 그에 맞는 테마 이미지를 매칭한다 — 새 장소를 추가해도
// 사람이 사진을 일일이 골라 넣을 필요가 없도록 하는 게 목적.
function unsplash(id: string): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=480&h=280&q=65`;
}

const CATEGORY_IMAGE_RULES: { keywords: string[]; url: string }[] = [
  // 국밥/찌개/탕류
  { keywords: ["국밥", "찌개", "탕", "전골"], url: unsplash("1743419612786-19d116bb8c40") },
  // 일식/초밥/라멘
  {
    keywords: ["일식", "초밥", "스시", "라멘", "돈카츠", "우동", "돈부리"],
    url: unsplash("1556906905-4f33f9367b6e"),
  },
  // 고기구이/삼겹살/갈비
  { keywords: ["고기", "구이", "삼겹살", "갈비", "육류", "곱창"], url: unsplash("1708388066811-906f2f678a84") },
  // 치킨
  { keywords: ["치킨", "닭"], url: unsplash("1657271511865-f610b280dca4") },
  // 타코/멕시칸 (힙지로 트렌드 핫플 대응)
  { keywords: ["타코", "멕시칸", "부리또"], url: unsplash("1565299585323-38d6b0865b47") },
  // 분식/샐러드
  { keywords: ["분식", "떡볶이", "김밥", "샐러드", "포케"], url: unsplash("1512621776951-a57141f2eefd") },
  // 한정식/백반/한식
  { keywords: ["한정식", "백반", "한식"], url: unsplash("1661366394743-fe30fe478ef7") },
  // 이자카야/호프/포차/칵테일바 — 을지로 힙지로 확장 이후 이 그룹 장소가
  // 꽤 늘었는데(등록 데이터 기준 7곳) 전용 이미지가 없어서 전부 기본
  // 이미지로 뭉뚱그려지고 있었음. 2026-09-07(7차)에 분리.
  {
    keywords: ["이자카야", "호프", "포차", "요리주점", "칵테일바", "술집", "포장마차"],
    url: unsplash("1745847513035-34f88ffccd59"),
  },
  // 양식/파스타/스테이크/피자
  { keywords: ["양식", "파스타", "스테이크", "피자", "스파게티"], url: unsplash("1680405229153-a753d043c4ec") },
  // 버거
  { keywords: ["버거", "햄버거"], url: unsplash("1534790566855-4cb788d389ec") },
  // 베트남/쌀국수/팟타이/태국음식
  { keywords: ["베트남", "쌀국수", "팟타이", "태국"], url: unsplash("1631709497146-a239ef373cf1") },
  // 중식/면요리(냉면 포함)/딤섬
  {
    keywords: ["중식", "짜장", "짬뽕", "딤섬", "만두", "냉면", "우육면"],
    url: unsplash("1504669221159-56caf7b07f57"),
  },
  // 브런치/샌드위치/토스트
  { keywords: ["브런치", "샌드위치", "토스트"], url: unsplash("1441986060468-324610e6e6a8") },
  // 베이커리/빵집 — 카페(음료 중심)와는 결이 달라서 2026-09-07(7차)에 분리.
  { keywords: ["베이커리", "빵집", "제과"], url: unsplash("1687722157890-9f58d5cd26d4") },
  // 카페/커피/디저트
  { keywords: ["카페", "커피", "디저트"], url: unsplash("1553962311-62f2471b159d") },
];

// 위 키워드에 하나도 안 걸릴 때 쓰는 최종 기본값 (밥집 / 카페 각각 하나씩).
const DEFAULT_MEAL_IMAGE = unsplash("1596252890311-caa6a004a6ee");
const DEFAULT_CAFE_IMAGE = unsplash("1553962311-62f2471b159d");

export function fallbackImage(
  category: string | null,
  placeType: FeedPlace["place_type"]
): string {
  const raw = category ?? "";
  for (const rule of CATEGORY_IMAGE_RULES) {
    if (rule.keywords.some((k) => raw.includes(k))) return rule.url;
  }
  return placeType === "cafe" ? DEFAULT_CAFE_IMAGE : DEFAULT_MEAL_IMAGE;
}

/**
 * 카드에 실제로 그릴 썸네일 URL. 우선순위:
 * 1) 관리자가 /admin에서 직접 지정한 image_url (가장 신뢰할 수 있는 큐레이션)
 * 2) 실제로 달린 리뷰 사진
 * 3) 카테고리 키워드로 고른 기본 이미지
 */
export function thumbnailFor(place: FeedPlace): string {
  return place.image_url ?? place.thumbnail_url ?? fallbackImage(place.category, place.place_type);
}

/**
 * 트렌드 배지 문구. place_type으로 "밥집 웨이팅 핫플"과 "카페 인기템"을 구분한다
 * (같은 is_trendy 컬럼을 축과 무관하게 재사용하기 때문 — 필터를 바꿔도 배지 문구는
 * 그 장소 자체의 성격을 그대로 따른다).
 */
export function trendyBadgeLabel(place: FeedPlace): string {
  return place.place_type === "cafe" ? "🔥 20대 인기" : "🌮 웨이팅 핫플";
}

// 카카오 원본 카테고리 문자열의 세그먼트 순서 때문에 simplifyCategory가 사람이
// 보기에 어색한 대표 분류를 뽑아내는 곳들을 이름으로 직접 보정한다 (예: "가까운빵"은
// 원본이 "음식점 > 간식 > 베이커리" 순이라 simplifyCategory가 "간식"을 반환함).
// DB의 category 컬럼 자체를 바꾸지 않고 표시 계층에서만 바로잡는 가벼운 방법.
// (2026-09-08, 9차 도입 — 18차에서 feed-display.ts를 정리하며 잠시 빠졌다가
// use-feed-filters.ts와의 타입 불일치를 잡던 중 함께 복원됨.)
const CATEGORY_OVERRIDES: Record<string, string> = {
  가까운빵: "브런치/베이커리",
};

/** simplifyCategory에 이름 기반 보정(CATEGORY_OVERRIDES)까지 적용한 최종 배지 문구. */
export function displayCategory(place: Pick<FeedPlace, "name" | "category">): string {
  return CATEGORY_OVERRIDES[place.name] ?? simplifyCategory(place.category);
}

export type MealWeight = "light" | "hearty";

// '데일리 점심'(든든한 점심) 안에서만 쓰는 가볍게(간단한 한 끼) / 든든하게(포만감
// 있는 한 끼) 서브 필터 분류 키워드. displayCategory(이름 보정 포함)와 원본
// category 문자열을 둘 다 검사해서, 이름 보정만 받은 곳(예: 가까운빵)도 바로
// "가볍게"에 걸리게 한다.
const LIGHT_MEAL_KEYWORDS = [
  "샌드위치", "샐러드", "브런치", "토스트", "김밥", "베이커리", "포케", "델리",
];
const HEARTY_MEAL_KEYWORDS = [
  "한식", "국밥", "찌개", "탕", "전골", "돈까스", "돈가스",
  "고기", "구이", "삼겹살", "갈비", "육류", "곱창", "국수", "우동",
];

/** 어느 쪽 키워드에도 안 걸리면 null(미분류) — 서브 필터가 켜져 있으면 목록에서 빠진다. */
export function mealWeightFor(place: Pick<FeedPlace, "name" | "category">): MealWeight | null {
  const haystack = `${displayCategory(place)} ${place.category ?? ""}`;
  if (LIGHT_MEAL_KEYWORDS.some((k) => haystack.includes(k))) return "light";
  if (HEARTY_MEAL_KEYWORDS.some((k) => haystack.includes(k))) return "hearty";
  return null;
}

// 썸네일(원격 URL) 로딩이 실패했을 때(끊긴 링크, 네트워크 오류 등) 보여줄 로컬
// fallback. 네트워크 요청 없이 즉시 렌더되는 data: URL이라 항상 동작한다.
export const IMAGE_FALLBACK_PLACEHOLDER =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='480' height='280'>` +
      `<rect width='100%' height='100%' fill='#F1EDFD'/>` +
      `<text x='50%' y='50%' font-size='44' text-anchor='middle' dominant-baseline='central'>🍽️</text>` +
      `</svg>`
  );

/** 식당 카드 하단 "☕️ 추천 코스" 태그에 쓰는 결과 — 카페 이름과 표시용 도보 분. */
export type PairedCafe = { name: string; walkMinutes: number };

// 2026-09-16(18차): "맛따라 + 멋따라 연계" 느낌을 카드 단위로도 보여주기 위한
// 헬퍼. 두 장소 사이의 실제 도보 거리(geodistance)는 데이터에 없다 —
// 다수 장소가 위경도를 확보하지 못해서(조건 추천의 getPairedCafe와 동일한
// 제약, build-progress 13번 참고) 만들어낼 수 없다. 대신 두 장소 모두 이미
// 아는 값인 "회사 기준 도보시간(walk_minutes)"의 차이를 근사치로 쓴다 — 회사
// 에서 같은 방향으로 몇 분 더/덜 걸으면 닿는다는 뜻이라 완전한 허구는
// 아니고, 차이가 아주 작을 때만(2분 이내) 보여줘서 "바로 옆" 느낌이 실제로
// 맞을 가능성이 높은 경우만 노출한다. 카페가 없거나 조건에 맞는 곳이 없으면
// null을 반환하고, 이 경우 태그 자체를 아예 숨긴다(억지로 채우지 않음).
const MAX_PAIR_DIFF_MINUTES = 2;

export function findPairedCafe(
  place: { id: string; walk_minutes: number | null },
  cafeCandidates: PlaceLite[]
): PairedCafe | null {
  if (place.walk_minutes == null) return null;

  let best: { name: string; diff: number } | null = null;
  for (const c of cafeCandidates) {
    if (c.id === place.id || c.walk_minutes == null) continue;
    const diff = Math.abs(c.walk_minutes - place.walk_minutes);
    if (diff > MAX_PAIR_DIFF_MINUTES) continue;
    if (!best || diff < best.diff || (diff === best.diff && c.name < best.name)) {
      best = { name: c.name, diff };
    }
  }
  if (!best) return null;
  // 차이가 0분이어도 "도보 0분"이라고 쓰면 어색하니 최소 1분으로 표시한다.
  return { name: best.name, walkMinutes: best.diff === 0 ? 1 : best.diff };
}
