import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit } from 'lucide-react';
import PostForm from '@/components/posts/PostForm';
import { Card, CardContent } from '@/components/ui';

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
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* 뒤로가기 */}
      <Link
        href={`/posts/${post.id}`}
        className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        돌아가기
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
          <Edit className="w-6 h-6 text-slate-700 dark:text-slate-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">게시글 수정</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">게시글 내용을 수정합니다</p>
        </div>
      </div>

      {/* Form Card */}
      <Card className="overflow-hidden border-0 shadow-md">
        <CardContent className="p-6 sm:p-8">
          <PostForm
            mode="edit"
            initialData={{
              id: post.id,
              title: post.title,
              content: post.content,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
