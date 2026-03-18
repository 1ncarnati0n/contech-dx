/**
 * 숫자를 한글 금액으로 변환 (예: 123456789 → "1억 2,345만 6,789원")
 */
export function formatKoreanCurrency(value: number | null | undefined): string {
  if (value == null || value === 0) return '';

  const units = ['', '만', '억', '조', '경'];
  const num = Math.abs(value);
  const parts: string[] = [];

  let remaining = num;
  let unitIndex = 0;

  while (remaining > 0 && unitIndex < units.length) {
    const part = remaining % 10000;
    if (part > 0) {
      const formattedPart = part.toLocaleString('ko-KR');
      parts.unshift(`${formattedPart}${units[unitIndex]}`);
    }
    remaining = Math.floor(remaining / 10000);
    unitIndex++;
  }

  return parts.join(' ') + '원';
}

/**
 * 콤마가 포함된 문자열에서 숫자만 추출
 */
export function parseFormattedNumber(value: string): number | null {
  const cleaned = value.replace(/[^\d]/g, '');
  if (cleaned === '') return null;
  return parseInt(cleaned, 10);
}

/**
 * 숫자를 콤마 포맷 문자열로 변환
 */
export function formatWithCommas(value: number | null | undefined): string {
  if (value == null) return '';
  return value.toLocaleString('ko-KR');
}
