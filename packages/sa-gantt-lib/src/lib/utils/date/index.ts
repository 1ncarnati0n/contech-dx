// ============================================
// SA-Gantt-Lib: Date 유틸리티 재export
// ============================================

// Holiday utilities
export {
    isHoliday,
    isWeekend,
    getHolidaysInDateRange,
    getHolidayOffsetsInDateRange,
    snapToWorkingDay,
} from './holiday';

// Working days utilities
export {
    addWorkingDays,
    subtractWorkingDays,
    countWorkingDays,
    moveByWorkingDays,
    addCalendarDays,
    DEFAULT_CALENDAR_SETTINGS,
    getTaskCalendarSettings,
} from './workingDays';

// Dual calendar utilities (Construction-specific)
export {
    calculateDualCalendarDates,
    getAnchorDate,
} from './dualCalendar';

// Pixel/Date conversion utilities
export {
    dateToX,
    xToDate,
    getDateRangeWidth,
    getPixelsPerDay,
    calculateDateRange,
} from './conversion';

// Korean holidays data (2025~2027)
export {
    KOREAN_HOLIDAYS_2025,
    KOREAN_HOLIDAYS_2026,
    KOREAN_HOLIDAYS_2027,
    KOREAN_HOLIDAYS_ALL,
    getKoreanHolidaysByYear,
    getKoreanHolidaysForYears,
} from './koreanHolidays';

// Validation utilities
export {
    isValidDate,
    isValidDateRange,
    validateTaskDates,
    parseDateSafe,
    isSameDay,
} from './validation';
