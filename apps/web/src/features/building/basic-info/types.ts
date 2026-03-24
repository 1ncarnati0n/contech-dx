import type { CoreType, SlabType, UnitTypePattern } from '@/shared/types';

export interface Heights {
  basement2: number;
  basement1: number;
  standard: number;
  floor1: number;
  floor2: number;
  floor3: number;
  floor4?: number;
  floor5?: number;
  top: number;
  ph: number | number[];
}

export interface BuildingFormData {
  buildingName: string;
  coreCount: number;
  coreType: CoreType;
  slabType: SlabType;
  basementCount: number;
  groundCount: number;
  phCount: number;
  coreGroundFloors: number[];
  coreBasementFloors: number[];
  corePhFloors: number[];
  pilotisCount: number;
  corePilotisCounts: number[];
  corePilotisHeights: number[];
  hasHighCeilingEquipmentRoom: boolean;
  scaffoldingColumns: number[][];
  unitTypePattern: UnitTypePattern[];
  heights: Heights;
  standardFloorCycle: number;
}
