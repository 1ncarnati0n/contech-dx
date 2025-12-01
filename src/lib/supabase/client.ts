// Client Component용 Supabase Client
// "use client" 컴포넌트에서 사용

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 세션 에러 발생 시 자동으로 세션 정리 및 리다이렉트
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED') {
      // 토큰 갱신 성공
      console.log('[Auth] Token refreshed successfully');
    }

    if (event === 'SIGNED_OUT') {
      // 로그아웃 시 쿠키 정리
      console.log('[Auth] User signed out');
    }
  });

  return supabase;
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