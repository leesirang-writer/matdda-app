"use client";

// 결과 카드마다 붙는 "🎯 오늘 여기로 결정!" 버튼. 반드시 recommend-display.ts
// 에서만 타입을 가져온다 — recommend-queries.ts는 lib/db.ts에 의존해서
// 클라이언트 번들에 섞이면 즉시 깨진다. 서버 액션(decideRecommendation)은
// "use server" 함수라 Next.js가 알아서 RPC 스텁으로 바꿔주므로 여기서
// 직접 import해도 안전하다.
import { useState, useTransition } from "react";
import styles from "./recommend.module.css";
import { decideRecommendation } from "./actions";
import type { Situation, TimeBudgetKey, PriceBudgetKey } from "./recommend-display";

export default function DecideButton({
  situation,
  timeBudget,
  priceBudget,
  placeId,
  placeType,
  recommendedIds,
}: {
  situation: Situation;
  timeBudget: TimeBudgetKey;
  priceBudget: PriceBudgetKey;
  placeId: string;
  placeType: string;
  recommendedIds: string[];
}) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (done) {
    return <div className={styles.decidedBadge}>✅ 오늘은 여기로 결정했어요!</div>;
  }

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        className={styles.decideButton}
        onClick={() => {
          setError(false);
          const fd = new FormData();
          fd.set("situation", situation);
          fd.set("time_budget", timeBudget);
          fd.set("price_budget", priceBudget);
          fd.set("selected_place_id", placeId);
          fd.set("place_type", placeType);
          fd.set("recommended_place_ids", recommendedIds.join(","));
          startTransition(async () => {
            const res = await decideRecommendation(fd);
            if (res.ok) setDone(true);
            else setError(true);
          });
        }}
      >
        {isPending ? "저장 중..." : "🎯 오늘 여기로 결정!"}
      </button>
      {error && <p className={styles.decideError}>기록 저장에 실패했어요. 다시 눌러주세요.</p>}
    </div>
  );
}
