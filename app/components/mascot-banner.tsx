"use client";

// 둘러보기 메인 피드 최상단에 들어가는 "맛멋냥" 배너.
// 기본 대사를 보여주다가, 고양이를 클릭하거나 마우스를 올리면(이스터에그)
// 바운스 애니메이션과 함께 3가지 대사 중 하나로 랜덤하게 바뀐다.
import { useState } from "react";
import Link from "next/link";
import { CatMascot } from "./cat-mascot";
import styles from "./mascot.module.css";

const DEFAULT_LINE = "점심 뭐 먹을지 고민이냥? 90분 안에 밥+카페 코스 짜줄게냥!";

const EASTER_EGG_LINES = [
  "오늘 90분 점심, 나만 믿고 따라와냥! 🐾",
  "밥 먹고 갈 카페까지 1분 컷으로 짜줄게냥 ☕️",
  "어떻게 사람이 밥만 먹고 살아요? 커피도 마셔야지냥!",
];

export function MascotBanner() {
  const [line, setLine] = useState(DEFAULT_LINE);
  const [bouncing, setBouncing] = useState(false);

  function triggerEasterEgg() {
    const next = EASTER_EGG_LINES[Math.floor(Math.random() * EASTER_EGG_LINES.length)];
    setLine(next);
    setBouncing(true);
    window.setTimeout(() => setBouncing(false), 550);
  }

  return (
    <div className={styles.banner}>
      <button
        type="button"
        className={`${styles.catButton} ${bouncing ? styles.bounce : ""}`}
        onClick={triggerEasterEgg}
        onMouseEnter={triggerEasterEgg}
        aria-label="맛멋냥에게 말 걸어보기"
      >
        <CatMascot mood="excited" className={styles.catBanner} />
      </button>
      <div className={styles.bannerBubble}>{line}</div>
      <Link href="/recommend" className={styles.bannerCta}>
        추천받기 ➔
      </Link>
    </div>
  );
}
