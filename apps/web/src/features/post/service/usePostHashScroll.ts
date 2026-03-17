'use client';

import { useEffect } from 'react';

/**
 * URL hash에 해당하는 요소로 스크롤하는 훅
 * @param delay 애니메이션 완료 대기 시간 (ms)
 */
export function usePostHashScroll(delay: number = 300) {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const timer = setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);
}
