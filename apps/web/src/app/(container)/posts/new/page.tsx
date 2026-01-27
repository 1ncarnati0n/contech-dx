import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, PenSquare } from 'lucide-react';
import PostForm from '@/components/posts/PostForm';
import { Card, CardContent } from '@/components/ui';

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
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* 뒤로가기 */}
      <Link
        href="/posts"
        className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        목록으로
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
          <PenSquare className="w-6 h-6 text-slate-700 dark:text-slate-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">새 게시글 작성</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">팀원들과 공유할 내용을 작성하세요</p>
        </div>
      </div>

      {/* Form Card */}
      <Card className="overflow-hidden border-0 shadow-md">
        <CardContent className="p-6 sm:p-8">
          <PostForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
