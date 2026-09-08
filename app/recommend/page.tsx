import Link from "next/link";
import styles from "./recommend.module.css";
import RecommendInput from "./recommend-input";
import DecideButton from "./decide-button";
import { simplifyCategory, fallbackImage } from "../feed-display";
import {
  getRecommendations,
  getPairedCafe,
  isSituation,
  isTimeBudget,
  isPriceBudget,
  timeBudgetMinutes,
  SITUATION_OPTIONS,
  TIME_BUDGET_OPTIONS,
  PRICE_BUDGET_OPTIONS,
  type Situation,
  type TimeBudgetKey,
  type PriceBudgetKey,
  type RecommendCandidate,
  type PairedCafe,
} from "./recommend-queries";

function verificationLine(c: RecommendCandidate): string {
  if (c.review_count === 0) {
    return "아직 사내 리뷰가 없어요 — 첫 리뷰를 남기면 다음 추천이 더 정확해져요.";
  }
  const dept = c.verifier_department ? `${c.verifier_department} · ` : "";
  const rate = c.again_rate != null ? `재방문율 ${c.again_rate}%` : "재방문율 집계 중";
  return `사내 검증: ${dept}${rate} (리뷰 ${c.review_count}건)`;
}

function facilityHighlight(situation: Situation, c: RecommendCandidate): string | null {
  if (situation === "client") {
    if (c.has_room && c.max_party_size) return `${c.max_party_size}인 개별 룸 완비`;
    if (c.has_room) return "개별 룸 있음";
    return null;
  }
  if (situation === "remote") {
    const bits: string[] = [];
    if (c.has_outlet) bits.push("콘센트");
    if (c.is_quiet) bits.push("조용함");
    if (c.long_stay_ok) bits.push("장시간 가능");
    return bits.length ? bits.join(" · ") : null;
  }
  if (situation === "trendy" && c.is_trendy) return "🔥 20대 트렌드 핫플";
  return null;
}

function buildTimelineBanner(
  top: RecommendCandidate
): { warn: boolean; text: string } {
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
  const waitLabel = top.has_real_wait_data ? "실측 평균" : "예상";

  if (!inLunchWindow) {
    return {
      warn: false,
      text: `⏱️ 예상 총 소요시간 ${top.total_minutes}분 (왕복 도보 ${top.round_trip_minutes}분 + ${waitLabel} 대기 ${top.wait_minutes}분 + 식사 ${top.meal_minutes}분)`,
    };
  }

  const deadline = 13 * 60; // 오후 1시 복귀 기준
  const returnAt = nowMinutes + top.total_minutes;
  const diff = deadline - returnAt;

  if (diff >= 0) {
    return {
      warn: false,
      text: `⏱️ 총 소요 시간 ${top.total_minutes}분 — 1시 회의 ${diff}분 전에 안전하게 복귀할 수 있어요!`,
    };
  }
  return {
    warn: true,
    text: `⏱️ 총 소요 시간 ${top.total_minutes}분 — 지금 출발하면 1시보다 약 ${-diff}분 늦을 수 있어요.`,
  };
}

export default async function RecommendPage({
  searchParams,
}: {
  searchParams: Promise<{ situation?: string; time?: string; budget?: string }>;
}) {
  const params = await searchParams;
  const situationOk = isSituation(params.situation);
  const timeOk = isTimeBudget(params.time);
  const budgetOk = isPriceBudget(params.budget);

  if (!situationOk || !timeOk || !budgetOk) {
    return <RecommendInput />;
  }

  const situation = params.situation as Situation;
  const timeBudget = params.time as TimeBudgetKey;
  const priceBudget = params.budget as PriceBudgetKey;
  const budgetMinutes = timeBudgetMinutes(timeBudget);

  const candidates = await getRecommendations(situation, timeBudget, priceBudget);
  const pairedCafes: (PairedCafe | null)[] = await Promise.all(
    candidates.map((c) =>
      c.place_type !== "cafe"
        ? getPairedCafe(c.id, c.walk_minutes, budgetMinutes - c.total_minutes)
        : Promise.resolve(null)
    )
  );

  const situationMeta = SITUATION_OPTIONS.find((s) => s.value === situation)!;
  const timeMeta = TIME_BUDGET_OPTIONS.find((t) => t.value === timeBudget)!;
  const priceMeta = PRICE_BUDGET_OPTIONS.find((p) => p.value === priceBudget)!;
  const recommendedIds = candidates.map((c) => c.id);
  const top = candidates[0];
  const banner = top ? buildTimelineBanner(top) : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          ← 둘러보기
        </Link>
        <h1 className={styles.title}>조건 추천 결과</h1>
        <Link href="/recommend" className={styles.retryLink}>
          다시 고르기
        </Link>
      </header>

      <div className={styles.conditionSummary}>
        {situationMeta.label} · {timeMeta.label} · {priceMeta.label}
      </div>

      {candidates.length === 0 && (
        <div className={styles.emptyState}>
          <p>조건에 맞는 곳을 아직 못 찾았어요.</p>
          <p>다른 상황이나 시간으로 다시 골라보시겠어요?</p>
          <Link href="/recommend" className={styles.retryLink}>
            조건 다시 고르기 →
          </Link>
        </div>
      )}

      {top && banner && (
        <div className={banner.warn ? styles.timelineBannerWarn : styles.timelineBanner}>
          {banner.text}
        </div>
      )}

      <div className={styles.resultList}>
        {candidates.map((c, i) => {
          const thumb = c.image_url ?? c.thumbnail_url ?? fallbackImage(c.category, c.place_type);
          const pair = pairedCafes[i];
          const highlight = facilityHighlight(situation, c);
          return (
            <div key={c.id} className={styles.resultCard}>
              <div className={styles.resultRank}>{i + 1}순위</div>
              <div className={styles.resultMain}>
                <img src={thumb} alt="" className={styles.resultThumb} loading="lazy" />
                <div className={styles.resultInfo}>
                  <div className={styles.resultTop}>
                    <span className={styles.resultName}>{c.name}</span>
                    <span className={styles.resultCat}>{simplifyCategory(c.category)}</span>
                  </div>
                  {c.signature_menu && (
                    <span className={styles.signatureMenuBadge}>대표: {c.signature_menu}</span>
                  )}
                  <div className={styles.resultMeta}>
                    <span>📍 {c.road_address ?? "주소 정보 없음"}</span>
                    {c.phone && <span>☎️ {c.phone}</span>}
                  </div>
                  <div className={styles.resultBadges}>
                    <span className={styles.badge}>도보 {c.walk_minutes}분</span>
                    <span className={styles.badge}>
                      총 {c.total_minutes}분 소요{!c.fits_time_budget ? " (허용시간 초과)" : ""}
                    </span>
                    {c.avg_price_per_person != null && (
                      <span className={styles.badge}>
                        1인 {c.avg_price_per_person.toLocaleString()}원
                        {!c.fits_price_budget ? " (예산과 다를 수 있음)" : ""}
                      </span>
                    )}
                    {highlight && <span className={styles.badgeAccent}>{highlight}</span>}
                  </div>
                  <p className={styles.verificationLine}>{verificationLine(c)}</p>
                  {c.kakao_url && (
                    <a
                      href={c.kakao_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.mapLink}
                    >
                      카카오맵에서 보기 ↗
                    </a>
                  )}
                </div>
              </div>

              {pair && (
                <div className={styles.pairCard}>
                  <span className={styles.pairLabel}>+ 식사 후 연계 코스</span>
                  <img
                    src={
                      pair.image_url ??
                      pair.thumbnail_url ??
                      fallbackImage(pair.category, "cafe")
                    }
                    alt=""
                    className={styles.pairThumb}
                    loading="lazy"
                  />
                  <div className={styles.pairInfo}>
                    <span className={styles.pairName}>{pair.name}</span>
                    <span className={styles.pairMeta}>
                      회사에서 도보 {pair.walk_minutes}분
                      {pair.signature_menu ? ` · ${pair.signature_menu}` : ""}
                    </span>
                  </div>
                </div>
              )}

              <div className={styles.decideRow}>
                <Link href={`/places/${c.id}`} className={styles.detailLink}>
                  상세보기 →
                </Link>
                <DecideButton
                  situation={situation}
                  timeBudget={timeBudget}
                  priceBudget={priceBudget}
                  placeId={c.id}
                  placeType={c.place_type}
                  recommendedIds={recommendedIds}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
