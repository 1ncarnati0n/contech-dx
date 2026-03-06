'use client';

import { usePathname, useSearchParams } from 'next/navigation';

export default function LoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  return (
    <div className="fixed top-16 left-0 right-0 z-[100] h-0.5 bg-transparent pointer-events-none">
      <div key={routeKey} className="route-loading-bar" />
    </div>
  );
}
