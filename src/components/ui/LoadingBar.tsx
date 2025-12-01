'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function LoadingBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // 경로가 변경되면 로딩 바 표시
        setIsLoading(true);

        // 실제 로딩 완료 시점을 알 수 없으므로 짧은 시간 후 숨김 (시각적 피드백용)
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 800);

        return () => clearTimeout(timer);
    }, [pathname, searchParams]);

    if (!isLoading) return null;

    return (
        <div className="fixed top-16 left-0 right-0 z-[100] h-0.5 bg-transparent">
            <div className="h-full bg-black dark:bg-white animate-[loading_1s_ease-in-out_infinite]" style={{ width: '100%' }} />
            <style jsx>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
      `}</style>
        </div>
    );
}
