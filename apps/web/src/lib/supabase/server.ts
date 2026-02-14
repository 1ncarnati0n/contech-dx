// Server Component용 Supabase Client
// Server Component와 Server Actions에서 사용

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from '@/lib/utils/logger';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            // Server Component에서는 set이 동작하지 않을 수 있음
            logger.warn('Failed to set Supabase auth cookies in server context', {
              reason: error instanceof Error ? error.message : 'unknown',
              cookieCount: cookiesToSet.length,
            });
          }
        },
      },
    }
  );
}
