/**
 * Container Route Group Layout
 *
 * NavBar + 공통 레이아웃 컨테이너를 적용하여 모든 하위 페이지(projects, posts 등)가
 * 동일한 마진과 패딩을 가지도록 합니다.
 * ErrorBoundary로 감싸 컴포넌트 에러 시 앱 전체 크래시를 방지합니다.
 */
import { Suspense } from 'react';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import NavBar from '@/shared/components/layout/NavBar';
import LoadingBar from '@/shared/components/ui/LoadingBar';
import { GlobalChatbot } from '@/features/ai-chat/view/global/GlobalChatbot';

export default function ContainerLayout({
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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
                </div>
            </main>
            <Suspense fallback={null}>
                <GlobalChatbot />
            </Suspense>
        </>
    );
}
