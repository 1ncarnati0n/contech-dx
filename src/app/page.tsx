import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LandingPage from '@/components/home/LandingPage';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 로그인된 사용자는 /home으로 리다이렉트
  if (user) {
    redirect('/home');
  }

  return <LandingPage />;
}
