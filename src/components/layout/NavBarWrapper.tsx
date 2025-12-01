'use client';

import { usePathname } from 'next/navigation';

export default function NavBarWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLandingPage = pathname === '/';

    if (isLandingPage) {
        return null;
    }

    return <>{children}</>;
}
