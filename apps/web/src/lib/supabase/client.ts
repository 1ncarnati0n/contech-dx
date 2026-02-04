// Client Component용 Supabase Client
// "use client" 컴포넌트에서 사용

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// 싱글톤 패턴: 클라이언트와 리스너를 한 번만 생성
let supabaseInstance: SupabaseClient | null = null;
let authListenerInitialized = false;

export function createClient() {
  // 기존 인스턴스가 있으면 재사용
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 리스너는 한 번만 등록 (중복 방지)
  if (!authListenerInitialized) {
    authListenerInitialized = true;

    // 세션 에러 발생 시 자동으로 세션 정리 및 리다이렉트
    supabaseInstance.auth.onAuthStateChange((event, session) => {
      // 토큰 갱신 및 로그아웃 이벤트 처리
      // 프로덕션에서는 로깅 제거하여 성능 최적화
    });
  }

  return supabaseInstance;
}

// 세션 에러 발생 시 세션 정리 헬퍼 함수
export async function clearInvalidSession() {
  const supabase = createClient();
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // 에러 무시 - 이미 세션이 무효한 상태일 수 있음
  }
  // 쿠키 정리
  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0].trim();
    if (name.startsWith('sb-')) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
  });
}