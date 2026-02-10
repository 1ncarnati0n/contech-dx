'use client';

import { usePathname, useSearchParams } from 'next/navigation';

export default function LoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  return (
    <div className="fixed top-16 left-0 right-0 z-[100] h-0.5 bg-transparent pointer-events-none">
      <div
        key={routeKey}
        className="h-full bg-black dark:bg-white"
        style={{ width: '100%', animation: 'routeLoading 800ms ease-out forwards' }}
      />
      <style jsx>{`
        @keyframes routeLoading {
          0% { transform: translateX(-100%); opacity: 1; }
          70% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
