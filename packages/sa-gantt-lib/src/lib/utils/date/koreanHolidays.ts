// ============================================
// SA-Gantt-Lib: 대한민국 공휴일 데이터 (2025~2027)
// ============================================
// 출처: https://superkts.com/day/holiday/
//       https://publicholidays.co.kr/ko/
//
// 주의: 모든 날짜는 로컬 시간대 자정으로 생성됩니다.
// new Date('YYYY-MM-DD')는 UTC 자정으로 파싱되어 timezone에 따라
// 날짜가 하루 밀릴 수 있으므로, new Date(year, month-1, day) 형식을 사용합니다.

/**
 * 2025년 대한민국 공휴일
 */
export const KOREAN_HOLIDAYS_2025: Date[] = [
    // 신정
    new Date(2025, 0, 1),
    // 설날 연휴 (1/27 임시공휴일 포함)
    new Date(2025, 0, 27), // 임시공휴일
    new Date(2025, 0, 28),
    new Date(2025, 0, 29), // 설날
    new Date(2025, 0, 30),
    // 삼일절 + 대체공휴일
    new Date(2025, 2, 1), // 토요일
    new Date(2025, 2, 3), // 대체공휴일
    // 어린이날 + 부처님오신날 (동일)
    new Date(2025, 4, 5),
    new Date(2025, 4, 6), // 대체공휴일
    // 대통령선거
    new Date(2025, 5, 3),
    // 현충일
    new Date(2025, 5, 6),
    // 광복절
    new Date(2025, 7, 15),
    // 개천절
    new Date(2025, 9, 3),
    // 추석 연휴 + 대체공휴일
    new Date(2025, 9, 5), // 일요일
    new Date(2025, 9, 6), // 추석
    new Date(2025, 9, 7),
    new Date(2025, 9, 8), // 대체공휴일
    // 한글날
    new Date(2025, 9, 9),
    // 성탄절
    new Date(2025, 11, 25),
];

/**
 * 2026년 대한민국 공휴일
 */
export const KOREAN_HOLIDAYS_2026: Date[] = [
    // 신정
    new Date(2026, 0, 1),
    // 설날 연휴
    new Date(2026, 1, 16),
    new Date(2026, 1, 17), // 설날
    new Date(2026, 1, 18),
    // 삼일절 + 대체공휴일
    new Date(2026, 2, 1), // 일요일
    new Date(2026, 2, 2), // 대체공휴일
    // 어린이날
    new Date(2026, 4, 5),
    // 부처님오신날 + 대체공휴일
    new Date(2026, 4, 24), // 일요일
    new Date(2026, 4, 25), // 대체공휴일
    // 현충일
    new Date(2026, 5, 6), // 토요일
    // 광복절 + 대체공휴일
    new Date(2026, 7, 15), // 토요일
    new Date(2026, 7, 17), // 대체공휴일
    // 추석 연휴
    new Date(2026, 8, 24),
    new Date(2026, 8, 25), // 추석
    new Date(2026, 8, 26), // 토요일
    // 개천절 + 대체공휴일
    new Date(2026, 9, 3), // 토요일
    new Date(2026, 9, 5), // 대체공휴일
    // 한글날
    new Date(2026, 9, 9),
    // 성탄절
    new Date(2026, 11, 25),
];

/**
 * 2027년 대한민국 공휴일
 */
export const KOREAN_HOLIDAYS_2027: Date[] = [
    // 신정
    new Date(2027, 0, 1),
    // 설날 연휴 + 대체공휴일
    new Date(2027, 1, 6), // 토요일
    new Date(2027, 1, 7), // 설날 (일요일)
    new Date(2027, 1, 8),
    new Date(2027, 1, 9), // 대체공휴일
    // 삼일절
    new Date(2027, 2, 1),
    // 어린이날
    new Date(2027, 4, 5),
    // 부처님오신날
    new Date(2027, 4, 13),
    // 현충일
    new Date(2027, 5, 6), // 일요일
    new Date(2027, 5, 7), // 대체공휴일 (현충일은 대체공휴일 미적용이지만 참고용)
    // 광복절 + 대체공휴일
    new Date(2027, 7, 15), // 일요일
    new Date(2027, 7, 16), // 대체공휴일
    // 추석 연휴
    new Date(2027, 8, 14),
    new Date(2027, 8, 15), // 추석
    new Date(2027, 8, 16),
    // 개천절 + 대체공휴일
    new Date(2027, 9, 3), // 일요일
    new Date(2027, 9, 4), // 대체공휴일
    // 한글날 + 대체공휴일
    new Date(2027, 9, 9), // 토요일
    new Date(2027, 9, 11), // 대체공휴일
    // 성탄절 + 대체공휴일
    new Date(2027, 11, 25), // 토요일
    new Date(2027, 11, 27), // 대체공휴일
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
