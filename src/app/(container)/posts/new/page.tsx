import { createClient } from '@/lib/supabase/server';
import PostForm from '@/components/posts/PostForm';
import { redirect } from 'next/navigation';

export default async function NewPostPage() {
  const supabase = await createClient();

  // 로그인 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-zinc-900 dark:text-zinc-100">
        새 게시글 작성
      </h1>
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-md border border-zinc-200 dark:border-zinc-800 p-6">
        <PostForm mode="create" />
      </div>
    </div>
  );
}
