"use client";

// 2026-09-16(19차): 사이드바 최하단 "🏆 KPR 주간 랭킹 TOP 5" 위젯. 데이터는
// page.tsx가 ranking-queries.ts(서버 전용)로 미리 받아와 props로 내려주고,
// 이 컴포넌트는 밥집/카페 탭 전환(클라이언트 상태)만 담당한다 — 다른
// 클라이언트 컴포넌트들과 같은 서버/클라이언트 분리 원칙.
import Link from "next/link";
import { useState } from "react";
import styles from "../feed.module.css";
import type { RankingItem } from "../ranking-display";

const RANK_BADGES = ["🥇", "🥈", "🥉", "4", "5"];

export function WeeklyRanking({
  mealItems,
  cafeItems,
}: {
  mealItems: RankingItem[];
  cafeItems: RankingItem[];
}) {
  const [tab, setTab] = useState<"meal" | "cafe">("meal");
  const items = tab === "meal" ? mealItems : cafeItems;

  return (
    <div className={styles.sidebarCard}>
      <div className={styles.sidebarTitle}>🏆 KPR 주간 랭킹 TOP 5</div>
      <p className={styles.rankingSubtitle}>동료들의 &apos;또 갈래요&apos; 투표 기준</p>
      <div className={styles.rankingTabs}>
        <button
          type="button"
          className={tab === "meal" ? styles.rankingTabActive : styles.rankingTab}
          onClick={() => setTab("meal")}
        >
          🍚 밥집 TOP 5
        </button>
        <button
          type="button"
          className={tab === "cafe" ? styles.rankingTabActive : styles.rankingTab}
          onClick={() => setTab("cafe")}
        >
          ☕️ 카페 TOP 5
        </button>
      </div>

      {items.length === 0 ? (
        <p className={styles.rankingEmpty}>아직 이번 주 데이터가 없어요.</p>
      ) : (
        <ol className={styles.rankingList}>
          {items.map((item, i) => (
            <li key={item.id}>
              <Link href={`/places/${item.id}`} className={styles.rankingRow}>
                <span className={styles.rankingBadge}>{RANK_BADGES[i]}</span>
                <span className={styles.rankingInfo}>
                  <span className={styles.rankingName}>{item.name}</span>
                  <span className={styles.rankingMeta}>
                    {item.walk_minutes != null ? `도보 ${item.walk_minutes}분` : "도보시간 정보 없음"}
                    {item.signature_menu ? ` · ${item.signature_menu}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
