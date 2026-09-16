// recommend-queries.ts(서버 전용, lib/db 의존)와 완전히 분리된 순수 상수/타입
// 모음. 클라이언트 컴포넌트(recommend-input.tsx, decide-button.tsx)는 반드시
// 이 파일에서만 import해야 한다 — feed-display.ts와 같은 이유로,
// recommend-queries.ts를 클라이언트에서 import하면 lib/db.ts의 neon() 호출이
// 브라우저 번들에 딸려 들어가 즉시 깨진다.

// 2026-09-16(19차): "실속 있는 곳 약 30곳" 정예화 + 경쟁 앱 차별화 요청으로
// 조건 추천을 3단계(상황/시간/예산)에서 2단계(상황/시간)로 압축한다.
// - [클라이언트/임원 접대(룸)]는 완전히 삭제 — 사용자 요청이 "완전 삭제"로
//   명시적이었고, 예산 질문과 마찬가지로 이 값을 쓰는 코드(facilityHighlight의
//   룸 배지, purposeForLog의 client 매핑)까지 전부 걷어냈다. 다만
//   places.has_room / max_party_size 컬럼과 place-detail 화면의 룸 정보
//   표시는 그대로 둔다 — "조건 추천에서 접대 옵션을 없앤다"는 것과
//   "장소 데이터에서 룸 정보 자체를 지운다"는 건 다른 요청이라 후자까지
//   건드리진 않았다.
// - [1인 예산] 질문 자체를 삭제 — PriceBudgetKey/PRICE_BUDGET_OPTIONS/
//   isPriceBudget을 이 파일에서 완전히 제거했다(하위 호환용으로 남겨두지
//   않음 — "완전히 삭제해줘"라는 요청을 그대로 반영). recommend-queries.ts,
//   recommend-input.tsx, decide-button.tsx, page.tsx, actions.ts 전부
//   price_budget 관련 코드를 함께 제거했다.
export type Situation = "hearty" | "light" | "hotplace" | "remote";
export type TimeBudgetKey = "45" | "90";

export const SITUATION_OPTIONS: { value: Situation; label: string; desc: string }[] = [
  { value: "hearty", label: "🍲 든든한 국물/한식 충전", desc: "국밥, 찌개, 백반" },
  { value: "light", label: "🥗 가벼운 점심/식단", desc: "샐러드, 포케, 국수" },
  { value: "hotplace", label: "🌮 20대 힙지로 핫플", desc: "타코, 파스타, 핫플레이스" },
  { value: "remote", label: "💻 외근 & 노트북 작업", desc: "콘센트, 조용한 카페" },
];

// 2026-09-16(16차): "KPR의 점심시간은 90분이다" 컨셉 — 기존 3단계(40/50/80분)를
// 걷어내고 실제 사내 제도(90분 점심)에 맞춘 2단계로 정리. "90"을 기본값으로
// 민다(recommend-input.tsx의 초기 state 참고). 로직(timeBudgetMinutes 계산,
// recommend-queries.ts의 필터링)은 그대로 재사용 — 값만 바뀜.
export const TIME_BUDGET_OPTIONS: { value: TimeBudgetKey; minutes: number; label: string }[] = [
  { value: "90", minutes: 90, label: "⭐️ KPR 90분 풀코스 (밥+카페)" },
  { value: "45", minutes: 45, label: "⚡️ 바쁜 날 45분 컷" },
];

export function isSituation(v: string | undefined): v is Situation {
  return v === "hearty" || v === "light" || v === "hotplace" || v === "remote";
}
export function isTimeBudget(v: string | undefined): v is TimeBudgetKey {
  return v === "45" || v === "90";
}

export function timeBudgetMinutes(v: TimeBudgetKey): number {
  return TIME_BUDGET_OPTIONS.find((o) => o.value === v)!.minutes;
}
