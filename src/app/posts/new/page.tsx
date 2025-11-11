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
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">새 게시글 작성</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <PostForm mode="create" />
      </div>
    </div>
  );
}
