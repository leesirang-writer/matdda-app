import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  images: {
    // 리뷰 사진이 없는 장소의 기본 이미지(Unsplash)와, 실제 업로드된 리뷰/장소
    // 사진(Vercel Blob)을 next/image로 최적화(WebP 변환 + lazy loading)하려면
    // 두 호스트 모두 명시적으로 허용해야 한다.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
