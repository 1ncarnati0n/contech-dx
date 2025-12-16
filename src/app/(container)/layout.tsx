/**
 * Container Route Group Layout
 *
 * 공통 레이아웃 컨테이너를 적용하여 모든 하위 페이지(projects, posts 등)가
 * 동일한 마진과 패딩을 가지도록 합니다.
 * ErrorBoundary로 감싸 컴포넌트 에러 시 앱 전체 크래시를 방지합니다.
 */
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function ContainerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <ErrorBoundary>
                {children}
            </ErrorBoundary>
        </div>
    );
}
