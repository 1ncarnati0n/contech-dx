/**
 * 포맷팅 유틸리티
 * 날짜, 통화 등의 포맷팅 함수를 제공합니다.
 */

/**
 * 통화 포맷팅 옵션
 */
interface CurrencyFormatOptions {
  /** 표기법 - 'compact': 축약형 (예: ₩150억), 'standard': 전체 표기 */
  notation?: 'compact' | 'standard';
  /** 최대 소수점 자릿수 */
  maximumFractionDigits?: number;
}

/**
 * 금액을 한국 원화 형식으로 포맷팅
 * @param amount - 포맷팅할 금액
 * @param options - 포맷팅 옵션
 * @returns 포맷팅된 문자열 또는 '-' (금액이 없는 경우)
 * 
 * @example
 * formatCurrency(15000000000) // "₩150억"
 * formatCurrency(15000000000, { notation: 'standard' }) // "₩15,000,000,000"
 */
export function formatCurrency(
  amount?: number | null,
  options?: CurrencyFormatOptions
): string {
  if (amount === undefined || amount === null) return '-';
  
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    notation: options?.notation ?? 'compact',
    maximumFractionDigits: options?.maximumFractionDigits ?? 1,
  }).format(amount);
}

/**
 * 날짜 포맷팅 스타일
 */
type DateFormatStyle = 'short' | 'long' | 'numeric';

/**
 * 날짜를 한국어 형식으로 포맷팅
 * @param dateStr - ISO 8601 형식의 날짜 문자열
 * @param style - 포맷팅 스타일
 * @returns 포맷팅된 날짜 문자열
 * 
 * @example
 * formatDate('2025-11-29') // "2025. 11. 29."
 * formatDate('2025-11-29', 'short') // "2025년 11월 29일"
 * formatDate('2025-11-29', 'long') // "2025년 11월 29일"
 */
export function formatDate(
  dateStr: string,
  style: DateFormatStyle = 'short'
): string {
  const options: Intl.DateTimeFormatOptions = (() => {
    switch (style) {
      case 'long':
        return { year: 'numeric', month: 'long', day: 'numeric' };
      case 'short':
        return { year: 'numeric', month: 'short', day: 'numeric' };
      case 'numeric':
      default:
        return { year: 'numeric', month: '2-digit', day: '2-digit' };
    }
  })();
  
  return new Date(dateStr).toLocaleDateString('ko-KR', options);
}

/**
 * 파일 크기를 사람이 읽기 쉬운 형식으로 포맷팅
 * @param bytes - 바이트 단위의 파일 크기
 * @returns 포맷팅된 파일 크기 문자열
 * 
 * @example
 * formatFileSize(1024) // "1 KB"
 * formatFileSize(1048576) // "1 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 상대적 시간을 한국어로 표시
 * @param dateStr - ISO 8601 형식의 날짜 문자열
 * @returns 상대적 시간 문자열 (예: "3분 전", "2시간 전")
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  
  return formatDate(dateStr, 'short');
}

