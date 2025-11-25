/**
 * Korean Holidays and Weekend Detection
 * 한국 공휴일 및 주말 판별
 */

/**
 * Check if a given date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Korean Public Holidays (2024-2025)
 * 간단한 버전 - 필요시 확장 가능
 */
const KOREAN_HOLIDAYS = [
  // 2024
  '2024-01-01', // 신정
  '2024-02-09', // 설날 연휴
  '2024-02-10', // 설날
  '2024-02-11', // 설날 연휴
  '2024-03-01', // 삼일절
  '2024-04-10', // 국회의원 선거일
  '2024-05-05', // 어린이날
  '2024-05-06', // 대체공휴일
  '2024-05-15', // 부처님 오신 날
  '2024-06-06', // 현충일
  '2024-08-15', // 광복절
  '2024-09-16', // 추석 연휴
  '2024-09-17', // 추석
  '2024-09-18', // 추석 연휴
  '2024-10-03', // 개천절
  '2024-10-09', // 한글날
  '2024-12-25', // 크리스마스
  
  // 2025
  '2025-01-01', // 신정
  '2025-01-28', // 설날 연휴
  '2025-01-29', // 설날
  '2025-01-30', // 설날 연휴
  '2025-03-01', // 삼일절
  '2025-03-03', // 대체공휴일
  '2025-05-05', // 어린이날
  '2025-05-06', // 대체공휴일
  '2025-06-06', // 현충일
  '2025-08-15', // 광복절
  '2025-10-03', // 개천절
  '2025-10-06', // 추석 연휴
  '2025-10-07', // 추석
  '2025-10-08', // 추석 연휴
  '2025-10-09', // 한글날
  '2025-12-25', // 크리스마스
];

/**
 * Check if a given date is a Korean public holiday
 */
export function isKoreanHoliday(date: Date): boolean {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD 형식
  return KOREAN_HOLIDAYS.includes(dateStr);
}

/**
 * Check if a given date is a non-working day (weekend or holiday)
 */
export function isNonWorkingDay(date: Date): boolean {
  return isWeekend(date) || isKoreanHoliday(date);
}

