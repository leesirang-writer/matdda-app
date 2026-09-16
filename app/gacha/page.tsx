import Link from "next/link";
import styles from "./gacha.module.css";
import { MascotBubble } from "../components/mascot-bubble";
import { GachaMachine } from "./gacha-machine";

// 2026-09-16(19차): "오늘 메뉴 고르기 너무 귀찮을 때" 원클릭으로 90분
// 밥+카페 코스를 뽑아주는 전용 가챠 페이지. 실제 뽑기 로직/애니메이션은
// 클라이언트 컴포넌트(gacha-machine.tsx)가 맡고, 이 페이지는 정적인
// 헤더/마스코트 인사말만 서버에서 렌더링한다.
export default function GachaPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          ← 둘러보기
        </Link>
        <h1 className={styles.title}>오늘 랜덤 여기는 어떠냥?!</h1>
        <span />
      </header>

      <MascotBubble
        mood="excited"
        message="오늘 메뉴 고르기 너무 귀찮냥? KPR 90분 밥+카페 완벽 코스를 내가 대신 뽑아주겠다냥! 🐾"
      />

      <GachaMachine />
    </div>
  );
}
