'use client';

import { usePathname } from 'next/navigation';

<<<<<<< HEAD
export default function NavBarWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isAuthPage = pathname === '/login' || pathname === '/signup';

    if (isAuthPage) {
=======
export default function NavBarWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLandingPage = pathname === '/';

    if (isLandingPage) {
>>>>>>> staging
        return null;
    }

    return <>{children}</>;
}
