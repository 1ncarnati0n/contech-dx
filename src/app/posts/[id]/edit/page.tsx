import { createClient } from '@/lib/supabase/server';
import PostForm from '@/components/posts/PostForm';
import { notFound, redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: PageProps) {
  const supabase = await createClient();
  const { id } = await params;

  // 로그인 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 게시글 가져오기
  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !post) {
    notFound();
  }

  // 작성자 확인
  if (post.author_id !== user.id) {
    redirect(`/posts/${post.id}`);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">게시글 수정</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <PostForm
          mode="edit"
          initialData={{
            id: post.id,
            title: post.title,
            content: post.content,
          }}
        />
      </div>
    </div>
  );
}
