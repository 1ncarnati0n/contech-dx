/**
 * Building Feature - Component Barrel Exports
 *
 * 하위 도메인별로 분리된 컴포넌트들을 re-export합니다.
 * 외부에서는 이 파일을 통해 building 컴포넌트에 접근합니다.
 */

// Basic Info
export { DataInputPage } from '../basic-info/view/DataInputPage';
export { BuildingBasicInfoPage } from '../basic-info/view/BuildingBasicInfoPage';
export { BuildingForm } from '../basic-info/view/BuildingForm';
export { BuildingTabs } from '../shared/view/BuildingTabs';
export { BuildingBasicInfo } from '../basic-info/view/BuildingBasicInfo';
export { FloorSettingsTable } from '../basic-info/view/FloorSettingsTable';

// Quantity
export { QuantityInputPage } from '../quantity/view/QuantityInputPage';
export { DetailedQuantityInputPage } from '../quantity/view/DetailedQuantityInputPage';
export { DetailedFloorTradeTable } from '../quantity/view/DetailedFloorTradeTable';
export { FloorTradeTable } from '../quantity/view/FloorTradeTable';

// Unit Rate
export { PriceInputPage } from '../unit-rate/view/PriceInputPage';
export { PlannedUnitRatePage } from '../unit-rate/view/PlannedUnitRatePage';

// Geological Data
export { GeologicalDataPage } from '../geological-data/view/GeologicalDataPage';

// Process Plan
export { BuildingProcessPlanPage } from '../process-plan/view/BuildingProcessPlanPage';
export { BasementProcessPlanPage } from '../process-plan/view/BasementProcessPlanPage';

// Pouring Section
export { PouringSectionReviewPage } from '../pouring-section/view/PouringSectionReviewPage';

// Process Logic
export { ProcessLogicPage } from '../process-logic/view/ProcessLogicPage';

// Sections
export * from '../basic-info/view/sections';
