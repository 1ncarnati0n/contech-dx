'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';

import { Badge } from '@/components/ui/Badge';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/Tooltip';
import type { ProcessModule, ProcessItem } from '@/lib/data/process-modules';
import type { ProcessCategory } from '@/lib/types';
import { Info, GripVertical, Calculator, Truck, Lock } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


// ============================================
// 계산 방식 판별 유틸 (ProcessModuleSection.tsx와 동일)
// ============================================

type CalculationMethod = 'fixed' | 'quantity-based' | 'equipment-based';

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

interface ProcessModuleEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modules: ProcessModule[];
  activeCategory: ProcessCategory;
  activeProcessType?: string; // 선택된 공정타입 (예: "6일 사이클")
  onSave: (updatedModules: ProcessModule[]) => void;
  projectId: string;
  equipmentBaseForCategory: number; // 현재 카테고리의 프리셋 값
}

type EditableField = 'dailyProductivity' | 'directWorkDays' | 'indirectDays' | 'equipmentWorkersPerUnit' | 'quantityReference';

// Sortable Row 컴포넌트
interface SortableRowProps {
  item: ProcessItem & { moduleId: string; moduleName: string };
  isChanged: boolean;
  activeCategory: ProcessCategory;
  equipmentBaseForCategory: number;
  fieldErrors: Record<string, string>;
  getFieldValue: (item: ProcessItem & { moduleId: string }, field: EditableField) => string;
  handleFieldChange: (moduleId: string, itemId: string, field: EditableField, value: string) => void;
}

function SortableRow({
  item,
  isChanged,
  activeCategory,
  equipmentBaseForCategory,
  fieldErrors,
  getFieldValue,
  handleFieldChange,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`
        border-b border-zinc-200 dark:border-zinc-700
        hover:bg-zinc-50 dark:hover:bg-zinc-800/50
        ${isChanged ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''}
      `}
    >
      <td className="px-2 py-2 align-middle">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      <td className="px-2 py-2 align-middle">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="font-medium text-zinc-900 dark:text-white truncate max-w-[180px]"
            title={item.workItem}
          >
            {item.workItem}
          </span>
          {isChanged && (
            <Badge variant="warning" className="text-xs flex-shrink-0 bg-orange-500 dark:bg-orange-600 text-white">
              변경
            </Badge>
          )}
        </div>
      </td>
      <td className="px-2 py-2 align-middle">
        {item.floorLabel ? (
          <Badge
            variant={
              item.floorLabel.startsWith('B') ? 'info' :
              item.floorLabel.startsWith('옥탑') || item.floorLabel.startsWith('PH') ? 'warning' :
              'secondary'
            }
            className="text-xs font-mono"
          >
            {item.floorLabel}
          </Badge>
        ) : (
          <span className="text-zinc-400 dark:text-zinc-500 text-xs text-center block">-</span>
        )}
      </td>
      <td className="px-2 py-2 align-middle">
        <Badge
          variant={item.moduleName === '표준공정' ? 'secondary' : 'info'}
          className="text-xs whitespace-nowrap"
        >
          {item.moduleName}
        </Badge>
      </td>
      <td className="px-2 py-2 align-middle">
        <Input
          type="number"
          value={getFieldValue(item, 'dailyProductivity')}
          onChange={(e) => handleFieldChange(item.moduleId, item.id, 'dailyProductivity', e.target.value)}
          className={`
            w-20 px-2 py-1.5 h-auto text-right text-sm
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${fieldErrors[`${item.id}-dailyProductivity`] ? 'border-red-500 dark:border-red-400 focus:ring-red-500' : ''}
          `}
          title={fieldErrors[`${item.id}-dailyProductivity`]}
        />
      </td>
      <td className="px-2 py-2 align-middle">
        {item.directWorkDays === undefined ? (
          (() => {
            const method = getCalculationMethod(item);
            const config = getCalculationMethodConfig(method);
            const steps = getCalculationSteps(method, item);
            const IconComponent = config.icon;
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex">
                    <Badge variant={config.variant} className="text-xs cursor-help gap-1">
                      <IconComponent className="w-3 h-3" />
                      {config.label}
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs font-semibold mb-1">계산 단계:</p>
                  {steps.map((step, idx) => (
                    <p key={idx} className="text-xs text-zinc-600 dark:text-zinc-400">{step}</p>
                  ))}
                </TooltipContent>
              </Tooltip>
            );
          })()
        ) : (
          <Input
            type="number"
            value={getFieldValue(item, 'directWorkDays')}
            onChange={(e) => handleFieldChange(item.moduleId, item.id, 'directWorkDays', e.target.value)}
            className={`
              w-20 px-2 py-1.5 h-auto text-right text-sm
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              ${fieldErrors[`${item.id}-directWorkDays`] ? 'border-red-500 dark:border-red-400 focus:ring-red-500' : ''}
            `}
            placeholder="0"
            title={fieldErrors[`${item.id}-directWorkDays`]}
          />
        )}
      </td>
      <td className="px-2 py-2 align-middle">
        <Input
          type="number"
          value={getFieldValue(item, 'indirectDays')}
          onChange={(e) => handleFieldChange(item.moduleId, item.id, 'indirectDays', e.target.value)}
          className={`
            w-20 px-2 py-1.5 h-auto text-right text-sm
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${fieldErrors[`${item.id}-indirectDays`] ? 'border-red-500 dark:border-red-400 focus:ring-red-500' : ''}
          `}
          title={fieldErrors[`${item.id}-indirectDays`]}
        />
      </td>
      <td className="px-2 py-2 align-middle bg-zinc-50 dark:bg-zinc-800/50">
        {item.equipmentCalculationBase !== undefined ? (
          <div className="flex items-center justify-end gap-1">
            <Badge variant="secondary" className="text-xs font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              {activeCategory}: {equipmentBaseForCategory}㎥
            </Badge>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs font-semibold">프리셋 참조 값</p>
                <p className="text-xs">부위별 대당 타설량에서 수정 가능</p>
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <span className="text-zinc-400 dark:text-zinc-500 text-xs text-right block">-</span>
        )}
      </td>
      <td className="px-2 py-2 align-middle">
        <Input
          type="number"
          value={getFieldValue(item, 'equipmentWorkersPerUnit')}
          onChange={(e) => handleFieldChange(item.moduleId, item.id, 'equipmentWorkersPerUnit', e.target.value)}
          className={`
            w-20 px-2 py-1.5 h-auto text-right text-sm
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${fieldErrors[`${item.id}-equipmentWorkersPerUnit`] ? 'border-red-500 dark:border-red-400 focus:ring-red-500' : ''}
          `}
          placeholder="0"
          title={fieldErrors[`${item.id}-equipmentWorkersPerUnit`]}
        />
      </td>
      <td className="px-2 py-2 align-middle">
        <Input
          type="text"
          value={getFieldValue(item, 'quantityReference')}
          onChange={(e) => handleFieldChange(item.moduleId, item.id, 'quantityReference', e.target.value)}
          className="w-20 px-2 py-1.5 h-auto text-sm"
          placeholder="-"
        />
      </td>
    </tr>
  );
}

/**
 * 공정모듈 고급 편집 모달
 *
 * 5개 필드를 개별 편집할 수 있습니다.
 * equipmentCalculationBase는 프리셋 참조 값으로 읽기 전용입니다.
 */
export function ProcessModuleEditModal({
  open,
  onOpenChange,
  modules,
  activeCategory,
  activeProcessType,
  onSave,
  projectId,
  equipmentBaseForCategory,
}: ProcessModuleEditModalProps) {
  void projectId;
  const [editValues, setEditValues] = useState<ProcessModule[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // 모달이 열릴 때 modules 복사 및 equipmentCalculationBase 동기화
  useEffect(() => {
    if (!open) return;

    // equipmentCalculationBase를 프리셋 값으로 동기화
    const syncedModules = modules.map(module => {
      if (module.category !== activeCategory) return module;

      return {
        ...module,
        items: module.items.map(item => {
          // equipmentCalculationBase가 있는 항목만 프리셋 값으로 동기화
          if (item.equipmentCalculationBase !== undefined) {
            return {
              ...item,
              equipmentCalculationBase: equipmentBaseForCategory
            };
          }
          return item;
        })
      };
    });

    queueMicrotask(() => {
      setEditValues(syncedModules);
    });
  }, [open, modules, activeCategory, equipmentBaseForCategory]);

  // 현재 카테고리의 모듈 필터링 (공정타입 선택 시 해당 타입만)
  const filteredModules = useMemo(() => {
    return editValues.filter(m => {
      if (m.category !== activeCategory) return false;
      if (activeProcessType) return m.name === activeProcessType;
      return true;
    });
  }, [editValues, activeCategory, activeProcessType]);

  // 현재 카테고리의 모든 항목
  const filteredItems = useMemo(() => {
    return filteredModules.flatMap(m => m.items.map(item => ({ ...item, moduleId: m.id, moduleName: m.name })));
  }, [filteredModules]);

  // 개별 필드 변경
  const handleFieldChange = (moduleId: string, itemId: string, field: EditableField, value: string) => {
    // 에러 초기화
    const errorKey = `${itemId}-${field}`;
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[errorKey];
      return newErrors;
    });

    // 숫자 필드 검증
    if (field !== 'quantityReference') {
      if (value !== '' && isNaN(parseFloat(value))) {
        setFieldErrors(prev => ({ ...prev, [errorKey]: '숫자를 입력하세요' }));
        return;
      }
      if (value !== '' && parseFloat(value) < 0) {
        setFieldErrors(prev => ({ ...prev, [errorKey]: '0 이상의 값을 입력하세요' }));
        return;
      }
    }

    setEditValues(prev => prev.map(module => {
      if (module.id !== moduleId) return module;

      return {
        ...module,
        items: module.items.map(item => {
          if (item.id !== itemId) return item;

          // quantityReference는 문자열, 나머지는 숫자
          const parsedValue = field === 'quantityReference'
            ? value
            : (value === '' ? undefined : parseFloat(value));

          return {
            ...item,
            [field]: parsedValue,
          };
        }),
      };
    }));
  };


  // 드래그 앤 드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 드래그 종료 핸들러
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = filteredItems.findIndex(item => item.id === active.id);
    const newIndex = filteredItems.findIndex(item => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // 재정렬된 아이템 배열
    const reorderedItems = arrayMove(filteredItems, oldIndex, newIndex);

    // editValues 업데이트
    setEditValues(prev => prev.map(module => {
      if (module.category !== activeCategory) return module;

      // 현재 카테고리의 모듈 아이템을 재정렬된 순서로 교체
      return {
        ...module,
        items: reorderedItems.filter(item => item.moduleId === module.id),
      };
    }));
  };


  // 저장
  const handleSave = () => {
    if (changedItemIds.size > 0) {
      onSave(editValues);
      toast.success(`${changedItemIds.size}개 항목이 변경되었습니다.`);
    } else {
      toast.info('변경된 항목이 없습니다.');
    }

    onOpenChange(false);
  };

  // 취소
  const handleCancel = () => {
    setEditValues(modules);
    onOpenChange(false);
  };

  // 변경된 항목 Set 계산
  const changedItemIds = (() => {
    const changedSet = new Set<string>();

    modules.forEach((originalModule) => {
      const editedModule = editValues.find(m => m.id === originalModule.id);
      if (!editedModule) return;

      originalModule.items.forEach((originalItem) => {
        const editedItem = editedModule.items.find(i => i.id === originalItem.id);
        if (!editedItem) return;

        const fields: EditableField[] = [
          'dailyProductivity',
          'directWorkDays',
          'indirectDays',
          'equipmentWorkersPerUnit',
          'quantityReference',
        ];

        const isChanged = fields.some(field => originalItem[field] !== editedItem[field]);
        if (isChanged) {
          changedSet.add(originalItem.id);
        }
      });
    });

    return changedSet;
  })();

  // 변경된 항목 확인 (O(1) 조회)
  const isItemChanged = (itemId: string): boolean => {
    return changedItemIds.has(itemId);
  };

  // 필드 값 가져오기
  const getFieldValue = (item: ProcessItem & { moduleId: string }, field: EditableField): string => {
    const value = item[field];
    return value === undefined ? '' : String(value);
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            공정모듈 고급 편집 - {activeCategory}
            {activeProcessType && activeProcessType !== '표준공정' && ` (${activeProcessType})`}
          </DialogTitle>
          <DialogDescription>
            5개 필드를 개별 편집합니다. (인당생산성, 순작업일, 간접일, 장비당인원, 물량참조)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4 space-y-4">
          <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">개별 편집</CardTitle>
                    <CardDescription>
                      각 항목의 필드를 개별적으로 수정합니다.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-700 rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-zinc-100 dark:bg-zinc-800 border-b-2 border-zinc-300 dark:border-zinc-600">
                          <th className="px-2 py-3 text-left w-10">
                            <GripVertical className="w-4 h-4 text-zinc-400" />
                          </th>
                          <th className="px-2 py-3 text-center text-xs font-semibold text-zinc-700 dark:text-zinc-200">공정명</th>
                          <th className="px-2 py-3 text-center text-xs font-semibold text-zinc-700 dark:text-zinc-200 w-[70px]">층</th>
                          <th className="px-2 py-3 text-center text-xs font-semibold text-zinc-700 dark:text-zinc-200">공정타입</th>
                          <th className="px-2 py-3 text-center text-xs font-semibold text-zinc-700 dark:text-zinc-200">인당생산성</th>
                          <th className="px-2 py-3 text-center text-xs font-semibold text-zinc-700 dark:text-zinc-200">순작업일</th>
                          <th className="px-2 py-3 text-center text-xs font-semibold text-zinc-700 dark:text-zinc-200">간접작업일</th>
                          <th className="px-2 py-3 text-center text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                            대당타설량
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="inline-block w-3 h-3 ml-1 text-zinc-400 dark:text-zinc-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs font-semibold">프리셋 참조값 (읽기전용)</p>
                                <p className="text-xs">부위별 대당 타설량에서 수정 가능</p>
                              </TooltipContent>
                            </Tooltip>
                          </th>
                          <th className="px-2 py-3 text-center text-xs font-semibold text-zinc-700 dark:text-zinc-200">장비당인원</th>
                          <th className="px-2 py-3 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200">물량참조</th>
                        </tr>
                      </thead>
                      <SortableContext
                        items={filteredItems.map(item => item.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <tbody>
                          {filteredItems.map((item) => (
                            <SortableRow
                              key={item.id}
                              item={item}
                              isChanged={isItemChanged(item.id)}
                              activeCategory={activeCategory}
                              equipmentBaseForCategory={equipmentBaseForCategory}
                              fieldErrors={fieldErrors}
                              getFieldValue={getFieldValue}
                              handleFieldChange={handleFieldChange}
                            />
                          ))}
                        </tbody>
                      </SortableContext>
                    </table>
                  </div>
                </DndContext>
              </CardContent>
            </Card>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleCancel}>
            취소
          </Button>
          <Button onClick={handleSave}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
}
