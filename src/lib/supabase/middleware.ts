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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Route protection logic
  const path = request.nextUrl.pathname;

  // 1. Public paths that don't require authentication
  const publicPaths = ['/login', '/signup', '/auth/callback', '/'];
  const isPublicPath = publicPaths.some(p => path === p || path.startsWith('/auth/'));

  // 2. Auth paths (login/signup) - redirect to projects if already logged in
  const isAuthPath = ['/login', '/signup'].includes(path);

  if (!user && !isPublicPath) {
    // Redirect unauthenticated users to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup') || request.nextUrl.pathname === '/')) {
    // 3. 인증된 사용자가 로그인/회원가입/루트 페이지 접근 시 /home으로 리다이렉트
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // 4. 루트 페이지('/')는 공개 접근 허용 (위에서 처리되지 않은 비로그인 사용자)
  if (request.nextUrl.pathname === '/') {
    return response;
  }

  return response;
}
