// ============================================
// SA-Gantt-Lib: 캘린더 관련 타입 정의
// ============================================

// ============================================
// 캘린더 설정
// ============================================

export interface CalendarSettings {
    workOnSaturdays: boolean;
    workOnSundays: boolean;
    workOnHolidays: boolean;
}

export interface Holiday {
    date: string;           // ISO 8601 (YYYY-MM-DD)
    name: string;           // 휴일명
}

// ============================================
// 날짜 계산 결과 인터페이스
// ============================================

export interface TaskDates {
    startDate: Date;
    endDate: Date;
    netWorkStartDate: Date;
    netWorkEndDate: Date;
    indirectPreStartDate?: Date;      // 앞 간접작업 시작일
    indirectPreEndDate?: Date;        // 앞 간접작업 종료일
    indirectPostStartDate?: Date;     // 뒤 간접작업 시작일
    indirectPostEndDate?: Date;       // 뒤 간접작업 종료일
}
