import type { Floor, ProcessCategory } from '@/shared/types';

export interface ProcessPlanRow {
  category: ProcessCategory;
  floorLabel?: string;
  floor?: Floor;
  floorClass?: string;
  rowIndex: number;
  isSpecialRow?: boolean;
  isConsolidatedBasement?: boolean;
  isFirstHighCeiling?: boolean;
  isSecondHighCeiling?: boolean;
}
