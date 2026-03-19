'use client';

import { Input, Badge } from '@/shared/components/ui';
import type { CoreStructure } from '../types';

interface CoreConfigPanelProps {
  core: CoreStructure;
  unitType: string;
  onUpdate: (coreId: number, updates: Partial<CoreStructure>) => void;
  onUnitTypeChange: (coreId: number, type: string) => void;
}

export function CoreConfigPanel({ core, unitType, onUpdate, onUnitTypeChange }: CoreConfigPanelProps) {
  const totalUnits = core.unitsLeft + core.unitsRight;
  const hasPiloti = core.piloti !== null && core.piloti.floor > 0;

  return (
    <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/50">
      <div className="flex items-start gap-3 flex-wrap">
        {/* 코어 번호 */}
        <Badge variant="default" className="mt-2 whitespace-nowrap">
          코어{core.id}
        </Badge>

        {/* 세대 배치 + 타입 */}
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-800/30">
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">세대</span>
          <div className="flex flex-col items-center gap-0.5">
            <Input
              type="number"
              min="0"
              max="3"
              value={core.unitsLeft}
              onChange={(e) => onUpdate(core.id, { unitsLeft: Math.max(0, Math.min(3, Number(e.target.value))) })}
              className="w-14 text-xs text-center"
              title="왼쪽 세대수"
            />
            <span className="text-[10px] text-blue-600 dark:text-blue-400">좌</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Input
              type="number"
              min="0"
              max="3"
              value={core.unitsRight}
              onChange={(e) => onUpdate(core.id, { unitsRight: Math.max(0, Math.min(3, Number(e.target.value))) })}
              className="w-14 text-xs text-center"
              title="오른쪽 세대수"
            />
            <span className="text-[10px] text-blue-600 dark:text-blue-400">우</span>
          </div>
          <span className="text-xs text-slate-500">= {totalUnits}호</span>

          <div className="w-px h-6 bg-blue-200 dark:bg-blue-700 mx-1" />

          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">타입</span>
          <Input
            type="text"
            placeholder="59A"
            value={unitType}
            onChange={(e) => onUnitTypeChange(core.id, e.target.value)}
            className="w-[55px]"
            style={{ width: '55px', minWidth: '55px', maxWidth: '55px' }}
          />
        </div>

        {/* 층수 */}
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50/50 dark:bg-green-900/20 rounded-md border border-green-100 dark:border-green-800/30">
          <span className="text-xs font-medium text-green-600 dark:text-green-400 whitespace-nowrap">층수</span>
          <div className="flex flex-col items-center gap-0.5">
            <Input
              type="number"
              min="0"
              max="10"
              value={core.basementFloors}
              onChange={(e) => onUpdate(core.id, { basementFloors: Math.max(0, Number(e.target.value)) })}
              className="w-14 text-xs text-center"
              title="지하층 수"
            />
            <span className="text-[10px] text-green-600 dark:text-green-400">지하</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Input
              type="number"
              min="1"
              max="60"
              value={core.groundFloors}
              onChange={(e) => onUpdate(core.id, { groundFloors: Math.max(1, Number(e.target.value)) })}
              className="w-14 text-xs text-center"
              title="지상층 수"
            />
            <span className="text-[10px] text-green-600 dark:text-green-400">지상</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Input
              type="number"
              min="0"
              max="5"
              value={core.rooftopFloors}
              onChange={(e) => onUpdate(core.id, { rooftopFloors: Math.max(0, Number(e.target.value)) })}
              className="w-14 text-xs text-center"
              title="옥탑층 수"
            />
            <span className="text-[10px] text-green-600 dark:text-green-400">옥탑</span>
          </div>
        </div>

        {/* 필로티 */}
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50/50 dark:bg-amber-900/20 rounded-md border border-amber-100 dark:border-amber-800/30">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">필로티</span>
          <div className="flex flex-col items-center gap-0.5">
            <Input
              type="number"
              min="0"
              max={core.groundFloors}
              value={core.piloti?.floor ?? 0}
              onChange={(e) => {
                const floor = Math.max(0, Number(e.target.value));
                if (floor === 0) {
                  onUpdate(core.id, { piloti: null });
                } else {
                  onUpdate(core.id, {
                    piloti: {
                      floor,
                      excludeUnits: core.piloti?.excludeUnits ?? [],
                    },
                  });
                }
              }}
              className="w-14 text-xs text-center"
              title="필로티 층"
            />
            <span className="text-[10px] text-amber-600 dark:text-amber-400">층</span>
          </div>

          {hasPiloti && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-amber-600 dark:text-amber-400">적용:</span>
              {Array.from({ length: totalUnits }, (_, i) => {
                const isExcluded = core.piloti?.excludeUnits.includes(i) ?? false;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (!core.piloti) return;
                      const excludeUnits = isExcluded
                        ? core.piloti.excludeUnits.filter(u => u !== i)
                        : [...core.piloti.excludeUnits, i];
                      onUpdate(core.id, {
                        piloti: { ...core.piloti, excludeUnits },
                      });
                    }}
                    className={`w-6 h-6 text-[10px] rounded border transition-colors ${
                      isExcluded
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-600 hover:border-amber-400'
                    }`}
                    title={`세대 ${i + 1} 필로티 토글`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
