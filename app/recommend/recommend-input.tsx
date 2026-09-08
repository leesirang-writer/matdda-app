"use client";

// 조건 입력 화면. recommend-display.ts(순수 상수)만 import — 이유는
// decide-button.tsx 상단 주석과 동일.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./recommend.module.css";
import {
  SITUATION_OPTIONS,
  TIME_BUDGET_OPTIONS,
  PRICE_BUDGET_OPTIONS,
  type Situation,
  type TimeBudgetKey,
  type PriceBudgetKey,
} from "./recommend-display";

export default function RecommendInput() {
  const router = useRouter();
  const [situation, setSituation] = useState<Situation | null>(null);
  const [timeBudget, setTimeBudget] = useState<TimeBudgetKey | null>(null);
  const [priceBudget, setPriceBudget] = useState<PriceBudgetKey | null>(null);

  const canSubmit = situation && timeBudget && priceBudget;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          ← 둘러보기
        </Link>
        <h1 className={styles.title}>조건 추천</h1>
        <span />
      </header>

      <p className={styles.inputIntro}>
        상황·허용 시간·예산 세 가지만 골라주세요. 왕복 도보시간과 사내 리뷰
        데이터를 계산해서 오늘 복귀 시간까지 딱 맞춰드릴게요.
      </p>

      <section className={styles.inputSection}>
        <div className={styles.inputSectionTitle}>1. 오늘은 어떤 상황인가요?</div>
        <div className={styles.optionGrid}>
          {SITUATION_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setSituation(o.value)}
              className={situation === o.value ? styles.optionCardActive : styles.optionCard}
            >
              <span className={styles.optionLabel}>{o.label}</span>
              <span className={styles.optionDesc}>{o.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.inputSection}>
        <div className={styles.inputSectionTitle}>2. 얼마나 여유 있으세요?</div>
        <div className={styles.optionRow}>
          {TIME_BUDGET_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setTimeBudget(o.value)}
              className={timeBudget === o.value ? styles.pillActive : styles.pill}
            >
              {o.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.inputSection}>
        <div className={styles.inputSectionTitle}>3. 1인 예산은요?</div>
        <div className={styles.optionRow}>
          {PRICE_BUDGET_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setPriceBudget(o.value)}
              className={priceBudget === o.value ? styles.pillActive : styles.pill}
            >
              {o.label}
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        disabled={!canSubmit}
        className={styles.submitButton}
        onClick={() => {
          if (!canSubmit) return;
          router.push(`/recommend?situation=${situation}&time=${timeBudget}&budget=${priceBudget}`);
        }}
      >
        {canSubmit ? "🎯 추천 받기" : "조건을 모두 골라주세요"}
      </button>
    </div>
  );
}
