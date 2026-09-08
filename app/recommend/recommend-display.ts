// recommend-queries.ts(서버 전용, lib/db 의존)와 완전히 분리된 순수 상수/타입
// 모음. 클라이언트 컴포넌트(recommend-input.tsx, decide-button.tsx)는 반드시
// 이 파일에서만 import해야 한다 — feed-display.ts와 같은 이유로,
// recommend-queries.ts를 클라이언트에서 import하면 lib/db.ts의 neon() 호출이
// 브라우저 번들에 딸려 들어가 즉시 깨진다.

export type Situation = "trendy" | "client" | "speed" | "remote";
export type TimeBudgetKey = "40" | "50" | "80";
export type PriceBudgetKey = "10000" | "15000" | "30000plus";

export const SITUATION_OPTIONS: { value: Situation; label: string; desc: string }[] = [
  { value: "trendy", label: "👶 20대 동기들과 힙지로 핫플", desc: "을지로3가 힙지로 트렌드 장소 위주" },
  { value: "client", label: "👔 클라이언트/임원 접대", desc: "룸 있는 곳만" },
  { value: "speed", label: "⚡️ 스피드 식사", desc: "회사에서 가깝고 빠른 곳" },
  { value: "remote", label: "💻 외근/혼밥", desc: "조용히 앉아있기 좋은 곳" },
];

export const TIME_BUDGET_OPTIONS: { value: TimeBudgetKey; minutes: number; label: string }[] = [
  { value: "40", minutes: 40, label: "⚡️ 40분 컷" },
  { value: "50", minutes: 50, label: "🚶 50분 보통" },
  { value: "80", minutes: 80, label: "☕️ 1시간 20분 여유" },
];

export const PRICE_BUDGET_OPTIONS: { value: PriceBudgetKey; label: string }[] = [
  { value: "10000", label: "~10,000원" },
  { value: "15000", label: "~15,000원" },
  { value: "30000plus", label: "30,000원 이상" },
];

export function isSituation(v: string | undefined): v is Situation {
  return v === "trendy" || v === "client" || v === "speed" || v === "remote";
}
export function isTimeBudget(v: string | undefined): v is TimeBudgetKey {
  return v === "40" || v === "50" || v === "80";
}
export function isPriceBudget(v: string | undefined): v is PriceBudgetKey {
  return v === "10000" || v === "15000" || v === "30000plus";
}

export function timeBudgetMinutes(v: TimeBudgetKey): number {
  return TIME_BUDGET_OPTIONS.find((o) => o.value === v)!.minutes;
}
