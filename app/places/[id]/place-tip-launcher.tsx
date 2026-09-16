"use client";

// 2026-09-16(17차): 상세 페이지 하단 CTA를 "리뷰 남기기"(→ /reviews/new 무거운
// 폼)에서 "15초 꿀팁 제보" 모달로 바꾼다. 이 페이지는 place_type은 알지만
// axis/filter 컨텍스트(둘러보기 사이드바에서 뭘 보다가 왔는지)는 모르므로,
// feed-browser.tsx의 카드와 달리 purpose는 place_type 기준으로 추정한다
// (카페면 cafe, 아니면 lunch) — QuickTipModal의 "장소를 이미 알 때" 흐름을
// 그대로 재사용.
import { useState } from "react";
import styles from "./place-detail.module.css";
import { QuickTipModal } from "@/app/quick-tip-modal";
import type { VotePurpose } from "@/app/feed-display";

export default function PlaceTipLauncher({
  placeId,
  placeName,
  placeType,
}: {
  placeId: string;
  placeName: string;
  placeType: "meal" | "cafe" | "both";
}) {
  const [open, setOpen] = useState(false);
  const purpose: VotePurpose = placeType === "cafe" ? "cafe" : "lunch";

  return (
    <>
      <button type="button" className={styles.ctaBar} onClick={() => setOpen(true)}>
        ✍️ 15초 꿀팁 남기기
      </button>
      {open && (
        <QuickTipModal
          placeId={placeId}
          placeName={placeName}
          purpose={purpose}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
