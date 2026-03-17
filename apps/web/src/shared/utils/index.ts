/**
 * 유틸리티 함수 통합 export
 *
 * 사용 예:
 * import { formatCurrency, formatDate, getStatusLabel, logger } from '@/shared/utils';
 */

// cn 함수 re-export
export { cn } from '../lib/utils';

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
} from '@/features/project/service/project-status';

// 로깅 유틸리티
export { logger, perfLogger } from './logger';
