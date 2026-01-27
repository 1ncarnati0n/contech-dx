/**
 * Fullscreen Route Group Layout
 *
 * 전체 화면 페이지용 레이아웃입니다.
 * 일반 컨테이너 레이아웃의 마진/패딩 없이 전체 화면을 사용합니다.
 */
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function FullscreenLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ErrorBoundary>
            {children}
        </ErrorBoundary>
    );
}
