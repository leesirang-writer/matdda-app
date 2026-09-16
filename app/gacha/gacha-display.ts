// gacha-actions.ts(서버 전용, lib/db 의존)와 완전히 분리된 순수 타입 모음.
// gacha-machine.tsx(클라이언트 컴포넌트)는 반드시 이 파일에서만 타입을
// import해야 한다 — 다른 *-display.ts 파일들과 같은 이유.

export type GachaMeal = {
  id: string;
  name: string;
  category: string | null;
  signature_menu: string | null;
  walk_minutes: number;
  image_url: string | null;
  thumbnail_url: string | null;
};

export type GachaCafe = {
  id: string;
  name: string;
  walk_minutes: number;
  signature_menu: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  category: string | null;
};

export type GachaResult = {
  meal: GachaMeal;
  /** 남는 시간 안에 들어오는 카페가 없으면 null — 억지로 채우지 않는다. */
  cafe: GachaCafe | null;
  courseTotalMinutes: number;
  timelineText: string;
  timelineWarn: boolean;
};
