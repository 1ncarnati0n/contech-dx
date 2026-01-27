import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

// 빌드 모드 감지: DEMO=true 면 데모 앱 빌드, 아니면 라이브러리 빌드
const isDemo = process.env.DEMO === 'true';

export default defineConfig({
    plugins: [
        react(),
        // 데모 빌드 시에는 dts 플러그인 비활성화
        ...(!isDemo ? [dts({
            include: ['src/lib'],
            insertTypesEntry: true,
        })] : []),
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src/lib'),
            '@/components': resolve(__dirname, 'src/lib/components'),
            '@/hooks': resolve(__dirname, 'src/lib/hooks'),
            '@/utils': resolve(__dirname, 'src/lib/utils'),
            '@/types': resolve(__dirname, 'src/lib/types'),
            '@/store': resolve(__dirname, 'src/lib/store'),
            '@/context': resolve(__dirname, 'src/lib/context'),
            '@/services': resolve(__dirname, 'src/lib/services'),
        },
    },
    server: {
        hmr: {
            overlay: false,
        },
    },
    // 데모 빌드 시에는 라이브러리 설정 제외
    build: isDemo ? {
        outDir: 'dist-demo',
    } : {
        lib: {
            entry: resolve(__dirname, 'src/lib/index.ts'),
            name: 'SaGanttLib',
            fileName: (format) => `index.${format}.js`,
        },
        rollupOptions: {
            external: ['react', 'react-dom', 'tailwindcss'],
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                    tailwindcss: 'tailwindcss'
                },
                banner: '"use client";',
            },
        },
    },
});
