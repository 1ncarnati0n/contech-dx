import { requireAuth } from '@/shared/lib/auth/requireAuth';
import HomeContent from '@/shared/components/home/HomeContent';

export default async function HomePage() {
  // 인증 체크 - 비로그인 시 랜딩 페이지로 리다이렉트
  await requireAuth();

  return <HomeContent />;
}
