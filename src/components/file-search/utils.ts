/**
 * File Search 헬퍼 유틸리티
 */

/**
 * 바이트를 읽기 쉬운 파일 크기로 변환
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * MIME 타입에 따른 파일 아이콘 반환
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('text')) return '📃';
  return '📁';
}

/**
 * 허용된 파일 확장자 목록
 */
export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.json', '.csv', '.xlsx'];

/**
 * 파일이 업로드 가능한지 확인
 */
export function isValidFile(file: File): boolean {
  return ALLOWED_EXTENSIONS.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );
}

/**
 * 파일 배열에서 유효한 파일만 필터링
 */
export function filterValidFiles(files: File[]): File[] {
  return files.filter(isValidFile);
}
