"use client";

// 2026-09-17(20차-1): 우측 하단 고정 플로팅 가챠 진입 위젯 — 사용자 요청.
// 20차에서 GNB의 "🎰 오늘 점심 가챠 뽑기!" 버튼을 없애고 /recommend 화면
// 안의 보조 링크로만 옮겼더니 "가챠 어디 갔냐"는 피드백을 받음. GNB를 다시
// 복잡하게 만들지 않으면서도 항상 눈에 띄는 별도 진입점을 만들기 위해,
// 화면 우측 하단에 항상 떠 있는 마스코트 위젯을 신설함 — 클릭하면 바로
// /gacha로 이동.
//
// 루트 레이아웃(layout.tsx)에 배치해서 모든 페이지에서 보이지만, 이미
// /gacha 페이지에 있을 때 "가챠로 가기" 버튼이 또 떠 있는 건 어색해서
// usePathname으로 그 경로에서만 숨긴다.
//
// 2026-09-17(20차-2): 위젯이 눈에 잘 안 띈다는 피드백으로 캐릭터·말풍선을
// 1.5배 확대(styles.catImage/.bubble에서 크기를 관리 — Tailwind 유틸이
// 아니라 CSS 모듈로 옮긴 이유는 아래 모바일 미디어 쿼리에서 안전하게
// 오버라이드하기 위함, 캐스케이드 순서에 기댈 필요 없게 함). 커진 크기로
// 우측 최하단 카드를 가리는 문제가 생겨서 (1) 위젯 자체의 right/bottom
// 여백을 styles.wrap에서 늘리고, (2) 피드 그리드 하단에
// padding-bottom을 추가해 스크롤 끝에서도 액션 버튼이 안 가리게 함
// (feed.module.css의 .grid 참고).
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./floating-gacha-cat.module.css";

export function FloatingGachaCat() {
  const pathname = usePathname();
  if (pathname?.startsWith("/gacha")) return null;

  return (
    <Link
      href="/gacha"
      aria-label="오늘 점심 가챠 뽑으러 가기"
      className={`${styles.wrap} group fixed z-50 flex cursor-pointer flex-col items-center`}
    >
      <span
        className={`${styles.bubble} mb-2 whitespace-nowrap rounded-full border border-purple-200 bg-white font-bold text-gray-800 shadow-lg`}
      >
        내가 골라줄까냥? 🎲
        <span className={styles.bubbleTail} aria-hidden="true" />
      </span>
      {/* 사용자가 준 이미지의 실제 비율(414×353, 정사각형 아님)을 유지한 채
          기존 80×68 대비 1.5배(120×102)로 확대함 — 실제 표시 크기(반응형
          축소 포함)는 styles.catImage에서 관리. */}
      <Image
        src="/cat-gacha.png"
        width={120}
        height={102}
        alt="오늘 점심 가챠"
        className={`${styles.catImage} drop-shadow-md transition-transform duration-200 group-hover:scale-105`}
        priority
      />
    </Link>
  );
}
