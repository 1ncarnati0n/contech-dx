'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface PostFormProps {
  initialData?: {
    id: string;
    title: string;
    content: string;
  };
  mode: 'create' | 'edit';
}

export default function PostForm({ initialData, mode }: PostFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('로그인이 필요합니다.');
        return;
      }

      if (mode === 'create') {
        const { data, error } = await supabase
          .from('posts')
          .insert({
            title,
            content,
            author_id: user.id,
          })
          .select()
          .single();

        if (error) {
          setError(error.message);
          return;
        }

        router.push(`/posts/${data.id}`);
      } else {
        const { error } = await supabase
          .from('posts')
          .update({
            title,
            content,
          })
          .eq('id', initialData!.id)
          .eq('author_id', user.id);

        if (error) {
          setError(error.message);
          return;
        }

        router.push(`/posts/${initialData!.id}`);
      }

      router.refresh();
    } catch (err) {
      setError('게시글 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          제목
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium">
          내용
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={10}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading
            ? '저장 중...'
            : mode === 'create'
            ? '작성하기'
            : '수정하기'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md bg-gray-200 px-4 py-2 hover:bg-gray-300"
        >
          취소
        </button>
      </div>
    </form>
  );
}
