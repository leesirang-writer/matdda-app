// "맛멋냥" 브랜드 마스코트.
// 2026-09-16: 사용자가 준비한 이미지(투명 배경 처리 완료,
// `public/cat-mascot.png`)로 교체 — 기존에는 mood별로 눈 모양이 바뀌는
// 순수 인라인 SVG였는데, 이제는 `next/image`로 그 PNG 한 장을 그대로
// 불러온다. 이미지가 하나뿐이라 mood는 더 이상 렌더링에 영향을 주지
// 않지만, 이 컴포넌트를 쓰는 곳(mascot-banner.tsx/mascot-bubble.tsx,
// recommend/page.tsx 등)이 여전히 상황별로 mood를 넘기고 있어서 그
// 호출부들을 건드리지 않도록 prop 자체는 그대로 남겨뒀다.
// (같은 날 두 번째 이미지로 재교체 — 흰색 고양이 + 요리사 모자 "C" 로고,
// 거품기·나무 숟가락을 든 2D 일러스트 스타일. 파일만 갈아끼웠고 구조는
// 동일.)
import Image from "next/image";

export type CatMood = "happy" | "curious" | "excited";

export function CatMascot({
  className,
}: {
  className?: string;
  mood?: CatMood;
}) {
  return (
    <Image
      src="/cat-mascot.png"
      alt="맛멋냥"
      width={588}
      height={550}
      className={`${className ?? ""} object-contain drop-shadow-sm transition-transform hover:scale-105`}
    />
  );
}
