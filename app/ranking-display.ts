// ranking-queries.ts(서버 전용, lib/db 의존)와 완전히 분리된 순수 타입 모음.
// 사이드바 위젯(components/weekly-ranking.tsx)은 반드시 이 파일에서만
// import해야 한다 — 다른 *-display.ts 파일들과 같은 이유.

export type RankingKind = "meal" | "cafe";

export type RankingItem = {
  id: string;
  name: string;
  walk_minutes: number | null;
  signature_menu: string | null;
  /** 최근 7일간 "🔥 또 갈래요" 원터치 반응 수 — 사용자가 요청한 "투표 수". */
  again_count: number;
  again_rate: number | null;
  review_count: number;
};
