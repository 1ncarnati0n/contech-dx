// Middleware용 Supabase Client
// Next.js middleware에서 사용

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Session refresh (중요!)
  // 에러 발생 시 gracefully 처리하여 무효한 토큰으로 인한 에러 방지
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // 토큰 에러 시 세션 쿠키 정리
      console.log('[Middleware] Auth error, clearing session:', error.message);
      response.cookies.delete('sb-access-token');
      response.cookies.delete('sb-refresh-token');
    } else {
      user = data.user;
    }
  } catch (error) {
    // 예기치 않은 에러 처리
    console.error('[Middleware] Unexpected auth error:', error);
  }

  // Route protection logic
  const path = request.nextUrl.pathname;

  // 디버깅 로그
  console.log('[Middleware] path:', path, 'user:', user?.email ?? 'null');

  // 인증된 사용자가 로그인/회원가입/루트 페이지 접근 시 /home으로 리다이렉트
  if (user && (path === '/login' || path === '/signup' || path === '/')) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // Public paths that don't require authentication
  const publicPaths = ['/login', '/signup', '/auth/callback', '/'];
  const isPublicPath = publicPaths.some(p => path === p || path.startsWith('/auth/'));

  if (!user && !isPublicPath) {
    // Redirect unauthenticated users to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return response;
}
