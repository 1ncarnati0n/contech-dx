'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Layers, Box, DoorOpen, Truck, FileSpreadsheet } from 'lucide-react';
import type { CastPlanState, CastBlock, Gate, PumpCar } from '@/lib/types';
import { BlockPropertiesPanel } from './panels/BlockPropertiesPanel';
import { VolumeCalculationPanel } from './panels/VolumeCalculationPanel';

interface CastPlanSidebarProps {
  state: CastPlanState;
  onStateChange: (updates: Partial<CastPlanState>) => void;
  onBlockUpdate: (blockId: string, updates: Partial<CastBlock>) => void;
  onBlockSelect: (blockId: string | null) => void;
  onGateSelect: (gateId: string | null) => void;
  onPumpCarSelect: (pumpCarId: string | null) => void;
}

export function CastPlanSidebar({
  state,
  onStateChange,
  onBlockUpdate,
  onBlockSelect,
  onGateSelect,
  onPumpCarSelect,
}: CastPlanSidebarProps) {
  const selectedBlock = state.blocks.find((b) => b.id === state.selectedBlockId);

  // 총 면적 및 물량 계산
  const totalArea = state.blocks.reduce((sum, b) => sum + (b.area || 0), 0);
  const totalVolume = state.blocks.reduce((sum, b) => sum + (b.volume || 0), 0);
  const totalOrderVolume = state.blocks.reduce(
    (sum, b) => sum + (b.orderVolume || 0),
    0
  );

  return (
    <div className="w-full h-full overflow-y-auto bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 p-4 space-y-4">
      {/* 프로젝트 요약 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="w-4 h-4" />
            프로젝트 요약
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">총 면적</span>
            <span className="font-semibold">{totalArea.toLocaleString('ko-KR', { maximumFractionDigits: 1 })} ㎡</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">순물량</span>
            <span className="font-semibold">{totalVolume.toLocaleString('ko-KR', { maximumFractionDigits: 1 })} ㎥</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">발주량</span>
            <span className="font-semibold text-primary-600 dark:text-primary-400">
              {totalOrderVolume.toLocaleString('ko-KR', { maximumFractionDigits: 1 })} ㎥
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 선택된 블록 속성 */}
      {selectedBlock && (
        <BlockPropertiesPanel
          block={selectedBlock}
          onUpdate={(updates) => onBlockUpdate(selectedBlock.id, updates)}
        />
      )}

      {/* 블록 목록 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Box className="w-4 h-4" />
            블록 목록 ({state.blocks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 max-h-40 overflow-y-auto">
          {state.blocks.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              블록이 없습니다
            </p>
          ) : (
            state.blocks.map((block) => (
              <div
                key={block.id}
                className={`
                  flex items-center justify-between p-2 rounded cursor-pointer
                  ${block.id === state.selectedBlockId
                    ? 'bg-primary-100 dark:bg-primary-900/30'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }
                `}
                onClick={() => onBlockSelect(block.id)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: block.color }}
                  />
                  <span className="text-sm font-medium">{block.name}</span>
                </div>
                <span className="text-xs text-slate-500">
                  {(block.area || 0).toFixed(0)}㎡
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 게이트 목록 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DoorOpen className="w-4 h-4" />
            게이트 ({state.gates.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 max-h-32 overflow-y-auto">
          {state.gates.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              게이트가 없습니다
            </p>
          ) : (
            state.gates.map((gate) => (
              <div
                key={gate.id}
                className={`
                  flex items-center justify-between p-2 rounded cursor-pointer
                  ${gate.id === state.selectedGateId
                    ? 'bg-primary-100 dark:bg-primary-900/30'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }
                `}
                onClick={() => onGateSelect(gate.id)}
              >
                <span className="text-sm">{gate.name}</span>
                <span className="text-xs text-slate-500">
                  {gate.type === 'main' ? '정문' : '가설'}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 펌프카 목록 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Truck className="w-4 h-4" />
            펌프카 ({state.pumpCars.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 max-h-32 overflow-y-auto">
          {state.pumpCars.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              펌프카가 없습니다
            </p>
          ) : (
            state.pumpCars.map((pc) => (
              <div
                key={pc.id}
                className={`
                  flex items-center justify-between p-2 rounded cursor-pointer
                  ${pc.id === state.selectedPumpCarId
                    ? 'bg-primary-100 dark:bg-primary-900/30'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }
                `}
                onClick={() => onPumpCarSelect(pc.id)}
              >
                <span className="text-sm">{pc.name}</span>
                <span className="text-xs text-slate-500">{pc.type}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 물량 계산 패널 */}
      <VolumeCalculationPanel blocks={state.blocks} />
    </div>
  );
}
