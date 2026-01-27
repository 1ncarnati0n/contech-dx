// ============================================
// SA-Gantt-Lib: 대한민국 공휴일 데이터 (2025~2027)
// ============================================
// 출처: https://superkts.com/day/holiday/
//       https://publicholidays.co.kr/ko/

/**
 * 2025년 대한민국 공휴일
 */
export const KOREAN_HOLIDAYS_2025: Date[] = [
    // 신정
    new Date('2025-01-01'),
    // 설날 연휴 (1/27 임시공휴일 포함)
    new Date('2025-01-27'), // 임시공휴일
    new Date('2025-01-28'),
    new Date('2025-01-29'), // 설날
    new Date('2025-01-30'),
    // 삼일절 + 대체공휴일
    new Date('2025-03-01'), // 토요일
    new Date('2025-03-03'), // 대체공휴일
    // 어린이날 + 부처님오신날 (동일)
    new Date('2025-05-05'),
    new Date('2025-05-06'), // 대체공휴일
    // 대통령선거
    new Date('2025-06-03'),
    // 현충일
    new Date('2025-06-06'),
    // 광복절
    new Date('2025-08-15'),
    // 개천절
    new Date('2025-10-03'),
    // 추석 연휴 + 대체공휴일
    new Date('2025-10-05'), // 일요일
    new Date('2025-10-06'), // 추석
    new Date('2025-10-07'),
    new Date('2025-10-08'), // 대체공휴일
    // 한글날
    new Date('2025-10-09'),
    // 성탄절
    new Date('2025-12-25'),
];

/**
 * 2026년 대한민국 공휴일
 */
export const KOREAN_HOLIDAYS_2026: Date[] = [
    // 신정
    new Date('2026-01-01'),
    // 설날 연휴
    new Date('2026-02-16'),
    new Date('2026-02-17'), // 설날
    new Date('2026-02-18'),
    // 삼일절 + 대체공휴일
    new Date('2026-03-01'), // 일요일
    new Date('2026-03-02'), // 대체공휴일
    // 어린이날
    new Date('2026-05-05'),
    // 부처님오신날 + 대체공휴일
    new Date('2026-05-24'), // 일요일
    new Date('2026-05-25'), // 대체공휴일
    // 현충일
    new Date('2026-06-06'), // 토요일
    // 광복절 + 대체공휴일
    new Date('2026-08-15'), // 토요일
    new Date('2026-08-17'), // 대체공휴일
    // 추석 연휴
    new Date('2026-09-24'),
    new Date('2026-09-25'), // 추석
    new Date('2026-09-26'), // 토요일
    // 개천절 + 대체공휴일
    new Date('2026-10-03'), // 토요일
    new Date('2026-10-05'), // 대체공휴일
    // 한글날
    new Date('2026-10-09'),
    // 성탄절
    new Date('2026-12-25'),
];

/**
 * 2027년 대한민국 공휴일
 */
export const KOREAN_HOLIDAYS_2027: Date[] = [
    // 신정
    new Date('2027-01-01'),
    // 설날 연휴 + 대체공휴일
    new Date('2027-02-06'), // 토요일
    new Date('2027-02-07'), // 설날 (일요일)
    new Date('2027-02-08'),
    new Date('2027-02-09'), // 대체공휴일
    // 삼일절
    new Date('2027-03-01'),
    // 어린이날
    new Date('2027-05-05'),
    // 부처님오신날
    new Date('2027-05-13'),
    // 현충일
    new Date('2027-06-06'), // 일요일
    new Date('2027-06-07'), // 대체공휴일 (현충일은 대체공휴일 미적용이지만 참고용)
    // 광복절 + 대체공휴일
    new Date('2027-08-15'), // 일요일
    new Date('2027-08-16'), // 대체공휴일
    // 추석 연휴
    new Date('2027-09-14'),
    new Date('2027-09-15'), // 추석
    new Date('2027-09-16'),
    // 개천절 + 대체공휴일
    new Date('2027-10-03'), // 일요일
    new Date('2027-10-04'), // 대체공휴일
    // 한글날 + 대체공휴일
    new Date('2027-10-09'), // 토요일
    new Date('2027-10-11'), // 대체공휴일
    // 성탄절 + 대체공휴일
    new Date('2027-12-25'), // 토요일
    new Date('2027-12-27'), // 대체공휴일
];

/**
 * 2025~2027년 통합 공휴일 목록
 */
export const KOREAN_HOLIDAYS_ALL: Date[] = [
    ...KOREAN_HOLIDAYS_2025,
    ...KOREAN_HOLIDAYS_2026,
    ...KOREAN_HOLIDAYS_2027,
];

/**
 * 연도별 공휴일 조회
 */
export const getKoreanHolidaysByYear = (year: number): Date[] => {
    switch (year) {
        case 2025:
            return KOREAN_HOLIDAYS_2025;
        case 2026:
            return KOREAN_HOLIDAYS_2026;
        case 2027:
            return KOREAN_HOLIDAYS_2027;
        default:
            return [];
    }
};

/**
 * 여러 연도의 공휴일 조회
 */
export const getKoreanHolidaysForYears = (years: number[]): Date[] => {
    return years.flatMap(year => getKoreanHolidaysByYear(year));
};
