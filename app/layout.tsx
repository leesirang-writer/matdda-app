import type { Metadata } from "next";
import "./globals.css";

// 2026-09-08(10차): 사용자 요청으로 "캐치테이블/토스" 스타일의 깔끔한
// 모던 미니멀 디자인으로 전환하면서, 폰트도 next/font/google(Geist)
// 대신 Pretendard 웹폰트(jsdelivr CDN)로 교체함. next/font/google과
// 달리 이 방식은 빌드 타임이 아니라 브라우저가 직접 CSS를 내려받는
// 방식이라, 배포 시 네트워크 이슈가 없고 폰트 로딩도 더 가벼움.
// (참고: 이전 라운드에서 next/font/google 때문에 겪었던 샌드박스
// 빌드 네트워크 제한 문제도 이걸로 자연스럽게 해소됨.)

export const metadata: Metadata = {
  title: "맛따라 멋따라",
  description: "KPR 사내 미식·감성 큐레이션 — 사진과 숏리뷰로 찐맛집을 찾는다",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
