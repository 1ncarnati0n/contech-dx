/**
 * Container Route Group Layout
 *
 * 현재는 단순 passthrough로 동작합니다.
 * Root layout의 <main>에서 이미 max-w-7xl, padding 등이 적용됨.
 *
 * 향후 이 그룹에만 적용할 공통 기능이 있다면 여기에 추가:
 * - 인증 체크 wrapper
 * - 특정 그룹 전용 사이드바
 * - 그룹 전용 breadcrumb 등
 */
export default function ContainerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
