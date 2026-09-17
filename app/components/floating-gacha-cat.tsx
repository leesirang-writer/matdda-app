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
      className="group fixed bottom-6 right-6 z-50 flex cursor-pointer flex-col items-center"
    >
      <span
        className={`${styles.bubble} mb-1 whitespace-nowrap rounded-full border border-purple-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 shadow-lg`}
      >
        내가 골라줄까냥? 🎲
        <span className={styles.bubbleTail} aria-hidden="true" />
      </span>
      {/* 사용자가 준 이미지의 실제 비율(414×353, 정사각형 아님)을 반영해
          height를 68로 살짝 조정했다 — width={80}/height={80} 그대로 쓰면
          고양이가 옆으로 눌려 보여서, 18차-3 마스코트 이미지 때와 같은
          기준(원본 비율 유지)으로 맞춤. */}
      <Image
        src="/cat-gacha.png"
        width={80}
        height={68}
        alt="오늘 점심 가챠"
        className="drop-shadow-md transition-transform duration-200 group-hover:scale-105"
        priority
      />
    </Link>
  );
}
