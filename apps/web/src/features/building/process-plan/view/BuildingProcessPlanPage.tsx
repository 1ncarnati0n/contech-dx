'use client';

import { Fragment } from 'react';
import { Card, CardContent, Input } from '@/shared/components/ui';
import { SaveStatusBar } from '../../shared/view/SaveStatusBar';
import type { ProcessType } from '@/shared/types';
import type { TradeFieldKey, TradeSubFieldKey } from '@/shared/types/process-quantity';
import { ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import { BuildingTabs } from '../../shared/view/BuildingTabs';
import { getProcessModule } from '@/features/building/data/process-modules';
import { getCellReferenceForRow } from '@/features/building/process-plan/service/process-cell-reference';
import {
  getBuildingRowCategoryLabel,
  getBuildingRowFloorNumberLabel,
} from '../service/processRowHelpers';
import {
  ProcessDetailPanel,
  ProcessPlanDetailCard,
  ProcessPlanTable,
  ProcessPlanTableRow,
  ProcessPlanSidePanel,
} from '..';
import {
  useBuildingProcessPlan,
  getBuildingInfo,
  resolveBuildingQty,
  PROCESS_TYPE_OPTIONS,
  DEFAULT_PROCESS_TYPES,
} from '../service/useBuildingProcessPlan';

interface Props {
  projectId: string;
}

export function BuildingProcessPlanPage({ projectId }: Props) {
  const {
    buildings,
    activeBuilding,
    activeBuildingIndex,
    setActiveBuildingIndex,
    processPlans,
    expandedModules,
    dirtyBuildings,
    isSaving,
    handleDeleteBuilding,
    handleUpdateBuildingName,
    handleReorder,
    handleProcessTypeChange,
    handleItemDirectWorkDaysChange,
    handlePumpCarCountChange,
    handleSaveAndUpdateDetailProcess,
    hasPumpCarCountChanges,
    discardChanges,
    updateExpandedModules,
    processRows,
    processColumns,
    maxFloorNumber,
    getProcessTypeForFloor,
  } = useBuildingProcessPlan(projectId);

  return (
    <div className="space-y-6">
      {buildings.length > 0 ? (
        <BuildingTabs
          buildings={buildings}
          activeIndex={activeBuildingIndex}
          onTabChange={setActiveBuildingIndex}
          onDelete={handleDeleteBuilding}
          onUpdateBuildingName={handleUpdateBuildingName}
          onReorder={handleReorder}
        >
          {activeBuilding && (
            <div className="p-4">
              {/* 호수, 펌프카 대수 정보 - 카드 형식 */}
              {activeBuilding && (() => {
                const building = activeBuilding;
                const info = getBuildingInfo(building);
                const hasUnsavedChanges = dirtyBuildings.has(building.id) || hasPumpCarCountChanges(building);
                return (
                  <Card className="mb-4">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-6 flex-wrap">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-semibold text-zinc-900 dark:text-white whitespace-nowrap">
                            호수:
                          </label>
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">
                            {info.coreUnits && info.coreUnits.length > 0
                              ? info.coreUnits.map((cu) => `코어${cu.coreNumber} ${cu.units}호`).join(', ')
                              : info.totalUnits}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-semibold text-zinc-900 dark:text-white whitespace-nowrap">
                            펌프카 최대 투입대수:
                          </label>
                          <Input
                            type="number"
                            min="1"
                            max="2"
                            step="1"
                            value={building.meta?.pumpCarCount ?? 1}
                            onChange={(e) => {
                              handlePumpCarCountChange(building.id, e.target.value);
                            }}
                            onBlur={(e) => {
                              handlePumpCarCountChange(building.id, e.target.value);
                            }}
                            className="w-20"
                            placeholder="1"
                          />
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">대</span>
                        </div>
                        <div className="ml-auto">
                          <SaveStatusBar
                            hasUnsavedChanges={hasUnsavedChanges}
                            isSaving={isSaving}
                            onSave={() => {
                              void handleSaveAndUpdateDetailProcess(building.id);
                            }}
                            onDiscard={() => discardChanges(building.id)}
                            allowSaveWithoutChanges
                            saveLabel="저장/세부공정 업데이트"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              <div className="flex items-start gap-4 min-w-[1024px]">
                {/* 좌측: 테이블 카드 */}
                <ProcessPlanTable hasProcessColumns={processColumns.length > 0}>
                  {(() => {
                          const building = activeBuilding;
                          const plan = processPlans.get(building!.id);
                          const isDetailExpanded = expandedModules.get(building!.id) || new Set<string>();

                          return (
                            <Fragment key={building!.id}>
                              {/* 공정 구분 섹션 - 물량입력표와 동일한 순서로 행 표시 */}
                              {processRows.map((row) => {
                                // processType 결정 (주동 지하층/옥탑층/일반층은 층별, 나머지는 카테고리별)
                                let processType: ProcessType;
                                if (row.floorLabel && (row.category === '주동 지하층' || row.category === '옥탑층' || row.category === '일반층')) {
                                  processType = getProcessTypeForFloor(plan, row.category, row.floorLabel);
                                } else {
                                  processType = plan?.processes[row.category as keyof typeof plan.processes]?.processType || DEFAULT_PROCESS_TYPES[row.category as keyof typeof DEFAULT_PROCESS_TYPES];
                                }
                                const mod = getProcessModule(row.category, processType);

                                // 확장 상태 확인
                                const expandKey = row.floorLabel
                                  ? `${row.category}-${row.floorLabel}`
                                  : row.category === '기준층'
                                    ? '기준층-세부공정'
                                    : row.category;
                                const isExpanded = isDetailExpanded.has(expandKey);

                                // 물량 데이터 가져오기 - thin wrapper over pure function
                                const rqty = (tradeField: TradeFieldKey, subField: TradeSubFieldKey) =>
                                  resolveBuildingQty(building!, row, tradeField, subField);
                                const getGangFormQty = () => rqty('gangForm', 'areaM2');
                                const getAlFormQty = () => rqty('alForm', 'areaM2');
                                const getEuroFormQty = () => rqty('euroForm', 'areaM2');
                                const getStripCleanQty = () => (getGangFormQty() + getAlFormQty() + getEuroFormQty()) * 2;
                                const getFormworkQuantity = () => getGangFormQty() + getAlFormQty() + getEuroFormQty();
                                const getRebarQuantity = () => rqty('rebar', 'ton');
                                const getConcreteQuantity = () => rqty('concrete', 'volumeM3');

                                return (
                                  <ProcessPlanTableRow
                                    key={`process-${row.category}-${row.floorLabel || ''}-${row.rowIndex}`}
                                    isExpanded={isExpanded}
                                  >
                                    {/* 첫 번째 열: 구분 항목 */}
                                    <td className="px-2 py-1 text-xs font-semibold text-zinc-900 dark:text-white border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '32px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      <div className="text-center">{getBuildingRowCategoryLabel(row)}</div>
                                    </td>

                                    {/* 두 번째 열: 층수 */}
                                    <td className="px-2 py-1 text-xs font-semibold text-zinc-900 dark:text-white border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '32px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      <div className="text-center font-normal">{getBuildingRowFloorNumberLabel(row)}</div>
                                    </td>

                                    {/* 형틀 합계 */}
                                    <td className="relative px-0.5 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}>
                                      {getCellReferenceForRow(row.category, row.floorLabel, 'formworkTotal', maxFloorNumber) && (
                                        <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'formworkTotal', maxFloorNumber)}
                                        </span>
                                      )}
                                      <div className="text-xs font-medium">
                                        {getFormworkQuantity() > 0 ? getFormworkQuantity().toFixed(2) : '0.00'}
                                      </div>
                                    </td>
                                    {/* 갱폼 */}
                                    <td className="relative px-0.5 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}>
                                      {getCellReferenceForRow(row.category, row.floorLabel, 'gangForm', maxFloorNumber) && (
                                        <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'gangForm', maxFloorNumber)}
                                        </span>
                                      )}
                                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {getGangFormQty() > 0 ? getGangFormQty().toFixed(2) : '0.00'}
                                      </div>
                                    </td>
                                    {/* 알폼 */}
                                    <td className="relative px-0.5 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}>
                                      {getCellReferenceForRow(row.category, row.floorLabel, 'alForm', maxFloorNumber) && (
                                        <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'alForm', maxFloorNumber)}
                                        </span>
                                      )}
                                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {getAlFormQty() > 0 ? getAlFormQty().toFixed(2) : '0.00'}
                                      </div>
                                    </td>
                                    {/* 유로폼 */}
                                    <td className="relative px-0.5 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}>
                                      {getCellReferenceForRow(row.category, row.floorLabel, 'euroForm', maxFloorNumber) && (
                                        <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'euroForm', maxFloorNumber)}
                                        </span>
                                      )}
                                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {getEuroFormQty() > 0 ? getEuroFormQty().toFixed(2) : '0.00'}
                                      </div>
                                    </td>

                                    {/* 해체/정리 (유로폼 × 2, 읽기전용) */}
                                    <td className="relative px-0.5 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}>
                                      {getCellReferenceForRow(row.category, row.floorLabel, 'stripClean', maxFloorNumber) && (
                                        <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'stripClean', maxFloorNumber)}
                                        </span>
                                      )}
                                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {getStripCleanQty() > 0 ? getStripCleanQty().toFixed(2) : '0.00'}
                                      </div>
                                    </td>

                                    {/* 네 번째 열: 철근 */}
                                    <td className="relative px-1 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}>
                                      {getCellReferenceForRow(row.category, row.floorLabel, 'rebar', maxFloorNumber) && (
                                        <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'rebar', maxFloorNumber)}
                                        </span>
                                      )}
                                      <div className="text-xs">
                                        {getRebarQuantity() > 0 ? getRebarQuantity().toFixed(2) : '0.00'}
                                      </div>
                                    </td>

                                    {/* 다섯 번째 열: 콘크리트 */}
                                    <td className="relative px-1 py-1 text-center text-xs border-r-2 border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}>
                                      {getCellReferenceForRow(row.category, row.floorLabel, 'concrete', maxFloorNumber) && (
                                        <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'concrete', maxFloorNumber)}
                                        </span>
                                      )}
                                      <div className="text-xs">
                                        {getConcreteQuantity() > 0 ? getConcreteQuantity().toFixed(2) : '0.00'}
                                      </div>
                                    </td>

                                    {/* 공정타입 셀렉트박스 */}
                                    <td className="px-1 py-1 border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}>
                                      {/* 일반 지하층 행은 항상 표준공정 드롭다운 표시 */}
                                      <select
                                        value={processType}
                                        onChange={(e) => {
                                          // 일반층인 경우 옥탑층 카테고리로 저장
                                          const targetCategory = row.category;
                                          handleProcessTypeChange(building.id, targetCategory, e.target.value as ProcessType, row.floorLabel);
                                        }}
                                        className="w-full px-1 py-0.5 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {(PROCESS_TYPE_OPTIONS[row.category as keyof typeof PROCESS_TYPE_OPTIONS] || []).map(option => (
                                          <option key={option} value={option}>
                                            {option}
                                          </option>
                                        ))}
                                      </select>
                                    </td>

                                    {/* 여덟 번째 열: 세부공정 버튼 */}
                                    <td className="px-1 py-1 border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}>
                                      {mod && mod.items.length > 0 && (
                                        <button
                                          onClick={() => {
                                            const expanded = expandedModules.get(building.id) || new Set<string>();
                                            const newExpanded = new Set<string>();
                                            // 다른 행의 확장 상태를 모두 제거하고 현재 행만 확장
                                            if (!expanded.has(expandKey)) {
                                              newExpanded.add(expandKey);
                                            }
                                            // 이미 확장된 경우 닫기 (newExpanded는 빈 Set이므로 아무것도 표시되지 않음)
                                            updateExpandedModules(building.id, newExpanded);
                                          }}
                                          className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded mx-auto block"
                                          title="세부공정 보기/숨기기"
                                        >
                                          {isExpanded ? (
                                            <ChevronUp className="w-4 h-4" />
                                          ) : (
                                            <ChevronDown className="w-4 h-4" />
                                          )}
                                        </button>
                                      )}
                                    </td>
                                  </ProcessPlanTableRow>
                                );
                              })}
                            </Fragment>
                          );
                  })()}
                </ProcessPlanTable>

                {/* 우측: 패널 카드 */}
                <ProcessPlanSidePanel>
                  {(() => {
                        const building = activeBuilding;
                        const plan = processPlans.get(building!.id);
                        const isDetailExpanded = expandedModules.get(building!.id) || new Set<string>();

                        // 확장된 행 찾기
                        const expandedRow = processRows.find((col) => {
                          const expandKey = col.floorLabel
                            ? `${col.category}-${col.floorLabel}`
                            : col.category === '기준층'
                              ? '기준층-세부공정'
                              : col.category;
                          return isDetailExpanded.has(expandKey);
                        });

                        // 카테고리명 표시
                        const getCategoryDisplayName = (row: NonNullable<typeof expandedRow>) => {
                          if (row.category === '버림' || row.category === '기초') {
                            return row.category;
                          }
                          if (row.category === '기준층') {
                            return '기준층';
                          }
                          if (row.category === '최상층') {
                            return '최상층';
                          }
                          if (row.floorLabel) {
                            return `${row.category} ${row.floorLabel}`;
                          }
                          return row.category;
                        };

                        return (
                          <ProcessPlanDetailCard
                            expandedRow={expandedRow || null}
                            getCategoryDisplayName={getCategoryDisplayName}
                          >
                            {(selectedRow) => {
                              const expandedProcessType =
                                plan?.processes[selectedRow.category as keyof typeof plan.processes]?.processType ||
                                DEFAULT_PROCESS_TYPES[selectedRow.category as keyof typeof DEFAULT_PROCESS_TYPES] ||
                                '표준공정';
                              const expandedModule = getProcessModule(selectedRow.category, expandedProcessType) || null;

                              return (
                                <ProcessDetailPanel
                                  building={building!}
                                  expandedRow={selectedRow}
                                  module={expandedModule}
                                  plan={plan}
                                  processRows={processRows}
                                  onDirectWorkDaysChange={(itemKey, value) => handleItemDirectWorkDaysChange(building!, itemKey, value)}
                                  specialRowQuantities={plan?.specialRowQuantities}
                                />
                              );
                            }}
                          </ProcessPlanDetailCard>
                        );
                  })()}
                </ProcessPlanSidePanel>
              </div>
            </div>
          )}
        </BuildingTabs>
      ) : (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                등록된 동이 없습니다
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
                지상층 공정계획을 입력하려면 먼저 <br />
                <span className="font-medium text-primary-600 dark:text-primary-400">&quot;동 기본정보&quot;</span> 탭에서 동을 생성해주세요.
              </p>
            </div>
          </div>
        </Card>
      )}

    </div>
  );
}
