// 정적인(인터랙션 없는) 마스코트 + 말풍선 조합. 서버 컴포넌트에서도 그대로
// 쓸 수 있다 — /recommend 결과 페이지의 90분 타임라인 안내, 둘러보기의
// 검색/필터 0건 화면 등 "이 상황엔 이 대사를 그냥 보여주면 되는" 자리용.
// 클릭 시 대사가 바뀌는 인터랙션이 필요한 메인 배너는 별도로
// mascot-banner.tsx(클라이언트 컴포넌트)를 쓴다.
import { CatMascot, type CatMood } from "./cat-mascot";
import styles from "./mascot.module.css";

export function MascotBubble({
  mood = "happy",
  message,
  size = "md",
}: {
  mood?: CatMood;
  message: string;
  size?: "sm" | "md";
}) {
  return (
    <div className={styles.bubbleRow}>
      <CatMascot mood={mood} className={size === "sm" ? styles.catSm : styles.catMd} />
      <div className={styles.bubble}>{message}</div>
    </div>
  );
}
