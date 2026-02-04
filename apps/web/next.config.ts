import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // React Compiler는 개발 환경에서만 활성화 (프로덕션 빌드 안정성)
  reactCompiler: process.env.NODE_ENV === 'development',
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
