'use client';

import { useState, useMemo } from 'react';
import { Layers, Edit2, RotateCcw, Edit, Save, X } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { PROCESS_MODULES, type ProcessModule, type ProcessItem } from '@/lib/data/process-modules';
import type { ProcessCategory } from '@/lib/types';

interface ProcessModuleSectionProps {
  isEditing: boolean;
  modules: ProcessModule[];
  hasChanges?: boolean;
  onModuleChange?: (modules: ProcessModule[]) => void;
  onResetToDefault?: () => void;
  onToggleEditing?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
}

// 카테고리 탭 정의
const CATEGORY_TABS: { id: ProcessCategory; label: string }[] = [
  { id: '버림', label: '버림' },
  { id: '기초', label: '기초' },
  { id: '지하층', label: '지하층' },
  { id: '셋팅층', label: '셋팅층' },
  { id: '기준층', label: '기준층' },
  { id: '옥탑층', label: '옥탑층' },
];

export function ProcessModuleSection({
  isEditing,
  modules,
  hasChanges,
  onModuleChange,
  onResetToDefault,
  onToggleEditing,
  onSave,
  onCancel,
}: ProcessModuleSectionProps) {
  const [activeCategory, setActiveCategory] = useState<ProcessCategory>('버림');

  // 현재 카테고리의 모듈들 필터링
  const categoryModules = useMemo(() => {
    return modules.filter((m) => m.category === activeCategory);
  }, [modules, activeCategory]);

  // 표준공정 모듈 찾기 (첫 번째 것 사용)
  const primaryModule = categoryModules[0];

  // 셀 값 변경 핸들러
  const handleCellChange = (
    moduleId: string,
    itemId: string,
    field: keyof ProcessItem,
    value: string | number
  ) => {
    if (!onModuleChange) return;

    const updatedModules = modules.map((module) => {
      if (module.id !== moduleId) return module;

      return {
        ...module,
        items: module.items.map((item) => {
          if (item.id !== itemId) return item;

          return {
            ...item,
            [field]: typeof value === 'string' ? (isNaN(Number(value)) ? value : Number(value)) : value,
          };
        }),
      };
    });

    onModuleChange(updatedModules);
  };

  return (
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
          {/* 편집/저장/취소 버튼 */}
          {isEditing ? (
            <>
              {onResetToDefault && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onResetToDefault}
                  className="gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  기본값
                </Button>
              )}
              {onCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                  className="gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  취소
                </Button>
              )}
              {onSave && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onSave}
                  disabled={!hasChanges}
                  className="gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  저장
                </Button>
              )}
            </>
          ) : (
            onToggleEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleEditing}
                className="gap-1"
              >
                <Edit className="w-3.5 h-3.5" />
                편집
              </Button>
            )
          )}
        </div>
      </div>

      {/* 변경 사항 알림 배너 */}
      {hasChanges && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-sm text-amber-700 dark:text-amber-300">
            저장되지 않은 변경 사항이 있습니다.
          </span>
        </div>
      )}

      {/* 섹션 콘텐츠 */}
      <div className="border-t border-zinc-200 dark:border-zinc-700">
          {/* 카테고리 탭 */}
          <div className="flex items-center gap-1 p-2 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700 overflow-x-auto">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeCategory === tab.id
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
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
                    <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
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
                        {isEditing ? (
                          <input
                            type="number"
                            value={item.dailyProductivity}
                            onChange={(e) =>
                              handleCellChange(
                                primaryModule.id,
                                item.id,
                                'dailyProductivity',
                                e.target.value
                              )
                            }
                            className="w-20 px-2 py-1 text-right border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <span className="text-zinc-900 dark:text-white">
                            {item.dailyProductivity || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={item.directWorkDays ?? ''}
                            onChange={(e) =>
                              handleCellChange(
                                primaryModule.id,
                                item.id,
                                'directWorkDays',
                                e.target.value
                              )
                            }
                            className="w-20 px-2 py-1 text-right border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="계산"
                          />
                        ) : (
                          <span className="text-zinc-900 dark:text-white">
                            {item.directWorkDays ?? (
                              <span className="text-blue-500 text-xs">계산</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.5"
                            value={item.indirectDays}
                            onChange={(e) =>
                              handleCellChange(
                                primaryModule.id,
                                item.id,
                                'indirectDays',
                                e.target.value
                              )
                            }
                            className="w-20 px-2 py-1 text-right border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <span className="text-zinc-900 dark:text-white">
                            {item.indirectDays}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                        {item.indirectWorkItem || '-'}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {item.calculationBasis || '-'}
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

          {/* 편집 힌트 */}
          {isEditing && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-t border-zinc-200 dark:border-zinc-700">
              <Edit2 className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm text-yellow-700 dark:text-yellow-300">
                테이블의 숫자를 직접 클릭하여 수정할 수 있습니다.
              </span>
            </div>
          )}
        </div>
    </Card>
  );
}
