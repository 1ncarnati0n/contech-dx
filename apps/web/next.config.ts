import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 🔥 CRITICAL FIX: React Compiler를 프로덕션에도 활성화 (성능 개선)
  // 개발 환경에만 활성화하면 프로덕션에서 최적화가 적용되지 않음
  reactCompiler: true,
  reactStrictMode: true,
  // Next.js 16: Turbopack이 기본값이므로 빈 설정 필요
  turbopack: {},
  webpack: (config, { isServer }) => {
    // 클라이언트 번들에서 Node.js 모듈 제외
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        'fs/promises': false,
      };
    }
    return config;
  },
};

export default nextConfig;
