'use client';

import { DeleteResourceButton } from '@/components/common/DeleteResourceButton';

interface DeleteCommentButtonProps {
  commentId: string;
}

export default function DeleteCommentButton({
  commentId,
}: DeleteCommentButtonProps) {
  return (
    <DeleteResourceButton
      resourceId={commentId}
      tableName="comments"
      confirmTitle="댓글을 삭제하시겠습니까?"
      confirmDescription="삭제된 댓글은 복구할 수 없습니다."
      successMessage="댓글이 삭제되었습니다."
      errorContext="DeleteCommentButton"
      showLabel={false}
      buttonSize="icon"
    />
  );
}
