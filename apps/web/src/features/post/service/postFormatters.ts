/**
 * 작성자 표시명을 반환한다. display_name이 없으면 '익명'.
 */
export function getAuthorName(author: { display_name: string | null } | null): string {
  return author?.display_name || '익명';
}

/**
 * 작성자 이니셜(대문자 1글자)을 반환한다.
 */
export function getAuthorInitial(name: string): string {
  return name[0]?.toUpperCase() || 'A';
}

/**
 * 이메일 기반 이니셜을 반환한다 (댓글용).
 */
export function getEmailInitial(email: string | undefined | null): string {
  return email?.[0]?.toUpperCase() || 'A';
}
