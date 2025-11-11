'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface DeletePostButtonProps {
  postId: string;
}

export default function DeletePostButton({ postId }: DeletePostButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    if (!confirm('게시글을 삭제하시겠습니까?')) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);

      if (error) {
        alert('게시글 삭제 중 오류가 발생했습니다.');
        return;
      }

      router.push('/posts');
      router.refresh();
    } catch (err) {
      alert('게시글 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      {loading ? '삭제 중...' : '삭제'}
    </button>
  );
}
