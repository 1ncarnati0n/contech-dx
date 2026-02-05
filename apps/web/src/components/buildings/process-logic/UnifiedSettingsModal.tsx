'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Calculator, Sliders, Layers } from 'lucide-react';
import type { CalculationFormula, ProcessLogicPreset, ProcessCategory } from '@/lib/types';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';

// Formula Editor 내용 통합
import { FormulaEditorContent } from './FormulaEditorContent';
// Preset Manager 내용 통합
import { PresetManagerContent } from './PresetManagerContent';

interface UnifiedSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // Formula 관련
  formulas: CalculationFormula[];
  onCreateFormula: (formula: Omit<CalculationFormula, 'id' | 'isBuiltIn' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateFormula: (id: string, updates: Partial<Omit<CalculationFormula, 'id' | 'isBuiltIn' | 'createdAt' | 'updatedAt'>>) => void;
  onDeleteFormula: (id: string) => void;
  onValidateFormula: (formula: string) => { isValid: boolean; error?: string };

  // 기준값 관련
  equipmentBaseValues: Record<string, number>;
  onEquipmentBaseChange: (category: ProcessCategory, value: number) => void;

  // Preset 관련
  presets: ProcessLogicPreset[];
  activePresetId: string | null;
  onApplyPreset: (id: string) => void;
  onDuplicatePreset: (id: string, newName: string) => void;
  onDeletePreset: (id: string) => void;
  onUpdatePreset: (id: string, updates: { name?: string; description?: string; isDefault?: boolean }) => void;
  onSaveCurrentAsPreset: (name: string, description?: string, isDefault?: boolean) => void;
}

// UI 라벨과 실제 ProcessCategory 간의 매핑
type EquipmentBaseLabel = '버림' | '기초' | '주동 지하층' | '1층' | '셋팅층' | '일반층' | '기준층' | '최상층' | 'PH층';

const EQUIPMENT_BASE_ITEMS: { label: EquipmentBaseLabel; defaultValue: number }[] = [
  { label: '버림', defaultValue: 650 },
  { label: '기초', defaultValue: 650 },
  { label: '주동 지하층', defaultValue: 500 },
  { label: '1층', defaultValue: 400 },
  { label: '일반층', defaultValue: 200 },
  { label: '셋팅층', defaultValue: 400 },
  { label: '기준층', defaultValue: 320 },
  { label: '최상층', defaultValue: 230 },
  { label: 'PH층', defaultValue: 230 },
];

// UI 라벨을 ProcessCategory로 매핑
const LABEL_TO_CATEGORY_MAP: Record<EquipmentBaseLabel, ProcessCategory> = {
  '버림': '버림',
  '기초': '기초',
  '주동 지하층': '주동 지하층',
  '1층': '셋팅층',
  '셋팅층': '셋팅층',
  '일반층': '일반층',
  '기준층': '기준층',
  '최상층': '최상층',
  'PH층': 'PH층',
};

/**
 * 통합 설정 모달
 *
 * 공식 관리, 기준값 설정, 프리셋 관리를 하나의 탭 인터페이스로 통합
 */
export function UnifiedSettingsModal({
  open,
  onOpenChange,
  formulas,
  onCreateFormula,
  onUpdateFormula,
  onDeleteFormula,
  onValidateFormula,
  equipmentBaseValues,
  onEquipmentBaseChange,
  presets,
  activePresetId,
  onApplyPreset,
  onDuplicatePreset,
  onDeletePreset,
  onUpdatePreset,
  onSaveCurrentAsPreset,
}: UnifiedSettingsModalProps) {
  const [activeTab, setActiveTab] = useState('bases');

  const handleValueChange = (label: EquipmentBaseLabel, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      const category = LABEL_TO_CATEGORY_MAP[label];
      onEquipmentBaseChange(category, numValue);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle>설정 관리</DialogTitle>
              <DialogDescription>
                공정로직의 모든 설정을 관리합니다
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bases" className="flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              기준값
            </TabsTrigger>
            <TabsTrigger value="formulas" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              공식 관리
            </TabsTrigger>
            <TabsTrigger value="presets" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              프리셋
            </TabsTrigger>
          </TabsList>

          {/* 기준값 탭 */}
          <TabsContent value="bases" className="flex-1 overflow-y-auto mt-4 space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-2">
                  부위별 대당 타설량 기준
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                  각 부위별 장비 1대당 1일 타설 가능량을 설정합니다
                </p>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-9 gap-3">
                {EQUIPMENT_BASE_ITEMS.map((item) => {
                  const currentValue = equipmentBaseValues[item.label] ?? item.defaultValue;
                  const isDefault = currentValue === item.defaultValue;

                  return (
                    <div
                      key={item.label}
                      className="flex flex-col items-center p-3 bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
                    >
                      <Label className="text-xs font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                        {item.label}
                      </Label>
                      <Input
                        type="number"
                        value={currentValue}
                        onChange={(e) => handleValueChange(item.label, e.target.value)}
                        placeholder={item.defaultValue.toString()}
                        className="w-20 px-2 py-1.5 text-center border border-zinc-300 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="1"
                      />
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">㎥</span>
                        {isDefault && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded">
                            기본
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>참고:</strong> 기준값 변경은 즉시 반영되지만, 저장 버튼을 눌러야 영구 저장됩니다.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* 공식 관리 탭 */}
          <TabsContent value="formulas" className="flex-1 overflow-y-auto mt-4">
            <FormulaEditorContent
              formulas={formulas}
              onCreate={onCreateFormula}
              onUpdate={onUpdateFormula}
              onDelete={onDeleteFormula}
              onValidate={onValidateFormula}
            />
          </TabsContent>

          {/* 프리셋 탭 */}
          <TabsContent value="presets" className="flex-1 overflow-y-auto mt-4">
            <PresetManagerContent
              presets={presets}
              activePresetId={activePresetId}
              onApply={onApplyPreset}
              onDuplicate={onDuplicatePreset}
              onDelete={onDeletePreset}
              onUpdate={onUpdatePreset}
              onSaveCurrentAs={onSaveCurrentAsPreset}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
