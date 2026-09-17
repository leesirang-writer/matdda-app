"use client";

// 조건 입력 화면. recommend-display.ts(순수 상수)만 import — 이유는
// decide-button.tsx 상단 주석과 동일.
//
// 2026-09-16(19차): 예산(3번) 질문을 완전히 삭제하고 2단계로 압축 —
// "충무로 점심 가격대가 대부분 비슷하다"는 사용자 판단을 반영. 직장인이
// 상황·시간 두 가지만 고르면 바로 결과가 나온다.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./recommend.module.css";
import {
  SITUATION_OPTIONS,
  TIME_BUDGET_OPTIONS,
  type Situation,
  type TimeBudgetKey,
} from "./recommend-display";

export default function RecommendInput() {
  const router = useRouter();
  const [situation, setSituation] = useState<Situation | null>(null);
  // 2026-09-16(16차): "KPR 90분 풀코스"를 기본 선택값으로 민다 — 사용자가
  // 직접 눌러서 바꾸는 게 아니라 처음부터 선택돼 있는 상태로 시작.
  const [timeBudget, setTimeBudget] = useState<TimeBudgetKey | null>("90");

  const canSubmit = situation && timeBudget;

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
        상황·허용 시간 두 가지만 골라주세요. 왕복 도보시간과 사내 리뷰
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

      <button
        type="button"
        disabled={!canSubmit}
        className={styles.submitButton}
        onClick={() => {
          if (!canSubmit) return;
          router.push(`/recommend?situation=${situation}&time=${timeBudget}`);
        }}
      >
        {canSubmit ? "🎯 추천 받기" : "조건을 모두 골라주세요"}
      </button>

      {/* 2026-09-17(20차): GNB에 따로 있던 가챠 진입 버튼을 이 화면 안으로
          옮겨왔다 — 사용자 요청("추천 버튼이 3개나 있어 난잡하다"). 상황·
          시간을 고르는 것도 귀찮은 날을 위한 대안 동선으로 아래에 배치. */}
      <Link href="/gacha" className={styles.gachaLink}>
        🎲 그냥 랜덤으로 뽑아줘 (가챠)
      </Link>
    </div>
  );
}
