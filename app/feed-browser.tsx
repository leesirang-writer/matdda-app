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
import { useMemo, useState } from "react";
import styles from "./feed.module.css";
import { simplifyCategory, thumbnailFor, trendyBadgeLabel, type FeedPlace } from "./feed-display";

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
type DistanceKey = "near" | "mid" | "far";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "distance", label: "거리 가까운 순" },
  { value: "again_rate", label: "재방문율 높은 순" },
  { value: "price", label: "가격 낮은 순" },
];

// 단순 "이하" 누적 필터가 아니라 min~max 구간 필터 — 버튼마다 겹치지 않는
// 서로 다른 식당군이 뜨도록 구간을 딱 잘라 나눴다(회사 바로 앞 스피드 식당 /
// 명동·필동 기분전환 맛집 / 을지로3가 힙지로 원정대).
const DISTANCE_OPTIONS: { value: DistanceKey; min: number; max: number; label: string }[] = [
  { value: "near", min: 1, max: 5, label: "⚡️ 도보 5분 컷 (1~5분)" },
  { value: "mid", min: 6, max: 10, label: "🚶 도보 6~10분 (600m)" },
  { value: "far", min: 11, max: 15, label: "🏃 도보 11~15분 (1km)" },
];

export default function FeedBrowser({
  axis,
  filter,
  axisTabs,
  filterTabs,
  places,
  reviewCount,
  emptyMessages,
}: {
  axis: "food" | "style";
  filter: string;
  axisTabs: AxisTab[];
  filterTabs: FilterTab[];
  places: FeedPlace[];
  reviewCount: number;
  emptyMessages: string[];
}) {
  const [query, setQuery] = useState("");
  const [distance, setDistance] = useState<DistanceKey | null>(null);
  const [sort, setSort] = useState<SortKey>("distance");

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
  }, [places, query, distance, sort]);

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
            <Link href="/recommend" className={styles.gnbTabBtn}>
              조건 추천
            </Link>
          </nav>
          <Link href="/reviews/new" className={styles.gnbWriteBtn}>
            ✍️ 사내 리뷰 작성
          </Link>
          <Link href="/admin" className={styles.gnbAdminLink} aria-label="관리자">
            ⚙️
          </Link>
        </div>
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
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
                <Link
                  key={f.value}
                  href={f.href}
                  className={f.active ? styles.filterBtnActive : styles.filterBtn}
                >
                  {f.label}
                </Link>
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
                <FeedCard key={p.id} place={p} axis={axis} filter={filter} />
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
}: {
  place: FeedPlace;
  axis: "food" | "style";
  filter: string;
}) {
  const hasReviews = place.review_count > 0;
  const showClientBadges = axis === "food" && filter === "client";
  const showStyleBadges = axis === "style" && (filter === "remote" || filter === "quiet");

  const body = (
    <>
      <div className={styles.cardThumbWrap}>
        <img src={thumbnailFor(place)} alt="" className={styles.cardThumb} loading="lazy" />
        {place.is_trendy && (
          <span className={styles.badgeTrendyFloating}>{trendyBadgeLabel(place)}</span>
        )}
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <span className={styles.cardName}>{place.name}</span>
          <span className={styles.cardCat}>{simplifyCategory(place.category)}</span>
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
          ) : (
            <span className={styles.badgePending}>아직 리뷰 없음</span>
          )}
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
      </div>
    </>
  );

  // 카카오맵 링크는 리뷰 유무·통계와 무관하게 모든 카드 하단에 항상 노출한다
  // (예전엔 리뷰가 있으면 카드 전체가 <Link>가 되면서 그 안에 카카오맵 <a>를
  // 중첩할 수 없어 링크가 사라졌었다 — 그래서 클릭 가능 영역과 하단 푸터를
  // 완전히 분리해서 두 상태 모두 같은 구조를 쓰도록 정리함).
  return (
    <div className={styles.card}>
      <Link href={`/places/${place.id}`} className={styles.cardClickArea}>
        {body}
      </Link>
      <div className={styles.cardFooter}>
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
            {" · "}리뷰 {place.review_count}건
          </span>
        ) : (
          <Link href={`/reviews/new?place_id=${place.id}`} className={styles.ctaText}>
            첫 리뷰를 남겨보세요 →
          </Link>
        )}
      </div>
    </div>
  );
}
