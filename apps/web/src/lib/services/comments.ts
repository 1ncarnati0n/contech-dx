/**
 * Comments Service - Client Safe Re-export
 *
 * 이 파일은 클라이언트 컴포넌트에서 안전하게 import할 수 있습니다.
 * 클라이언트 전용 함수만 포함합니다.
 *
 * 서버 전용 함수가 필요한 경우:
 * import { getCommentsByPostId, getCommentsByUserId } from '@/lib/services/comments.server'
 */

export { createComment, deleteComment } from './comments.client';
