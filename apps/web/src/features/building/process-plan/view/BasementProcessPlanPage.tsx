'use client';

import { Fragment } from 'react';
import { Card, CardContent, Input } from '@/shared/components/ui';
import { SaveStatusBar } from '../../shared/view/SaveStatusBar';
import type { ProcessType } from '@/shared/types';
import type { TradeFieldKey, TradeSubFieldKey } from '@/shared/types/process-quantity';
import { ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import { BuildingTabs } from '../../shared/view/BuildingTabs';
import {
  ProcessDetailPanel,
  ProcessPlanDetailCard,
  ProcessPlanTable,
  ProcessPlanTableRow,
  ProcessPlanSidePanel,
} from '..';
import { getProcessModule } from '@/features/building/data/process-modules';
import { getSpecialRowDeductions } from '@/features/building/process-plan/service/process-quantity-resolver';
import { getCellReferenceForRow } from '@/features/building/process-plan/service/process-cell-reference';
import {
  getBasementRowCategoryLabel,
  getBasementRowFloorNumberLabel,
} from '../service/processRowHelpers';
import {
  useBasementProcessPlan,
  getSpecialRowQuantity,
  handleSpecialRowQuantityChange as handleSpecialRowQuantityChangePure,
  getMaxAvailableForSpecialRow as getMaxAvailableForSpecialRowPure,
  resolveBasementQty,
} from '../service/useBasementProcessPlan';

interface Props {
  projectId: string;
}

export function BasementProcessPlanPage({ projectId }: Props) {
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
    discardChanges,
    saveToLocalStorage,
    updateProcessPlan,
    updateExpandedModules,
    markDirty,
    processRows,
    processColumns,
    maxFloorNumber,
    getProcessTypeForFloor,
    isSpecialRowActive,
    isHighCeilingActive,
    PROCESS_TYPE_OPTIONS,
    DEFAULT_PROCESS_TYPES,
  } = useBasementProcessPlan(projectId);

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
            <div className="p-4 space-y-4">
              {/* 가설공사 흙막이 토공사 공사일수 입력창 - 동별 탭 아래에 표시 */}
              {(() => {
                const building = activeBuilding;
                const plan = processPlans.get(building.id);
                const temporaryWorkDays = plan?.temporaryWorkDays ?? 0;
                const earthRetentionWorkDays = plan?.earthRetentionWorkDays ?? 0;
                const earthworkWorkDays = plan?.earthworkWorkDays ?? 0;

                const handleWorkDaysChange = (field: 'temporaryWorkDays' | 'earthRetentionWorkDays' | 'earthworkWorkDays', value: number | null) => {
                  if (!building) return;

                  const currentPlan = processPlans.get(building.id);
                  if (!currentPlan) return;

                  const updatedPlan = {
                    ...currentPlan,
                    [field]: value !== null && value >= 0 ? value : 0,
                  };

                  updateProcessPlan(building.id, updatedPlan);
                  markDirty(building.id);
                };

                return (
                  <Card className="mb-4">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-6 flex-wrap">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-semibold text-zinc-900 dark:text-white whitespace-nowrap">
                            가설공사 공사일수:
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={temporaryWorkDays}
                            onChange={(e) => {
                              const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                              handleWorkDaysChange('temporaryWorkDays', value);
                            }}
                            onBlur={(e) => {
                              const value = e.target.value === '' ? 0 : Math.max(0, Math.round(parseFloat(e.target.value) || 0));
                              handleWorkDaysChange('temporaryWorkDays', value);
                            }}
                            className="w-24"
                            placeholder="일수"
                          />
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">일</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-semibold text-zinc-900 dark:text-white whitespace-nowrap">
                            흙막이 공사일수:
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={earthRetentionWorkDays}
                            onChange={(e) => {
                              const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                              handleWorkDaysChange('earthRetentionWorkDays', value);
                            }}
                            onBlur={(e) => {
                              const value = e.target.value === '' ? 0 : Math.max(0, Math.round(parseFloat(e.target.value) || 0));
                              handleWorkDaysChange('earthRetentionWorkDays', value);
                            }}
                            className="w-24"
                            placeholder="일수"
                          />
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">일</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-semibold text-zinc-900 dark:text-white whitespace-nowrap">
                            토공사 공사일수:
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={earthworkWorkDays}
                            onChange={(e) => {
                              const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                              handleWorkDaysChange('earthworkWorkDays', value);
                            }}
                            onBlur={(e) => {
                              const value = e.target.value === '' ? 0 : Math.max(0, Math.round(parseFloat(e.target.value) || 0));
                              handleWorkDaysChange('earthworkWorkDays', value);
                            }}
                            className="w-24"
                            placeholder="일수"
                          />
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">일</span>
                        </div>
                        <div className="ml-auto">
                          <SaveStatusBar
                            hasUnsavedChanges={dirtyBuildings.has(building.id)}
                            isSaving={isSaving}
                            onSave={() => saveToLocalStorage(building.id)}
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

              {/* 공정 목록 테이블 */}
              <div className="flex items-start gap-4 min-w-[1024px]">
                {/* 좌측: 테이블 카드 */}
                <ProcessPlanTable
                  hasProcessColumns={processColumns.length > 0}
                  summaryLabelClassName="text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"
                >
                  {(() => {
                          const building = activeBuilding;
                          const plan = processPlans.get(building.id);
                          const isDetailExpanded = expandedModules.get(building.id) || new Set<string>();

                          return (
                            <Fragment key={building.id}>
                              {/* 공정 구분 섹션 - 물량입력표와 동일한 순서로 행 표시 */}
                              {processRows.map((row) => {
                                // Convenience wrappers using pure functions
                                const sqty = (field: 'gangForm' | 'alForm' | 'formwork' | 'rebar' | 'concrete') =>
                                  getSpecialRowQuantity(processPlans, building.id, row.floorLabel, row.isSpecialRow, field);
                                const sqtyChange = (field: 'gangForm' | 'alForm' | 'formwork' | 'rebar' | 'concrete', value: number | null) =>
                                  handleSpecialRowQuantityChangePure(processPlans, building.id, row.floorLabel, row.isSpecialRow, field, value, updateProcessPlan, markDirty);
                                const sqtyMax = (field: 'gangForm' | 'alForm' | 'formwork' | 'rebar' | 'concrete') =>
                                  getMaxAvailableForSpecialRowPure(processPlans, building, row.floorLabel, row.isSpecialRow, field);

                                // 특수 행(주차장, 3단 가시설 적용부, 6.5m이상)은 일수 계산 건너뛰기
                                if (row.isSpecialRow) {
                                  // 특수 행은 해당 지하층의 표준공정 적용
                                  let processType: ProcessType;
                                  if (row.floorLabel) {
                                    const floorMatch = row.floorLabel.match(/^(B\d+)/);
                                    if (floorMatch) {
                                      const basementFloorLabel = floorMatch[1];
                                      processType = getProcessTypeForFloor(plan, row.category, basementFloorLabel);
                                    } else {
                                      processType = plan?.processes[row.category as keyof typeof plan.processes]?.processType || DEFAULT_PROCESS_TYPES[row.category as keyof typeof DEFAULT_PROCESS_TYPES] || '표준공정';
                                    }
                                  } else {
                                    processType = plan?.processes[row.category as keyof typeof plan.processes]?.processType || DEFAULT_PROCESS_TYPES[row.category as keyof typeof DEFAULT_PROCESS_TYPES] || '표준공정';
                                  }
                                  const mod = getProcessModule(row.category, processType);

                                  // 확장 상태 확인 - 6.5m이상은 B1/B2 통합 expandKey 사용
                                  const expandKey = (row.isFirstHighCeiling || row.isSecondHighCeiling)
                                    ? `${row.category}-합산`
                                    : row.floorLabel
                                      ? `${row.category}-${row.floorLabel}`
                                      : row.category;
                                  const isExpanded = isDetailExpanded.has(expandKey);

                                  const isMultiLineRow = false;

                                  // 비활성 상태 체크 - 6.5m이상은 B1/B2 합산 판정
                                  const isRowActive = (row.isFirstHighCeiling || row.isSecondHighCeiling)
                                    ? isHighCeilingActive(building.id)
                                    : row.floorLabel ? isSpecialRowActive(building.id, row.floorLabel) : false;

                                  const categoryLabel = getBasementRowCategoryLabel(row);

                                  // B1+B2 합산 물량으로 순작업일 계산하는 헬퍼 (B1 행의 rowSpan 일수 셀에서 사용)
                                  return (
                                    <ProcessPlanTableRow
                                      key={`process-${row.category}-${row.floorLabel || ''}-${row.rowIndex}`}
                                      isExpanded={isExpanded}
                                    >
                                      {/* 첫 번째 열: 구분 항목 - B2(isSecondHighCeiling)는 rowSpan으로 병합되므로 렌더링 생략 */}
                                      {!row.isSecondHighCeiling && (
                                        <td
                                          className={`px-2 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800 align-middle ${!isRowActive ? 'opacity-40' : ''}`}
                                          style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                          {...(row.isFirstHighCeiling ? { rowSpan: 2 } : {})}
                                        >
                                          <div className="text-center">{categoryLabel}</div>
                                        </td>
                                      )}

                                      {/* 두 번째 열: 층수 - 항상 렌더링 (B1/B2 각각 표시) */}
                                      <td className={`px-2 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800 align-middle ${!isRowActive ? 'opacity-40' : ''}`} style={{ ...(isMultiLineRow ? {} : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }) }}>
                                        <div className="text-center font-normal">{row.floorLabel?.match(/^(B\d+)/)?.[1] || ''}</div>
                                      </td>

                                      {/* 형틀 합계 (읽기전용 - 갱폼+알폼+유로폼) */}
                                      <td className={`px-0.5 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle ${!isRowActive ? 'opacity-40' : ''}`}>
                                        <div className="text-xs font-medium text-zinc-500">
                                          {((sqty('gangForm') || 0) + (sqty('alForm') || 0) + (sqty('formwork') || 0)).toFixed(2)}
                                        </div>
                                      </td>
                                      {/* 갱폼 */}
                                      <td className="px-0.5 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle">
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={sqty('gangForm') || ''}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                            sqtyChange('gangForm', value);
                                          }}
                                          onBlur={(e) => {
                                            const parsed = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                            const max = sqtyMax('gangForm');
                                            const value = parsed !== null ? Math.min(parsed, max) : null;
                                            sqtyChange('gangForm', value);
                                          }}
                                          className="flex justify-center items-center text-center w-11 h-5 text-xs font-normal px-0.5 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                          placeholder="0"
                                          title={`갱폼 (최대: ${sqtyMax('gangForm').toFixed(2)})`}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </td>
                                      {/* 알폼 */}
                                      <td className="px-0.5 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle">
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={sqty('alForm') || ''}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                            sqtyChange('alForm', value);
                                          }}
                                          onBlur={(e) => {
                                            const parsed = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                            const max = sqtyMax('alForm');
                                            const value = parsed !== null ? Math.min(parsed, max) : null;
                                            sqtyChange('alForm', value);
                                          }}
                                          className="flex justify-center items-center text-center w-11 h-5 text-xs font-normal px-0.5 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                          placeholder="0"
                                          title={`알폼 (최대: ${sqtyMax('alForm').toFixed(2)})`}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </td>
                                      {/* 유로폼 */}
                                      <td className="px-0.5 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle">
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={sqty('formwork') || ''}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                            sqtyChange('formwork', value);
                                          }}
                                          onBlur={(e) => {
                                            const parsed = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                            const max = sqtyMax('formwork');
                                            const value = parsed !== null ? Math.min(parsed, max) : null;
                                            sqtyChange('formwork', value);
                                          }}
                                          className="flex justify-center items-center text-center w-11 h-5 text-xs font-normal px-0.5 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                          placeholder="0"
                                          title={`유로폼 (최대: ${sqtyMax('formwork').toFixed(2)})`}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </td>

                                      {/* 해체/정리 (형틀합계 × 2, 자동계산) - 비활성 시 회색 */}
                                      <td className={`px-0.5 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle ${!isRowActive ? 'opacity-40' : ''}`}>
                                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                          {(((sqty('gangForm') || 0) + (sqty('alForm') || 0) + (sqty('formwork') || 0)) * 2).toFixed(2)}
                                        </div>
                                      </td>

                                      {/* 철근 */}
                                      <td className="px-1 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle">
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={sqty('rebar') || ''}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                            sqtyChange('rebar', value);
                                          }}
                                          onBlur={(e) => {
                                            const parsed = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                            const max = sqtyMax('rebar');
                                            const value = parsed !== null ? Math.min(parsed, max) : null;
                                            sqtyChange('rebar', value);
                                          }}
                                          className="flex justify-center items-center text-center w-12 h-5 text-xs font-normal px-0.5 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                          placeholder="0"
                                          title={`철근 (최대: ${sqtyMax('rebar').toFixed(2)})`}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </td>

                                      {/* 콘크리트 */}
                                      <td className="px-1 py-0.5 text-center text-xs border-r-2 border-zinc-200 dark:border-zinc-800 align-middle">
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={sqty('concrete') || ''}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                            sqtyChange('concrete', value);
                                          }}
                                          onBlur={(e) => {
                                            const parsed = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                            const max = sqtyMax('concrete');
                                            const value = parsed !== null ? Math.min(parsed, max) : null;
                                            sqtyChange('concrete', value);
                                          }}
                                          className="flex justify-center items-center text-center w-12 h-5 text-xs font-normal px-0.5 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                          placeholder="0"
                                          title={`콘크리트 (최대: ${sqtyMax('concrete').toFixed(2)})`}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </td>

                                      {/* 공정타입 - B2(isSecondHighCeiling)는 rowSpan으로 병합되므로 렌더링 생략 */}
                                      {!row.isSecondHighCeiling && (
                                        <td
                                          className={`px-1 py-1 border-r border-zinc-200 dark:border-zinc-800 align-middle ${!isRowActive ? 'opacity-40' : ''}`}
                                          style={{ height: '24px' }}
                                          {...(row.isFirstHighCeiling ? { rowSpan: 2 } : {})}
                                        >
                                          <select
                                            value={processType}
                                            onChange={(e) => {
                                              handleProcessTypeChange(building.id, row.category, e.target.value as ProcessType, row.floorLabel);
                                            }}
                                            disabled={!isRowActive}
                                            className="w-full px-1 py-0.5 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                            {(PROCESS_TYPE_OPTIONS[row.category as keyof typeof PROCESS_TYPE_OPTIONS] || []).map(option => (
                                              <option key={option} value={option}>
                                                {option}
                                              </option>
                                            ))}
                                          </select>
                                        </td>
                                      )}

                                      {/* 세부공정 버튼 - B2(isSecondHighCeiling)는 rowSpan으로 병합되므로 렌더링 생략 */}
                                      {!row.isSecondHighCeiling && (
                                        <td
                                          className="px-1 py-1 border-r border-zinc-200 dark:border-zinc-800 align-middle"
                                          style={{ height: '24px' }}
                                          {...(row.isFirstHighCeiling ? { rowSpan: 2 } : {})}
                                        >
                                          {isRowActive && mod && mod.items.length > 0 && (
                                            <button
                                              onClick={() => {
                                                const expanded = expandedModules.get(building.id) || new Set<string>();
                                                const newExpanded = new Set<string>();
                                                if (!expanded.has(expandKey)) {
                                                  newExpanded.add(expandKey);
                                                }
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
                                      )}
                                    </ProcessPlanTableRow>
                                  );
                                }

                                // 지하층 공정계획에서는 버림, 기초, 지하층만 처리
                                const effectiveCategory = row.category;

                                // processType 결정 (주동 지하층/지하주차장/6.5m이상은 층별, 나머지는 카테고리별)
                                let processType: ProcessType;
                                if (row.floorLabel && (row.category === '주동 지하층' || row.category === '지하주차장' || row.category === '지하층(층고6.5m이상)')) {
                                  processType = getProcessTypeForFloor(plan, row.category, row.floorLabel);
                                } else {
                                  processType = plan?.processes[row.category as keyof typeof plan.processes]?.processType || DEFAULT_PROCESS_TYPES[row.category as keyof typeof DEFAULT_PROCESS_TYPES] || '표준공정';
                                }
                                const mod = getProcessModule(effectiveCategory, processType);

                                // 확장 상태 확인
                                const expandKey = row.floorLabel
                                  ? `${row.category}-${row.floorLabel}`
                                  : row.category;
                                const isExpanded = isDetailExpanded.has(expandKey);

                                // 물량 데이터 가져오기 - 특수 행 수량 차감 (공유 유틸리티 사용)
                                const rowDeductions = (row.category === '주동 지하층' && row.floorLabel && !row.isSpecialRow)
                                  ? getSpecialRowDeductions(plan?.specialRowQuantities, row.floorLabel)
                                  : undefined;

                                const rqty = (tradeField: TradeFieldKey, subField: TradeSubFieldKey, specialField: 'gangForm' | 'alForm' | 'formwork' | 'rebar' | 'concrete') =>
                                  resolveBasementQty(building, processPlans, row.category, row.floorLabel, row.isSpecialRow, tradeField, subField, specialField, rowDeductions);
                                const getGangFormQty = () => rqty('gangForm', 'areaM2', 'gangForm');
                                const getAlFormQty = () => rqty('alForm', 'areaM2', 'alForm');
                                const getEuroFormQty = () => rqty('euroForm', 'areaM2', 'formwork');
                                const getStripCleanQty = () => (getGangFormQty() + getAlFormQty() + getEuroFormQty()) * 2;
                                const getFormworkQuantity = () => getGangFormQty() + getAlFormQty() + getEuroFormQty();
                                const getRebarQuantity = () => rqty('rebar', 'ton', 'rebar');
                                const getConcreteQuantity = () => rqty('concrete', 'volumeM3', 'concrete');

                                return (
                                  <ProcessPlanTableRow
                                    key={`process-${row.category}-${row.floorLabel || ''}-${row.rowIndex}`}
                                    isExpanded={isExpanded}
                                  >
                                    {/* 첫 번째 열: 구분 항목 */}
                                    <td className="px-2 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: row.isSpecialRow ? 'auto' : '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      <div className="text-center">{getBasementRowCategoryLabel(row)}</div>
                                    </td>

                                    {/* 두 번째 열: 층수 */}
                                    <td className="px-2 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: row.isSpecialRow ? 'auto' : '24px', width: '115px', ...(row.floorLabel?.includes('3단 가시설 적용부') ? {} : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }) }}>
                                      <div className="text-center font-normal">{getBasementRowFloorNumberLabel(row)}</div>
                                    </td>

                                    {/* 형틀 합계 */}
                                    <td className="relative px-0.5 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '32px' }}>
                                      {row.isSpecialRow ? (
                                        <div className="text-xs font-medium text-zinc-500">
                                          {((sqty('gangForm') || 0) + (sqty('alForm') || 0) + (sqty('formwork') || 0)).toFixed(2)}
                                        </div>
                                      ) : (
                                        <>
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'formworkTotal', maxFloorNumber) && (
                                            <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                              {getCellReferenceForRow(row.category, row.floorLabel, 'formworkTotal', maxFloorNumber)}
                                            </span>
                                          )}
                                          <div className="text-xs font-medium">
                                            {getFormworkQuantity() > 0 ? getFormworkQuantity().toFixed(2) : '0.00'}
                                          </div>
                                        </>
                                      )}
                                    </td>
                                    {/* 갱폼 */}
                                    <td className="relative px-0.5 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '32px' }}>
                                      {row.isSpecialRow ? (
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={sqty('gangForm') || ''}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                            sqtyChange('gangForm', value);
                                          }}
                                          onBlur={(e) => {
                                            const parsed = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                            const max = sqtyMax('gangForm');
                                            const value = parsed !== null ? Math.min(parsed, max) : null;
                                            sqtyChange('gangForm', value);
                                          }}
                                          className="flex justify-center items-center text-center w-11 h-5 text-xs font-normal px-0.5 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                          placeholder="0"
                                          title={`갱폼 (최대: ${sqtyMax('gangForm').toFixed(2)})`}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      ) : (
                                        <>
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'gangForm', maxFloorNumber) && (
                                            <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                              {getCellReferenceForRow(row.category, row.floorLabel, 'gangForm', maxFloorNumber)}
                                            </span>
                                          )}
                                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {getGangFormQty() > 0 ? getGangFormQty().toFixed(2) : '0.00'}
                                          </div>
                                        </>
                                      )}
                                    </td>
                                    {/* 알폼 */}
                                    <td className="relative px-0.5 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '32px' }}>
                                      {row.isSpecialRow ? (
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={sqty('alForm') || ''}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                            sqtyChange('alForm', value);
                                          }}
                                          onBlur={(e) => {
                                            const parsed = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                            const max = sqtyMax('alForm');
                                            const value = parsed !== null ? Math.min(parsed, max) : null;
                                            sqtyChange('alForm', value);
                                          }}
                                          className="flex justify-center items-center text-center w-11 h-5 text-xs font-normal px-0.5 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                          placeholder="0"
                                          title={`알폼 (최대: ${sqtyMax('alForm').toFixed(2)})`}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      ) : (
                                        <>
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'alForm', maxFloorNumber) && (
                                            <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                              {getCellReferenceForRow(row.category, row.floorLabel, 'alForm', maxFloorNumber)}
                                            </span>
                                          )}
                                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {getAlFormQty() > 0 ? getAlFormQty().toFixed(2) : '0.00'}
                                          </div>
                                        </>
                                      )}
                                    </td>
                                    {/* 유로폼 */}
                                    <td className="relative px-0.5 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '32px' }}>
                                      {row.isSpecialRow ? (
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={sqty('formwork') || ''}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                            sqtyChange('formwork', value);
                                          }}
                                          onBlur={(e) => {
                                            const parsed = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                            const max = sqtyMax('formwork');
                                            const value = parsed !== null ? Math.min(parsed, max) : null;
                                            sqtyChange('formwork', value);
                                          }}
                                          className="flex justify-center items-center text-center w-11 h-5 text-xs font-normal px-0.5 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                          placeholder="0"
                                          title={`유로폼 (최대: ${sqtyMax('formwork').toFixed(2)})`}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      ) : (
                                        <>
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'euroForm', maxFloorNumber) && (
                                            <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                              {getCellReferenceForRow(row.category, row.floorLabel, 'euroForm', maxFloorNumber)}
                                            </span>
                                          )}
                                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {getEuroFormQty() > 0 ? getEuroFormQty().toFixed(2) : '0.00'}
                                          </div>
                                        </>
                                      )}
                                    </td>

                                    {/* 해체/정리 (유로폼 × 2, 자동계산) */}
                                    <td className="relative px-0.5 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '32px' }}>
                                      {getCellReferenceForRow(row.category, row.floorLabel, 'stripClean', maxFloorNumber) && (
                                        <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'stripClean', maxFloorNumber)}
                                        </span>
                                      )}
                                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {getStripCleanQty() > 0 ? getStripCleanQty().toFixed(2) : '0.00'}
                                      </div>
                                    </td>

                                    {/* 철근 */}
                                    <td className="relative px-1 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '32px' }}>
                                      {row.isSpecialRow ? (
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={getRebarQuantity() || ''}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                            sqtyChange('rebar', value);
                                          }}
                                          onBlur={(e) => {
                                            const parsed = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                            const max = sqtyMax('rebar');
                                            const value = parsed !== null ? Math.min(parsed, max) : null;
                                            sqtyChange('rebar', value);
                                          }}
                                          className="flex justify-center items-center text-center w-12 h-5 text-xs font-normal px-0.5 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                          placeholder="0"
                                          title={`철근 (최대: ${sqtyMax('rebar').toFixed(2)})`}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      ) : (
                                        <>
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'rebar', maxFloorNumber) && (
                                            <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                              {getCellReferenceForRow(row.category, row.floorLabel, 'rebar', maxFloorNumber)}
                                            </span>
                                          )}
                                          <div className="text-xs">
                                            {getRebarQuantity() > 0 ? getRebarQuantity().toFixed(2) : '0.00'}
                                          </div>
                                        </>
                                      )}
                                    </td>

                                    {/* 콘크리트 */}
                                    <td className="relative px-1 py-0.5 text-center text-xs border-r-2 border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '32px' }}>
                                      {row.isSpecialRow ? (
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={getConcreteQuantity() || ''}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                            sqtyChange('concrete', value);
                                          }}
                                          onBlur={(e) => {
                                            const parsed = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                            const max = sqtyMax('concrete');
                                            const value = parsed !== null ? Math.min(parsed, max) : null;
                                            sqtyChange('concrete', value);
                                          }}
                                          className="flex justify-center items-center text-center w-12 h-5 text-xs font-normal px-0.5 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                          placeholder="0"
                                          title={`콘크리트 (최대: ${sqtyMax('concrete').toFixed(2)})`}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      ) : (
                                        <>
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'concrete', maxFloorNumber) && (
                                            <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                              {getCellReferenceForRow(row.category, row.floorLabel, 'concrete', maxFloorNumber)}
                                            </span>
                                          )}
                                          <div className="text-xs">
                                            {getConcreteQuantity() > 0 ? getConcreteQuantity().toFixed(2) : '0.00'}
                                          </div>
                                        </>
                                      )}
                                    </td>

                                    {/* 일곱 번째 열: 셀렉트박스 */}
                                    <td className="px-1 py-1 border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '32px' }}>
                                      {/* 일반 지하층 행은 항상 표준공정 드롭다운 표시 */}
                                      <select
                                        value={processType}
                                        onChange={(e) => {
                                          // 지하층 공정계획에서는 지하층만 처리
                                          handleProcessTypeChange(building.id, row.category, e.target.value as ProcessType, row.floorLabel);
                                        }}
                                        className="w-full px-1 py-0.5 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      >
                                        {(PROCESS_TYPE_OPTIONS[effectiveCategory as keyof typeof PROCESS_TYPE_OPTIONS] || []).map(option => (
                                          <option key={option} value={option}>
                                            {option}
                                          </option>
                                        ))}
                                      </select>
                                    </td>

                                    {/* 여덟 번째 열: 세부공정 버튼 */}
                                    <td className="px-1 py-1 border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '32px' }}>
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

                        // 확장된 행 찾기 - 6.5m이상은 통합 expandKey 사용
                        const expandedRow = processRows.find((col) => {
                          const expandKey = (col.isFirstHighCeiling || col.isSecondHighCeiling)
                            ? `${col.category}-합산`
                            : col.floorLabel
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
                          if (row.category === '주동 지하층' && row.floorLabel) {
                            return `주동 지하층 ${row.floorLabel}`;
                          }
                          if (row.category === '지하층(층고6.5m이상)') {
                            return '지하층(6.5m이상) B1+B2';
                          }
                          if (row.category === '지하주차장') {
                            return row.floorLabel || '지하주차장';
                          }
                          return row.category;
                        };

                        return (
                          <ProcessPlanDetailCard
                            expandedRow={expandedRow || null}
                            getCategoryDisplayName={getCategoryDisplayName}
                          >
                            {(selectedRow) => {
                              // 주차장/3단 가시설/6.5m이상 특수 행 처리
                              const isParking = selectedRow.floorLabel?.includes('주차장');
                              const isFacility = selectedRow.floorLabel?.includes('3단 가시설 적용부');
                              const isHighCeiling = selectedRow.floorLabel?.includes('6.5m이상');
                              const isSpecialRow = isParking || isFacility || isHighCeiling;

                              let targetFloorLabel = selectedRow.floorLabel;
                              if (isSpecialRow && selectedRow.floorLabel) {
                                const floorMatch = selectedRow.floorLabel.match(/^(B\d+)/);
                                if (floorMatch) {
                                  targetFloorLabel = floorMatch[1];
                                }
                              }

                              const expandedProcessType = selectedRow.floorLabel && (selectedRow.category === '주동 지하층' || selectedRow.category === '지하주차장' || selectedRow.category === '지하층(층고6.5m이상)')
                                ? getProcessTypeForFloor(plan, selectedRow.category, targetFloorLabel || selectedRow.floorLabel)
                                : plan?.processes[selectedRow.category as keyof typeof plan.processes]?.processType || DEFAULT_PROCESS_TYPES[selectedRow.category as keyof typeof DEFAULT_PROCESS_TYPES] || '표준공정';
                              const expandedModule = getProcessModule(selectedRow.category, expandedProcessType) || null;

                              return (
                                <ProcessDetailPanel
                                  building={building!}
                                  expandedRow={selectedRow}
                                  module={expandedModule}
                                  plan={plan}
                                  processRows={processRows}
                                  onDirectWorkDaysChange={(itemKey, value) => handleItemDirectWorkDaysChange(building!.id, itemKey, value)}
                                  specialRowQuantities={(() => {
                                    if (!isHighCeiling || !plan?.specialRowQuantities) return plan?.specialRowQuantities;
                                    // B1+B2 합산 물량을 B1 키로 통합
                                    const b1Qty = plan.specialRowQuantities['B1 6.5m이상'] || {};
                                    const b2Qty = plan.specialRowQuantities['B2 6.5m이상'] || {};
                                    return {
                                      ...plan.specialRowQuantities,
                                      ['B1 6.5m이상']: {
                                        gangForm: (b1Qty.gangForm || 0) + (b2Qty.gangForm || 0),
                                        alForm: (b1Qty.alForm || 0) + (b2Qty.alForm || 0),
                                        formwork: (b1Qty.formwork || 0) + (b2Qty.formwork || 0),
                                        rebar: (b1Qty.rebar || 0) + (b2Qty.rebar || 0),
                                        concrete: (b1Qty.concrete || 0) + (b2Qty.concrete || 0),
                                      },
                                    };
                                  })()}
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
                지하층 공정계획을 입력하려면 먼저 <br />
                <span className="font-medium text-primary-600 dark:text-primary-400">&quot;동 기본정보&quot;</span> 탭에서 동을 생성해주세요.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
