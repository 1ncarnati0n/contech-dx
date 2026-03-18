'use client';

import { Layers, Info, Lock, Calculator, Truck, Settings } from 'lucide-react';
import { Card, Button, Badge, Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/shared/components/ui';
import type { ProcessModule, ProcessItem } from '@/features/building/data/process-modules';
import type { ProcessCategory } from '@/shared/types';
import {
  type CalculationMethod,
  getCalculationMethod,
  getCalculationMethodConfig,
  getCalculationSteps,
  getSemanticReferenceDisplay,
} from '../service/process-module-helpers';
import { useProcessModuleTab } from '../service/useProcessModuleTab';

interface ProcessModuleSectionProps {
  modules: ProcessModule[];
  onOpenAdvancedModal?: (category: ProcessCategory, processType?: string) => void;
}

// 계산 방식별 아이콘 매핑 (뷰 관심사)
const CALCULATION_METHOD_ICONS: Record<CalculationMethod, typeof Lock> = {
  fixed: Lock,
  'quantity-based': Calculator,
  'equipment-based': Truck,
};

function CalculationMethodBadge({ method }: { method: CalculationMethod }) {
  const config = getCalculationMethodConfig(method);
  const IconComponent = CALCULATION_METHOD_ICONS[method];

  return (
    <Badge variant={config.variant} className="text-xs">
      <IconComponent className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

function QuantityReferenceBadge({ item }: { item: ProcessItem }) {
  const { badge, tooltip } = getSemanticReferenceDisplay(item.quantityRef, item.quantityReference);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary" className="text-xs cursor-help">
          {badge} 참조
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function ProcessModuleSection({
  modules,
  onOpenAdvancedModal,
}: ProcessModuleSectionProps) {
  const {
    tabs,
    activeTab,
    setActiveTab,
    categoryModules,
    primaryModule,
    currentCategory,
    selectCycle,
  } = useProcessModuleTab({ modules });

  return (
    <TooltipProvider>
      <Card className="p-0 overflow-hidden">
      {/* 섹션 헤더 */}
      <div className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <Layers className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              공정 모듈
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              구분별 세부공정 항목 및 기준값 설정
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onOpenAdvancedModal && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenAdvancedModal(currentCategory, primaryModule?.name)}
              className="gap-1"
            >
              <Settings className="w-3.5 h-3.5" />
              고급 편집
            </Button>
          )}
        </div>
      </div>

      {/* 섹션 콘텐츠 */}
      <div className="border-t border-zinc-200 dark:border-zinc-700">
          {/* 카테고리 탭 */}
          <div className="flex items-center gap-1 p-2 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#ffff1d] text-zinc-900 dark:bg-[#ffff1d] dark:text-zinc-900 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 공정타입 서브탭 */}
          {categoryModules.length === 1 ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-100/50 dark:bg-zinc-800/30 border-b border-zinc-200 dark:border-zinc-700">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 shrink-0">공정타입:</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-violet-600 text-white shadow-sm">
                표준공정
              </span>
            </div>
          ) : categoryModules.length > 1 ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-100/50 dark:bg-zinc-800/30 border-b border-zinc-200 dark:border-zinc-700">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 shrink-0">공정타입:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {categoryModules.map((m) => {
                  const isSelected = primaryModule?.id === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => selectCycle(m.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                        isSelected
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'bg-white dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-300 border border-zinc-200 dark:border-zinc-600'
                      }`}
                    >
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* 모듈 테이블 */}
          <div className="overflow-x-auto">
            {primaryModule ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                      #
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700 min-w-[150px]">
                      공정명
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                      단위
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                      인당생산성
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                      순작업일
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                      간접작업일
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                      간접작업명
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700 min-w-[280px]">
                      산정기준
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  {primaryModule.items.map((item, index) => (
                    <tr
                      key={item.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">
                        {index + 1}
                      </td>
                      <td className="px-3 py-2 font-medium text-zinc-900 dark:text-white">
                        {item.workItem}
                        {item.floorLabel && (
                          <span className="ml-1 text-xs text-zinc-400">
                            ({item.floorLabel})
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-zinc-600 dark:text-zinc-400">
                        {item.unit || '-'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-zinc-900 dark:text-white">
                          {item.dailyProductivity || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-zinc-900 dark:text-white">
                          {item.directWorkDays ?? (
                            <span className="text-blue-500 text-xs">계산</span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-zinc-900 dark:text-white">
                          {item.indirectDays}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                        {item.indirectWorkItem || '-'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CalculationMethodBadge method={getCalculationMethod(item)} />

                          {(item.quantityRef || item.quantityReference) && (
                            <QuantityReferenceBadge item={item} />
                          )}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                aria-label="계산 과정 보기"
                              >
                                <Info className="w-4 h-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-sm">
                              <div className="space-y-1">
                                <p className="text-xs font-semibold mb-2">계산 단계:</p>
                                {getCalculationSteps(getCalculationMethod(item), item).map((step, idx) => (
                                  <p key={idx} className="text-xs text-zinc-600 dark:text-zinc-400">
                                    {step}
                                  </p>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>

                          {item.calculationBasis && (
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                              {item.calculationBasis}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                해당 카테고리의 공정 모듈이 없습니다.
              </div>
            )}
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
}
