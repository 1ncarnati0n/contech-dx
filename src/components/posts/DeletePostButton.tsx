'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Trash2 } from 'lucide-react';

interface DeletePostButtonProps {
  postId: string;
}

export default function DeletePostButton({ postId }: DeletePostButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    setLoading(true);

    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);

      if (error) {
        toast.error('게시글 삭제 실패', { description: error.message });
        return;
      }

      toast.success('게시글이 삭제되었습니다.');
      router.push('/posts');
      router.refresh();
    } catch {
      toast.error('게시글 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50
                   dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
      >
        <Trash2 className="w-4 h-4" />
        삭제
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="게시글을 삭제하시겠습니까?"
        description="삭제된 게시글은 복구할 수 없습니다. 관련된 모든 댓글도 함께 삭제됩니다."
        confirmText="삭제"
        variant="danger"
        onConfirm={handleDelete}
        loading={loading}
      />
    </>
  );
}
