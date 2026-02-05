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
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/Tooltip';
import type { ProcessModule, ProcessItem } from '@/lib/data/process-modules';
import type { ProcessCategory, ProcessModuleHistoryItem } from '@/lib/types';
import { History, RotateCcw, Info } from 'lucide-react';

interface ProcessModuleEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modules: ProcessModule[];
  activeCategory: ProcessCategory;
  onSave: (updatedModules: ProcessModule[]) => void;
  projectId: string;
  equipmentBaseForCategory: number; // 현재 카테고리의 프리셋 값
}

type EditableField = 'dailyProductivity' | 'directWorkDays' | 'indirectDays' | 'equipmentWorkersPerUnit' | 'quantityReference';

const FIELD_LABELS: Record<EditableField, string> = {
  dailyProductivity: '인당생산성',
  directWorkDays: '순작업일',
  indirectDays: '간접일',
  equipmentWorkersPerUnit: '장비당인원',
  quantityReference: '물량참조',
};

/**
 * 공정모듈 고급 편집 모달
 *
 * 5개 필드를 편집할 수 있으며, 일괄 변경 및 변경 이력 기능을 제공합니다.
 * equipmentCalculationBase는 프리셋 참조 값으로 읽기 전용입니다.
 */
export function ProcessModuleEditModal({
  open,
  onOpenChange,
  modules,
  activeCategory,
  onSave,
  projectId,
  equipmentBaseForCategory,
}: ProcessModuleEditModalProps) {
  const [editValues, setEditValues] = useState<ProcessModule[]>([]);
  const [batchField, setBatchField] = useState<EditableField>('dailyProductivity');
  const [batchValue, setBatchValue] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<ProcessModuleHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'edit' | 'history'>('edit');
  const [applyToAll, setApplyToAll] = useState(false);

  const historyStorageKey = `contech-process-module-history-${projectId}`;

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

    setEditValues(syncedModules);
    setSelectedItems(new Set());
    setBatchValue('');
    setActiveTab('edit');
    setApplyToAll(false);

    // 히스토리 로드
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(historyStorageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as ProcessModuleHistoryItem[];
          setHistory(parsed.slice(0, 10)); // 최근 10개
        }
      } catch (error) {
        console.error('Failed to load process module history:', error);
      }
    }
  }, [open, modules, activeCategory, equipmentBaseForCategory, historyStorageKey]);

  // 현재 카테고리의 모듈 필터링
  const filteredModules = useMemo(() => {
    return editValues.filter(m => m.category === activeCategory);
  }, [editValues, activeCategory]);

  // 현재 카테고리의 모든 항목
  const filteredItems = useMemo(() => {
    return filteredModules.flatMap(m => m.items.map(item => ({ ...item, moduleId: m.id })));
  }, [filteredModules]);

  // 히스토리 저장
  const saveHistory = (changes: ProcessModuleHistoryItem[]) => {
    if (typeof window === 'undefined' || changes.length === 0) return;

    try {
      const stored = localStorage.getItem(historyStorageKey);
      const existing = stored ? (JSON.parse(stored) as ProcessModuleHistoryItem[]) : [];
      const updated = [...changes, ...existing].slice(0, 10); // 최대 10개 유지

      localStorage.setItem(historyStorageKey, JSON.stringify(updated));
      setHistory(updated);
    } catch (error) {
      console.error('Failed to save process module history:', error);
    }
  };

  // 개별 필드 변경
  const handleFieldChange = (moduleId: string, itemId: string, field: EditableField, value: string) => {
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

  // 일괄 변경
  const handleBatchApply = () => {
    if (!batchValue) {
      toast.error('값을 입력해주세요.');
      return;
    }

    const parsedValue = batchField === 'quantityReference'
      ? batchValue
      : parseFloat(batchValue);

    if (batchField !== 'quantityReference' && isNaN(parsedValue as number)) {
      toast.error('유효한 숫자를 입력해주세요.');
      return;
    }

    const targetItems = applyToAll ? filteredItems : filteredItems.filter(item => selectedItems.has(item.id));

    if (targetItems.length === 0) {
      toast.error('적용할 항목을 선택해주세요.');
      return;
    }

    setEditValues(prev => prev.map(module => {
      if (module.category !== activeCategory) return module;

      return {
        ...module,
        items: module.items.map(item => {
          const shouldApply = targetItems.some(t => t.id === item.id);
          if (!shouldApply) return item;

          return {
            ...item,
            [batchField]: parsedValue,
          };
        }),
      };
    }));

    toast.success(`${targetItems.length}개 항목에 적용되었습니다.`);
    setBatchValue('');
  };

  // 전체 선택/해제
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  // 개별 선택/해제
  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  // 기본값 복원
  const handleRestoreDefaults = () => {
    // TODO: 기본값 복원 로직 구현
    toast.info('기본값 복원 기능은 구현 예정입니다.');
  };

  // 저장
  const handleSave = () => {
    const changes: ProcessModuleHistoryItem[] = [];

    // 원본과 비교하여 변경사항 추출
    modules.forEach((originalModule) => {
      if (originalModule.category !== activeCategory) return;
      const editedModule = editValues.find(m => m.id === originalModule.id);
      if (!editedModule) return;

      originalModule.items.forEach((originalItem) => {
        const editedItem = editedModule.items.find(i => i.id === originalItem.id);
        if (!editedItem) return;

        // 5개 필드 검사 (equipmentCalculationBase 제외 - 프리셋 참조)
        const fields: EditableField[] = [
          'dailyProductivity',
          'directWorkDays',
          'indirectDays',
          'equipmentWorkersPerUnit',
          'quantityReference',
        ];

        fields.forEach(field => {
          const originalValue = originalItem[field];
          const editedValue = editedItem[field];

          if (originalValue !== editedValue) {
            changes.push({
              timestamp: new Date().toISOString(),
              category: originalModule.category,
              itemId: originalItem.id,
              itemName: originalItem.workItem,
              field,
              previousValue: originalValue,
              newValue: editedValue,
              changedBy: 'user',
            });
          }
        });
      });
    });

    if (changes.length > 0) {
      saveHistory(changes);
      onSave(editValues);
      toast.success(`${changes.length}개 필드가 변경되었습니다.`);
    } else {
      toast.info('변경된 항목이 없습니다.');
    }

    onOpenChange(false);
  };

  // 취소
  const handleCancel = () => {
    setEditValues(modules);
    setBatchValue('');
    setSelectedItems(new Set());
    onOpenChange(false);
  };

  // 변경된 항목 확인
  const isItemChanged = (itemId: string): boolean => {
    const originalModule = modules.find(m => m.items.some(i => i.id === itemId));
    const editedModule = editValues.find(m => m.items.some(i => i.id === itemId));
    if (!originalModule || !editedModule) return false;

    const originalItem = originalModule.items.find(i => i.id === itemId);
    const editedItem = editedModule.items.find(i => i.id === itemId);
    if (!originalItem || !editedItem) return false;

    const fields: EditableField[] = [
      'dailyProductivity',
      'directWorkDays',
      'indirectDays',
      'equipmentWorkersPerUnit',
      'quantityReference',
    ];

    return fields.some(field => originalItem[field] !== editedItem[field]);
  };

  // 필드 값 가져오기
  const getFieldValue = (item: ProcessItem & { moduleId: string }, field: EditableField): string => {
    const value = item[field];
    return value === undefined ? '' : String(value);
  };

  // 전체 선택 상태
  const allSelected = filteredItems.length > 0 && filteredItems.every(item => selectedItems.has(item.id));
  const someSelected = filteredItems.some(item => selectedItems.has(item.id)) && !allSelected;

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>공정모듈 고급 편집 - {activeCategory}</DialogTitle>
          <DialogDescription>
            6개 필드를 편집하고 일괄 변경 및 변경 이력을 관리합니다.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'history')} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">편집</TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-1" />
              변경 이력
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-4 mt-4">
            {/* 일괄 변경 섹션 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">일괄 변경</CardTitle>
                <CardDescription>
                  선택한 항목 또는 전체 항목에 동일한 값을 적용합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs mb-1 block">필드 선택</Label>
                    <Select value={batchField} onValueChange={(v) => setBatchField(v as EditableField)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(FIELD_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs mb-1 block">값</Label>
                    <Input
                      type={batchField === 'quantityReference' ? 'text' : 'number'}
                      value={batchValue}
                      onChange={(e) => setBatchValue(e.target.value)}
                      placeholder={batchField === 'quantityReference' ? '예: D6' : '값 입력'}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="apply-to-all"
                      checked={applyToAll}
                      onCheckedChange={(checked) => setApplyToAll(checked as boolean)}
                    />
                    <Label htmlFor="apply-to-all" className="text-sm cursor-pointer">
                      전체 항목에 적용
                    </Label>
                  </div>
                  <Button onClick={handleBatchApply} size="sm">
                    적용
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 개별 편집 섹션 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">개별 편집</CardTitle>
                    <CardDescription>
                      각 항목의 필드를 개별적으로 수정합니다.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRestoreDefaults}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    기본값 복원
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-2 py-2 text-left border-r border-zinc-200">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={handleSelectAll}
                            aria-label="전체 선택"
                          />
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-semibold border-r border-zinc-200">공정명</th>
                        <th className="px-2 py-2 text-right text-xs font-semibold border-r border-zinc-200">인당생산성</th>
                        <th className="px-2 py-2 text-right text-xs font-semibold border-r border-zinc-200">순작업일</th>
                        <th className="px-2 py-2 text-right text-xs font-semibold border-r border-zinc-200">간접일</th>
                        <th className="px-2 py-2 text-right text-xs font-semibold border-r border-zinc-200">대당타설량</th>
                        <th className="px-2 py-2 text-right text-xs font-semibold border-r border-zinc-200">장비당인원</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold">물량참조</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item) => {
                        const isChanged = isItemChanged(item.id);
                        const isSelected = selectedItems.has(item.id);

                        return (
                          <tr
                            key={item.id}
                            className={`border-b hover:bg-zinc-50 ${isChanged ? 'bg-yellow-50' : ''}`}
                          >
                            <td className="px-2 py-2 border-r border-zinc-200">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                              />
                            </td>
                            <td className="px-2 py-2 font-medium border-r border-zinc-200">
                              {item.workItem}
                              {isChanged && (
                                <Badge variant="warning" className="ml-2 text-xs">
                                  변경
                                </Badge>
                              )}
                            </td>
                            <td className="px-2 py-2 border-r border-zinc-200">
                              <Input
                                type="number"
                                value={getFieldValue(item, 'dailyProductivity')}
                                onChange={(e) => handleFieldChange(item.moduleId, item.id, 'dailyProductivity', e.target.value)}
                                className="w-20 text-right"
                              />
                            </td>
                            <td className="px-2 py-2 border-r border-zinc-200">
                              <Input
                                type="number"
                                value={getFieldValue(item, 'directWorkDays')}
                                onChange={(e) => handleFieldChange(item.moduleId, item.id, 'directWorkDays', e.target.value)}
                                className="w-20 text-right"
                                placeholder="계산"
                              />
                            </td>
                            <td className="px-2 py-2 border-r border-zinc-200">
                              <Input
                                type="number"
                                value={getFieldValue(item, 'indirectDays')}
                                onChange={(e) => handleFieldChange(item.moduleId, item.id, 'indirectDays', e.target.value)}
                                className="w-20 text-right"
                              />
                            </td>
                            <td className="px-2 py-2 border-r border-zinc-200">
                              {item.equipmentCalculationBase !== undefined ? (
                                <div className="flex items-center justify-end gap-1">
                                  <Badge variant="secondary" className="text-xs font-mono">
                                    {activeCategory}: {equipmentBaseForCategory}㎥
                                  </Badge>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Info className="w-3 h-3 text-zinc-400" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs font-semibold">프리셋 참조 값</p>
                                      <p className="text-xs">부위별 대당 타설량에서 수정 가능</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              ) : (
                                <span className="text-zinc-400 text-xs text-right block">-</span>
                              )}
                            </td>
                            <td className="px-2 py-2 border-r border-zinc-200">
                              <Input
                                type="number"
                                value={getFieldValue(item, 'equipmentWorkersPerUnit')}
                                onChange={(e) => handleFieldChange(item.moduleId, item.id, 'equipmentWorkersPerUnit', e.target.value)}
                                className="w-20 text-right"
                                placeholder="-"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <Input
                                type="text"
                                value={getFieldValue(item, 'quantityReference')}
                                onChange={(e) => handleFieldChange(item.moduleId, item.id, 'quantityReference', e.target.value)}
                                className="w-24"
                                placeholder="-"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">최근 변경 이력</CardTitle>
                <CardDescription>
                  최근 10개의 변경 내역을 표시합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-center text-zinc-500 py-4">
                    변경 이력이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {history.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg text-sm"
                      >
                        <div className="flex-1">
                          <div className="font-medium">
                            [{item.category}] {item.itemName}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {FIELD_LABELS[item.field as EditableField] || '대당타설량'} • {new Date(item.timestamp).toLocaleString('ko-KR')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-600">
                            {item.previousValue ?? '-'}
                          </span>
                          <span className="text-zinc-400">→</span>
                          <span className="font-medium text-blue-600">
                            {item.newValue ?? '-'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
