/**
 * 유틸리티 함수 통합 export
 * 
 * 사용 예:
 * import { formatCurrency, formatDate, getStatusLabel, logger } from '@/lib/utils';
 */

// 기존 utils.ts의 cn 함수 re-export
export { cn, isError, getErrorMessage } from '../utils';

// 포맷팅 유틸리티
export {
  formatCurrency,
  formatDate,
  formatFileSize,
  formatRelativeTime,
} from './formatters';

// 프로젝트 상태 유틸리티
export {
  PROJECT_STATUS_CONFIG,
  getStatusLabel,
  getStatusColors,
  getStatusIcon,
  getAllProjectStatuses,
  getStatusOptions,
} from './project-status';

// 로깅 유틸리티
export { logger, perfLogger } from './logger';

