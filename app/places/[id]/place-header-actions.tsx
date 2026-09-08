"use client";

import { useRouter } from "next/navigation";
import styles from "./place-detail.module.css";

export default function PlaceHeaderActions({ placeName }: { placeName: string }) {
  const router = useRouter();

  function handleBack() {
    // 다른 화면(피드 등)에서 들어온 이력이 있으면 뒤로가기, 없으면(예: 링크로 바로
    // 접속) 둘러보기 피드로 이동 — 링크 공유 시에도 항상 갈 곳이 있게 한다.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  async function handleShare() {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const shareData = { title: `맛따라 멋따라 - ${placeName}`, url };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // 사용자가 공유 시트를 취소한 경우 등은 조용히 무시
      }
      return;
    }

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        window.alert("이 장소 링크를 복사했어요!");
      } catch {
        // 클립보드 권한이 없는 환경 등은 조용히 무시
      }
    }
  }

  return (
    <div className={styles.headerActions}>
      <button type="button" onClick={handleBack} className={styles.iconBtn} aria-label="뒤로가기">
        ←
      </button>
      <button type="button" onClick={handleShare} className={styles.iconBtn} aria-label="공유하기">
        🔗
      </button>
    </div>
  );
}
