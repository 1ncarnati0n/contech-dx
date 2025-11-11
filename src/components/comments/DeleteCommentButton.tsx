'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface DeleteCommentButtonProps {
  commentId: string;
}

export default function DeleteCommentButton({
  commentId,
}: DeleteCommentButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    if (!confirm('댓글을 삭제하시겠습니까?')) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        alert('댓글 삭제 중 오류가 발생했습니다.');
        return;
      }

      router.refresh();
    } catch (err) {
      alert('댓글 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      {loading ? '삭제 중...' : '삭제'}
    </button>
  );
}
