"use client";

// PC 데스크톱 웹 포털 레이아웃의 실제 상호작용을 담당하는 클라이언트 컴포넌트.
// GNB 검색, 거리(도보) 필터, 정렬은 전부 서버에서 이미 내려받은 places 배열
// 안에서만 동작하는 "클라이언트 사이드 재가공"이다 (DB 재조회 없음). 축(맛따라/
// 멋따라)과 상황 필터(가성비 점심/힙지로 트렌드 등)는 여전히 서버가 URL
// searchParams로 걸러서 내려주는 값이라, 여기서는 그 두 필터를 위한 <Link>만
// 그리고 실제 필터링은 하지 않는다.
//
// 반드시 ./feed-display 에서만 표시용 헬퍼를 가져온다 — ./feed-queries를
// import하면 lib/db.ts의 neon() 호출이 브라우저 번들에 끼어들어가 즉시 깨진다.
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import styles from "./feed.module.css";
import {
  displayCategory,
  thumbnailFor,
  trendyBadgeLabel,
  inferVotePurpose,
  findPairedCafe,
  mealWeightFor,
  IMAGE_FALLBACK_PLACEHOLDER,
  type FeedPlace,
  type PlaceLite,
  type PairedCafe,
  type MealWeight,
} from "./feed-display";
import { castQuickVote } from "./feed-vote-actions";
import { QuickTipModal } from "./quick-tip-modal";

export type AxisTab = {
  value: "food" | "style";
  label: string;
  sub: string;
  href: string;
  active: boolean;
};

export type FilterTab = {
  value: string;
  label: string;
  href: string;
  active: boolean;
};

type SortKey = "distance" | "again_rate" | "price";
type DistanceKey = "near" | "far";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "distance", label: "거리 가까운 순" },
  { value: "again_rate", label: "재방문율 높은 순" },
  { value: "price", label: "가격 낮은 순" },
];

// 2026-09-16(18차): 3단계(5분/6~10분/11~15분)였던 거리 필터를 사용자 요청으로
// 2단계로 단순화 — "회사 바로 앞"이냐 "그 밖(힙지로·명동 산책 포함)"이냐만
// 직관적으로 나눈다. "far"는 상한을 두지 않고(Infinity 대신 충분히 큰
// 값 999) 6분 이상을 전부 포함한다.
const DISTANCE_OPTIONS: { value: DistanceKey; min: number; max: number; label: string }[] = [
  { value: "near", min: 1, max: 5, label: "⚡️ 도보 5분 컷 (회사 바로 앞)" },
  { value: "far", min: 6, max: 999, label: "🚶 도보 6분+ (힙지로·명동 산책)" },
];

export default function FeedBrowser({
  axis,
  filter,
  axisTabs,
  filterTabs,
  places,
  reviewCount,
  emptyMessages,
  allPlaces,
}: {
  axis: "food" | "style";
  filter: string;
  axisTabs: AxisTab[];
  filterTabs: FilterTab[];
  places: FeedPlace[];
  reviewCount: number;
  emptyMessages: string[];
  /** GNB "꿀팁 제보하기"가 장소를 직접 검색할 수 있게 넘기는 전체 목록. */
  allPlaces: PlaceLite[];
}) {
  const [query, setQuery] = useState("");
  const [distance, setDistance] = useState<DistanceKey | null>(null);
  const [sort, setSort] = useState<SortKey>("distance");
  const [mealWeight, setMealWeight] = useState<MealWeight | null>(null);
  const [gnbTipOpen, setGnbTipOpen] = useState(false);

  // "든든한 점심"(food/lunch)을 보고 있을 때만 그날 컨디션에 맞춘 가벼운/든든한
  // 한 끼 서브 필터를 노출한다 — 다른 상황(가벼운 점심/힙지로 트렌드/멋따라)에서는
  // 굳이 물을 필요가 없는 조건이라 칩 자체를 숨긴다(2026-09-08, 9차 도입분을
  // 18차 정리 과정에서 복원).
  const isLunchFilter = axis === "food" && filter === "lunch";

  // 2026-09-16(18차): "맛따라+멋따라" 카드 하단 "☕️ 추천 코스" 태그용 카페
  // 후보 — allPlaces(GNB 꿀팁 검색용으로 이미 받아온 전체 목록)에서
  // 카페(cafe/both)이면서 도보시간을 아는 곳만 추린다. 새 쿼리 없이 이미
  // 있는 데이터로 계산.
  const cafeCandidates = useMemo(
    () =>
      allPlaces.filter(
        (p) => (p.place_type === "cafe" || p.place_type === "both") && p.walk_minutes != null
      ),
    [allPlaces]
  );

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const distRange = distance
      ? DISTANCE_OPTIONS.find((d) => d.value === distance) ?? null
      : null;

    let list = places.filter((p) => {
      if (
        distRange &&
        (p.walk_minutes == null || p.walk_minutes < distRange.min || p.walk_minutes > distRange.max)
      ) {
        return false;
      }
      if (isLunchFilter && mealWeight && mealWeightFor(p) !== mealWeight) {
        return false;
      }
      if (!q) return true;
      const haystack = [p.name, p.signature_menu ?? "", p.category ?? ""]
        .join(" ")
        .toLowerCase();
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

  const serverEmpty = places.length === 0;
  const clientEmpty = !serverEmpty && filteredSorted.length === 0;

  return (
    <div className={styles.page}>
      <header className={styles.gnb}>
        <Link href="/" className={styles.gnbBrand}>
          <span className={styles.gnbLogo}>
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <rect width="200" height="200" fill="#6C4CD8" />
              <path
                d="M20 100 C20 100 17 106 18 113 A82 74 0 0 0 182 113 C183 106 180 100 180 100"
                stroke="#ffffff"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M32 114 L49.5 52.7 Q52 44 55.8 52.2 L72.2 87.8 Q76 96 79.7 87.8 L96.3 50.2 Q100 42 101.5 50.9 L112 114"
                stroke="#ffffff"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M98 114 L113.5 60.6 Q116 52 119.3 60.4 L130.7 89.6 Q134 98 136.7 89.4 L147.3 56.6 Q150 48 151.6 56.9 L162 114"
                stroke="#ffffff"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className={styles.gnbTitle}>맛따라 멋따라</span>
        </Link>

        <div className={styles.gnbSearchWrap}>
          <span className={styles.gnbSearchIcon}>🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="식당 이름, 대표 메뉴, 카테고리로 검색"
            className={styles.gnbSearchInput}
          />
        </div>

        <div className={styles.gnbRight}>
          <nav className={styles.gnbTabs}>
            <span className={styles.gnbTabBtnActive}>둘러보기</span>
            <Link href="/recommend" className={styles.gnbTabBtnRecommend}>
              조건 추천
              <span className={styles.recommendBadge}>✨ 90분 코스</span>
            </Link>
          </nav>
          <button
            type="button"
            className={styles.gnbWriteBtn}
            onClick={() => setGnbTipOpen(true)}
          >
            ✍️ 꿀팁 제보하기
          </button>
          <Link href="/admin" className={styles.gnbAdminLink} aria-label="관리자">
            ⚙️
          </Link>
        </div>
      </header>

      <div className={styles.taglineBar}>
        어떻게 사람이 밥만 먹고 살아요? KPR 총무팀이 엄선한 90분 점심·커피 큐레이션 가이드
      </div>

      {gnbTipOpen && (
        <QuickTipModal allPlaces={allPlaces} onClose={() => setGnbTipOpen(false)} />
      )}

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <Link href="/recommend" className={styles.recommendBanner}>
            <span className={styles.recommendBannerText}>
              오늘 점심 뭐 먹지?
              <br />
              KPR 90분 밥+카페 풀코스 추천받기
            </span>
            <span className={styles.recommendBannerArrow}>➔</span>
          </Link>

          <div className={styles.sidebarCard}>
            <div className={styles.sidebarTitle}>카테고리</div>
            <div className={styles.axisSwitch}>
              {axisTabs.map((a) => (
                <Link
                  key={a.value}
                  href={a.href}
                  className={a.active ? styles.axisBtnActive : styles.axisBtn}
                  data-axis={a.value}
                >
                  {a.label}
                  <span className={styles.axisBtnSub}>{a.sub}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.sidebarCard}>
            <div className={styles.sidebarTitle}>어떤 상황인가요?</div>
            <div className={styles.filterList}>
              {filterTabs.map((f) => (
                <div key={f.value} className={styles.filterItem}>
                  <Link
                    href={f.href}
                    className={f.active ? styles.filterBtnActive : styles.filterBtn}
                  >
                    {f.label}
                  </Link>
                  {/* '든든한 점심'이 켜져 있을 때만: 그날 컨디션에 맞춰 가벼운 한 끼 /
                      든든한 한 끼로 더 좁혀볼 수 있는 서브 필터. 토글이라 한 번 더
                      누르면 해제된다. */}
                  {isLunchFilter && f.value === "lunch" && f.active && (
                    <div className={styles.mealWeightChips}>
                      <button
                        type="button"
                        onClick={() => setMealWeight((cur) => (cur === "light" ? null : "light"))}
                        className={mealWeight === "light" ? styles.chipActive : styles.chip}
                      >
                        🥗 가볍게
                      </button>
                      <button
                        type="button"
                        onClick={() => setMealWeight((cur) => (cur === "hearty" ? null : "hearty"))}
                        className={mealWeight === "hearty" ? styles.chipActive : styles.chip}
                      >
                        🍲 든든하게
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.sidebarCard}>
            <div className={styles.sidebarTitle}>회사에서 거리</div>
            <div className={styles.filterList}>
              {DISTANCE_OPTIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDistance((cur) => (cur === d.value ? null : d.value))}
                  className={distance === d.value ? styles.filterBtnActive : styles.filterBtn}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className={styles.main}>
          <div className={styles.mainHeaderRow}>
            <div className={styles.resultCount}>
              등록 장소 <strong>{filteredSorted.length}곳</strong>
              <span className={styles.resultCountSub}>· 리뷰 {reviewCount}건</span>
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className={styles.sortSelect}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {serverEmpty && (
            <div className={styles.emptyState}>
              {emptyMessages.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}

          {clientEmpty && (
            <div className={styles.emptyState}>
              <p>검색 조건에 맞는 장소가 없어요.</p>
              <p>검색어나 거리 필터를 바꿔보세요.</p>
            </div>
          )}

          {!serverEmpty && !clientEmpty && (
            <div className={styles.grid}>
              {filteredSorted.map((p) => (
                <FeedCard
                  key={p.id}
                  place={p}
                  axis={axis}
                  filter={filter}
                  pairedCafe={axis === "food" ? findPairedCafe(p, cafeCandidates) : null}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function FeedCard({
  place,
  axis,
  filter,
  pairedCafe,
}: {
  place: FeedPlace;
  axis: "food" | "style";
  filter: string;
  /** "☕️ 추천 코스" 태그 — food 축 카드에서만 계산해서 넘어온다(없으면 숨김). */
  pairedCafe: PairedCafe | null;
}) {
  const hasReviews = place.review_count > 0;
  const showClientBadges = axis === "food" && filter === "client";
  const showStyleBadges = axis === "style" && (filter === "remote" || filter === "quiet");
  const votePurpose = inferVotePurpose(axis, filter);

  // 2026-09-16(17차): "빈집" 느낌을 주던 "아직 리뷰 없음" 문구를 없애고,
  // 리뷰가 아직 없어도 줄 수 있는 긍정적 신호를 순서대로 시도한다 —
  // ① 목적별 상세 리뷰가 있으면 기존처럼 재방문율, ② 없으면 관리자가 켠
  // "총무팀 픽"(1차 검증 신뢰 신호), ③ 그것도 없으면 원터치 반응 수(장소
  // 전체 기준)라도 있으면 그걸 보여준다. 셋 다 없으면 배지 없이 도보시간만
  // (부정적인 문구를 억지로 채우지 않음).
  const [voted, setVoted] = useState<"again" | "no" | null>(null);
  const [againCount, setAgainCount] = useState(place.again_count);
  const [noCount, setNoCount] = useState(place.no_count);
  const [pending, startTransition] = useTransition();
  const [tipOpen, setTipOpen] = useState(false);
  // 원본 썸네일(관리자 지정 이미지 → 리뷰 사진 → 카테고리 기본 이미지) 로딩이
  // 실패하면(끊긴 링크, 네트워크 오류 등) 로컬 fallback으로 한 번만 전환한다.
  const [imgSrc, setImgSrc] = useState(thumbnailFor(place));

  function handleVote(v: "again" | "no") {
    if (voted || pending) return;
    setVoted(v);
    if (v === "again") setAgainCount((n) => n + 1);
    else setNoCount((n) => n + 1);
    startTransition(async () => {
      // 실패해도 화면엔 이미 반영돼 있고, 가벼운 반응 하나 유실되는 것보다
      // 로딩 상태로 붙잡아두는 게 더 나쁘다고 판단해 결과를 별도로 되돌리지
      // 않는다 — 다음 새로고침 때 서버 값으로 자연스럽게 맞춰진다.
      await castQuickVote(place.id, votePurpose, v);
    });
  }

  const body = (
    <>
      <div className={styles.cardThumbWrap}>
        <img
          src={imgSrc}
          alt=""
          className={styles.cardThumb}
          loading="lazy"
          onError={() => setImgSrc(IMAGE_FALLBACK_PLACEHOLDER)}
        />
        {place.is_trendy && (
          <span className={styles.badgeTrendyFloating}>{trendyBadgeLabel(place)}</span>
        )}
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <span className={styles.cardName}>{place.name}</span>
          <span className={styles.cardCat}>{displayCategory(place)}</span>
        </div>

        {place.signature_menu && (
          <span className={styles.signatureMenuBadge}>대표: {place.signature_menu}</span>
        )}

        <div className={styles.cardMeta}>
          <span>📍 {place.road_address ?? "주소 정보 없음"}</span>
          {place.phone && <span>☎️ {place.phone}</span>}
        </div>

        <div className={styles.badges}>
          <span className={styles.badge}>도보 {place.walk_minutes ?? "?"}분</span>
          {hasReviews ? (
            <span className={styles.badgeAccent}>재방문율 {place.again_rate ?? 0}%</span>
          ) : place.is_staff_pick ? (
            <span className={styles.badgeStaffPick}>🎖️ 총무팀 픽</span>
          ) : place.again_count > 0 ? (
            <span className={styles.badgeAccent}>🔥 또 갈래요 {place.again_count}명</span>
          ) : null}
          {showClientBadges && place.has_room && <span className={styles.badge}>룸 있음</span>}
          {showClientBadges && place.max_party_size != null && (
            <span className={styles.badge}>최대 {place.max_party_size}명</span>
          )}
          {showStyleBadges && place.has_outlet && (
            <span className={styles.badge}>콘센트 있음</span>
          )}
          {showStyleBadges && place.is_quiet && <span className={styles.badge}>조용함</span>}
          {showStyleBadges && place.long_stay_ok && (
            <span className={styles.badge}>장시간 가능</span>
          )}
        </div>

        {pairedCafe && (
          <div className={styles.pairedCafeTag}>
            ☕️ 추천 코스: {pairedCafe.name} (도보 {pairedCafe.walkMinutes}분)
          </div>
        )}
      </div>
    </>
  );

  // 카카오맵 링크는 리뷰 유무·통계와 무관하게 모든 카드 하단에 항상 노출한다
  // (예전엔 리뷰가 있으면 카드 전체가 <Link>가 되면서 그 안에 카카오맵 <a>를
  // 중첩할 수 없어 링크가 사라졌었다 — 그래서 클릭 가능 영역과 하단 푸터를
  // 완전히 분리해서 두 상태 모두 같은 구조를 쓰도록 정리함). 2026-09-16
  // (17차)부터 푸터가 통계 줄 + 원터치 반응 줄, 두 줄로 늘어났다.
  return (
    <>
      <div className={styles.card}>
        <Link href={`/places/${place.id}`} className={styles.cardClickArea}>
          {body}
        </Link>
        <div className={styles.cardFooter}>
          <div className={styles.cardFooterTop}>
            {place.kakao_url ? (
              <a
                className={styles.mapLink}
                href={place.kakao_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                카카오맵에서 보기 ↗
              </a>
            ) : (
              <span />
            )}
            {hasReviews ? (
              <span className={styles.footerStats}>
                1인 평균{" "}
                {place.avg_price_per_person != null
                  ? `${place.avg_price_per_person.toLocaleString()}원`
                  : "정보 없음"}
                {" · "}참여 {place.review_count}건
              </span>
            ) : place.is_staff_pick ? (
              <span className={styles.footerStats}>총무팀이 1차 확인한 곳이에요</span>
            ) : (
              <span className={styles.footerStats}>아직 상세 팁 전이에요</span>
            )}
          </div>

          <div className={styles.voteRow}>
            <button
              type="button"
              className={`${styles.voteButton} ${styles.voteButtonAgain} ${
                voted === "again" ? styles.voted : ""
              }`}
              disabled={!!voted || pending}
              onClick={() => handleVote("again")}
            >
              🔥 또 갈래요{againCount > 0 ? ` (${againCount})` : ""}
            </button>
            <button
              type="button"
              className={`${styles.voteButton} ${voted === "no" ? styles.voted : ""}`}
              disabled={!!voted || pending}
              onClick={() => handleVote("no")}
            >
              🤔 굳이{noCount > 0 ? ` (${noCount})` : ""}
            </button>
            <button type="button" className={styles.tipLink} onClick={() => setTipOpen(true)}>
              + 꿀팁
            </button>
          </div>
        </div>
      </div>

      {/* .card:hover에 걸린 transform 때문에 모달을 카드 "안"에 두면 그
          transform이 생기는 순간 position:fixed의 기준이 뷰포트가 아니라
          카드 박스로 바뀌어 버린다(호버 중인 카드 위에서 "+ 꿀팁"을 눌렀을
          때 전체 화면 오버레이가 카드 크기로 쪼그라드는 버그 — 로컬
          Playwright 검증 중 실제로 재현해서 발견). 그래서 모달은 반드시
          .card의 형제(sibling)로 렌더링해야 한다. */}
      {tipOpen && (
        <QuickTipModal
          placeId={place.id}
          placeName={place.name}
          purpose={votePurpose}
          onClose={() => setTipOpen(false)}
        />
      )}
    </>
  );
}
