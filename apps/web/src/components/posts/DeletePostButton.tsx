'use client';

import { DeleteResourceButton } from '@/components/common/DeleteResourceButton';

interface DeletePostButtonProps {
  postId: string;
}

export default function DeletePostButton({ postId }: DeletePostButtonProps) {
  return (
    <DeleteResourceButton
      resourceId={postId}
      tableName="posts"
      redirectTo="/posts"
      confirmTitle="게시글을 삭제하시겠습니까?"
      confirmDescription="삭제된 게시글은 복구할 수 없습니다. 관련된 모든 댓글도 함께 삭제됩니다."
      successMessage="게시글이 삭제되었습니다."
      errorContext="DeletePostButton"
      showLabel={true}
      buttonSize="sm"
    />
  );
}
