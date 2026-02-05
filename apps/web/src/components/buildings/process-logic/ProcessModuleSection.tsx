'use client';

import { useState, useMemo } from 'react';
import { Layers, Info, Lock, Calculator, Truck, Settings } from 'lucide-react';
import { Card, Button, Badge, Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui';
import { PROCESS_MODULES, type ProcessModule, type ProcessItem } from '@/lib/data/process-modules';
import type { ProcessCategory } from '@/lib/types';

interface ProcessModuleSectionProps {
  modules: ProcessModule[];
  onOpenAdvancedModal?: (category: ProcessCategory) => void;
}

// ============================================
// Helper Functions
// ============================================

type CalculationMethod = 'fixed' | 'quantity-based' | 'equipment-based';

/**
 * ProcessItem의 계산 방식 판별
 */
function getCalculationMethod(item: ProcessItem): CalculationMethod {
  if (item.directWorkDays !== undefined && item.directWorkDays > 0) {
    return 'fixed';
  }
  if (item.equipmentCalculationBase !== undefined &&
      item.equipmentWorkersPerUnit !== undefined) {
    return 'equipment-based';
  }
  return 'quantity-based';
}

/**
 * 계산 방식별 설정 반환
 */
function getCalculationMethodConfig(method: CalculationMethod) {
  const configs = {
    fixed: {
      variant: 'info' as const,
      icon: Lock,
      label: '일수고정',
    },
    'quantity-based': {
      variant: 'success' as const,
      icon: Calculator,
      label: '물량계산',
    },
    'equipment-based': {
      variant: 'warning' as const,
      icon: Truck,
      label: '장비기반',
    },
  };
  return configs[method];
}

/**
 * 계산 단계 텍스트 생성
 */
function getCalculationSteps(method: CalculationMethod, item: ProcessItem): string[] {
  switch (method) {
    case 'fixed':
      return [
        '1. 순작업일: 고정값 사용',
        '2. 총투입인원 = CEILING(수량 / 인당생산성)',
        '3. 1일투입인원 = ROUNDUP(총투입인원 / 순작업일)',
      ];

    case 'equipment-based':
      return [
        '1. 장비대수 = CEILING(MIN(최대값, 수량/대당타설량))',
        `2. 1일투입인원 = 장비대수 × ${item.equipmentWorkersPerUnit || 4}명`,
        '3. 순작업일 = ROUND(수량 / (인당생산성 × 1일투입인원))',
        '4. 총투입인원 = 1일투입인원 × 순작업일',
      ];

    case 'quantity-based':
      return [
        '1. 총투입인원 = CEILING(수량 / 인당생산성)',
        '2. 1일투입인원 = CEILING(총투입인원 / 장비대수)',
        '3. 순작업일 = ROUND(수량 / (인당생산성 × 1일투입인원))',
      ];
  }
}

/**
 * 물량 참조 표시 변환
 */
function getQuantityReferenceLabel(reference: string): string {
  return reference.replace('*', '×');
}

/**
 * 물량 참조 상세 설명
 */
function getQuantityReferenceDescription(reference: string): string {
  const match = reference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
  if (!match) return reference;

  const [, col, row, ratio] = match;
  const rowNum = parseInt(row, 10);

  const columnNames: Record<string, string> = {
    B: '갱폼', C: '알폼', D: '형틀',
    E: '해체/정리', F: '철근', G: '콘크리트',
  };

  let rowName = '';
  if (rowNum === 6) rowName = '버림';
  else if (rowNum === 7) rowName = '기초';
  else if (rowNum === 8) rowName = 'B2';
  else if (rowNum === 9) rowName = 'B1';
  else if (rowNum >= 11 && rowNum <= 25) rowName = `${rowNum - 10}F`;
  else if (rowNum === 26) rowName = 'PH1';
  else if (rowNum === 27) rowName = 'PH2';
  else if (rowNum === 28) rowName = 'PH3';

  const colName = columnNames[col] || col;
  const ratioStr = ratio ? ` × ${ratio}` : '';

  return `물량입력표 ${col}${row} (${rowName} ${colName})${ratioStr}`;
}

// 탭 ID 타입 확장 (지하층 변형 탭 추가)
type TabId = ProcessCategory | '지하층(층고6.5m이상)' | '지하층(피트층포함)';

// 카테고리 탭 정의 - processType 필드로 동일 카테고리 내 변형 구분
const CATEGORY_TABS: { id: TabId; label: string; category: ProcessCategory; processType?: string }[] = [
  { id: '버림', label: '버림', category: '버림' },
  { id: '기초', label: '기초', category: '기초' },
  { id: '주동 지하층', label: '주동 지하층', category: '주동 지하층' },
  { id: '지하층(층고6.5m이상)', label: '지하층(층고6.5m이상)', category: '주동 지하층', processType: '층고6.5m이상' },
  { id: '지하층(피트층포함)', label: '지하층(피트층포함)', category: '주동 지하층', processType: '피트층포함' },
  { id: '지하주차장', label: '지하주차장', category: '지하주차장' },
  { id: '일반층', label: '일반층', category: '일반층' },
  { id: '셋팅층', label: '셋팅층', category: '셋팅층' },
  { id: '기준층', label: '기준층', category: '기준층' },
  { id: '최상층', label: '최상층', category: '최상층' },
  { id: '옥탑층', label: '옥탑층', category: '옥탑층' },
];

export function ProcessModuleSection({
  modules,
  onOpenAdvancedModal,
}: ProcessModuleSectionProps) {
  const [activeTab, setActiveTab] = useState<TabId>('버림');

  // ============================================
  // Internal Components
  // ============================================

  /**
   * 계산 방식 뱃지 컴포넌트
   */
  function CalculationMethodBadge({ method }: { method: CalculationMethod }) {
    const config = getCalculationMethodConfig(method);
    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant} className="text-xs">
        <IconComponent className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  }

  /**
   * 물량 참조 뱃지 컴포넌트
   */
  function QuantityReferenceBadge({ reference }: { reference: string }) {
    const label = getQuantityReferenceLabel(reference);
    const description = getQuantityReferenceDescription(reference);

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="text-xs cursor-help">
            {label} 참조
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{description}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // 현재 탭에 해당하는 모듈들 필터링
  const categoryModules = useMemo(() => {
    const currentTab = CATEGORY_TABS.find(t => t.id === activeTab);
    if (!currentTab) return [];

    return modules.filter((m) => {
      // 카테고리가 일치하지 않으면 제외
      if (m.category !== currentTab.category) return false;

      // processType이 지정된 탭인 경우 해당 타입만 필터링
      if (currentTab.processType) {
        return m.name === currentTab.processType;
      }

      // processType이 없는 기본 탭에서는 '층고6.5m이상' 변형 제외
      return m.name !== '층고6.5m이상';
    });
  }, [modules, activeTab]);

  // 표준공정 모듈 찾기 (첫 번째 것 사용)
  const primaryModule = categoryModules[0];

  // 현재 탭의 실제 카테고리 가져오기 (고급 편집용)
  const currentCategory = useMemo(() => {
    const currentTab = CATEGORY_TABS.find(t => t.id === activeTab);
    return currentTab?.category || (activeTab as ProcessCategory);
  }, [activeTab]);

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
          {/* 고급 편집 버튼 */}
          {onOpenAdvancedModal && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenAdvancedModal(currentCategory)}
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
            {CATEGORY_TABS.map((tab) => (
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
                      간접일
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                      간접작업
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
                          {/* 계산 방식 뱃지 */}
                          <CalculationMethodBadge method={getCalculationMethod(item)} />

                          {/* 물량 참조 뱃지 (있을 경우만) */}
                          {item.quantityReference && (
                            <QuantityReferenceBadge reference={item.quantityReference} />
                          )}

                          {/* 정보 아이콘 + 툴팁 */}
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

                          {/* 기존 산정기준 텍스트 */}
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
