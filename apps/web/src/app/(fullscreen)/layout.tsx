/**
 * Fullscreen Route Group Layout
 *
 * 전체 화면 페이지용 레이아웃입니다.
 * NavBar는 포함하되, 컨테이너 마진/패딩 없이 전체 화면을 사용합니다.
 */
import { Suspense } from 'react';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import NavBar from '@/shared/components/layout/NavBar';
import LoadingBar from '@/shared/components/ui/LoadingBar';
import { GlobalChatbot } from '@/features/ai-chat/view/global/GlobalChatbot';

export default function FullscreenLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Suspense fallback={null}>
                <LoadingBar />
            </Suspense>
            <NavBar />
            <main className="pt-16 min-h-screen text-foreground">
                <ErrorBoundary>
                    {children}
                </ErrorBoundary>
            </main>
            <Suspense fallback={null}>
                <GlobalChatbot />
            </Suspense>
        </>
    );
}
