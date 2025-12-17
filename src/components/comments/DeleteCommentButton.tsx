'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Trash2 } from 'lucide-react';

interface DeleteCommentButtonProps {
  commentId: string;
}

export default function DeleteCommentButton({
  commentId,
}: DeleteCommentButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        toast.error('댓글 삭제 실패', { description: error.message });
        return;
      }

      toast.success('댓글이 삭제되었습니다.');
      router.refresh();
    } catch {
      toast.error('댓글 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="h-8 w-8 text-zinc-400 hover:text-red-600 dark:hover:text-red-400
                   hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="댓글을 삭제하시겠습니까?"
        description="삭제된 댓글은 복구할 수 없습니다."
        confirmText="삭제"
        variant="danger"
        onConfirm={handleDelete}
        loading={loading}
      />
    </>
  );
}
