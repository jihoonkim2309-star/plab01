import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server Actions 의 기본 body size limit 은 1MB.
  // 채팅 첨부 / 측정 사진 등 파일 업로드를 위해 12MB 로 확장.
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
