"use client";

// 레트로 뽑기 기계 인터랙션 카드. gacha-display.ts(순수 타입)만 import —
// gacha-actions.ts는 "use server" 파일이라 Next.js가 알아서 RPC 스텁으로
// 바꿔주므로 여기서 직접 import해도 안전하다(recommend/decide-button.tsx와
// 동일한 패턴).
import { useState, useTransition } from "react";
import Link from "next/link";
import styles from "./gacha.module.css";
import { fallbackImage } from "../feed-display";
import { spinGacha, decideGachaCourse } from "./gacha-actions";
import type { GachaResult } from "./gacha-display";

type Phase = "idle" | "spinning" | "result";

export function GachaMachine() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<GachaResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [decided, setDecided] = useState(false);
  const [decideError, setDecideError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function pull() {
    setPhase("spinning");
    setNotFound(false);
    setDecided(false);
    setDecideError(false);
    startTransition(async () => {
      const picked = await spinGacha();
      // 슬롯머신처럼 "촤라락" 도는 느낌을 주기 위해 최소 900ms는 spinning
      // 상태를 유지한다 — 실제 조회가 그보다 빨리 끝나도 결과가 너무
      // 갑자기 튀어나오지 않도록.
      await new Promise((r) => setTimeout(r, 900));
      if (!picked) {
        setNotFound(true);
        setPhase("idle");
        return;
      }
      setResult(picked);
      setPhase("result");
    });
  }

  function decide() {
    if (!result) return;
    const fd = new FormData();
    fd.set("meal_id", result.meal.id);
    if (result.cafe) fd.set("cafe_id", result.cafe.id);
    setDecideError(false);
    startTransition(async () => {
      const res = await decideGachaCourse(fd);
      if (res.ok) setDecided(true);
      else setDecideError(true);
    });
  }

  if (phase !== "result" || !result) {
    return (
      <div className={styles.machine}>
        <div className={`${styles.reelRow} ${phase === "spinning" ? styles.reelRowSpinning : ""}`}>
          <span className={styles.reelIcon}>🍽️</span>
          <span className={styles.reelIcon}>☕️</span>
          <span className={styles.reelIcon}>🎲</span>
        </div>
        <button
          type="button"
          className={styles.leverButton}
          disabled={phase === "spinning" || isPending}
          onClick={pull}
        >
          {phase === "spinning" ? "촤라락 돌아가는 중..." : "🎲 90분 코스 뽑기! (레버 당기기)"}
        </button>
        {notFound && (
          <p className={styles.notFound}>
            아직 뽑을 수 있는 밥집이 없어요. /admin에서 장소를 먼저 등록해주세요!
          </p>
        )}
      </div>
    );
  }

  const { meal, cafe } = result;
  const mealThumb = meal.image_url ?? meal.thumbnail_url ?? fallbackImage(meal.category, "meal");
  const cafeThumb = cafe
    ? cafe.image_url ?? cafe.thumbnail_url ?? fallbackImage(cafe.category, "cafe")
    : null;

  return (
    <div className={styles.machine}>
      <div className={styles.resultGrid}>
        <div className={styles.resultSlot}>
          <span className={styles.resultSlotLabel}>🍽️ 밥집 (맛따라)</span>
          <img src={mealThumb} alt="" className={styles.resultThumb} />
          <span className={styles.resultName}>{meal.name}</span>
          <span className={styles.resultMeta}>
            도보 {meal.walk_minutes}분
            {meal.signature_menu ? ` · ${meal.signature_menu}` : ""}
          </span>
        </div>

        {cafe && cafeThumb && (
          <div className={styles.resultSlot}>
            <span className={styles.resultSlotLabel}>☕️ 연계 카페 (멋따라)</span>
            <img src={cafeThumb} alt="" className={styles.resultThumb} />
            <span className={styles.resultName}>{cafe.name}</span>
            <span className={styles.resultMeta}>
              회사에서 도보 {cafe.walk_minutes}분
              {cafe.signature_menu ? ` · ${cafe.signature_menu}` : ""}
            </span>
          </div>
        )}
      </div>

      <div className={result.timelineWarn ? styles.timelineBannerWarn : styles.timelineBanner}>
        {result.timelineText}
      </div>

      {decided ? (
        <div className={styles.decidedBadge}>✅ 오늘은 이 코스로 결정했어요!</div>
      ) : (
        <div className={styles.resultActions}>
          <button
            type="button"
            className={styles.rerollButton}
            disabled={isPending}
            onClick={pull}
          >
            🔄 마음에 안 든다냥, 다시 돌리기!
          </button>
          <button
            type="button"
            className={styles.decideButton}
            disabled={isPending}
            onClick={decide}
          >
            🎯 오늘 점심은 이 코스로 결정!
          </button>
        </div>
      )}
      {decideError && <p className={styles.decideError}>기록 저장에 실패했어요. 다시 눌러주세요.</p>}
      {decided && (
        <Link href={`/places/${meal.id}`} className={styles.detailLink}>
          밥집 상세보기 →
        </Link>
      )}
    </div>
  );
}
