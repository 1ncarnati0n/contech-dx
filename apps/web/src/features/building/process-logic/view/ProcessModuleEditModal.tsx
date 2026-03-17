'use client';

import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';

import { Badge } from '@/shared/components/ui/Badge';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/shared/components/ui/Tooltip';
import type { ProcessModule, ProcessItem } from '@/features/building/data/process-modules';
import type { ProcessCategory } from '@/shared/types';
import { Info, GripVertical, Calculator, Truck, Lock } from 'lucide-react';
import {
  type CalculationMethod,
  getCalculationMethod,
  getCalculationMethodConfig,
  getCalculationSteps,
} from '../service/process-module-helpers';
import {
  useProcessModuleEdit,
  type EditableField,
  type FlattenedItem,
} from '../service/useProcessModuleEdit';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


// 계산 방식별 아이콘 매핑 (뷰 관심사)
const CALCULATION_METHOD_ICONS: Record<CalculationMethod, typeof Lock> = {
  fixed: Lock,
  'quantity-based': Calculator,
  'equipment-based': Truck,
};

interface ProcessModuleEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modules: ProcessModule[];
  activeCategory: ProcessCategory;
  activeProcessType?: string;
  onSave: (updatedModules: ProcessModule[]) => void;
  projectId: string;
  equipmentBaseForCategory: number;
}

// Sortable Row 컴포넌트
interface SortableRowProps {
  item: FlattenedItem;
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
            const IconComponent = CALCULATION_METHOD_ICONS[method];
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

  const {
    filteredItems,
    fieldErrors,
    changedItemIds,
    isItemChanged,
    getFieldValue,
    handleFieldChange,
    handleDragEnd,
    handleSave,
    handleCancel,
  } = useProcessModuleEdit({
    open,
    modules,
    activeCategory,
    activeProcessType,
    equipmentBaseForCategory,
    onSave: (updatedModules) => {
      onSave(updatedModules);
      toast.success(`${changedItemIds.size}개 항목이 변경되었습니다.`);
    },
    onClose: () => onOpenChange(false),
  });

  // 드래그 앤 드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
