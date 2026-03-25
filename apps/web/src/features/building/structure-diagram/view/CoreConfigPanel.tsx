'use client';

import { Input, Badge } from '@/shared/components/ui';
import type { CoreStructure } from '../types';
import {
  MAX_TOTAL_UNITS,
  MAX_BASEMENT_FLOORS,
  MAX_GROUND_FLOORS,
  MAX_ROOFTOP_FLOORS,
  SECTION_STYLES,
  SECTION_LABEL_STYLES,
  SECTION_SUB_LABEL_STYLES,
  TOGGLE_BUTTON_BASE,
  TOGGLE_STYLES,
  INPUT_STYLES,
  CELL_LABELS,
} from '../constants';

interface CoreConfigPanelProps {
  core: CoreStructure;
  unitTypes: string[];
  onUpdate: (coreId: number, updates: Partial<CoreStructure>) => void;
  onUnitTypesChange: (coreId: number, types: string[]) => void;
}

/** 세대별 지상층 수 배열을 가져오거나 groundFloors로 채운 fallback */
function getUnitFloors(core: CoreStructure): number[] {
  const total = core.unitsLeft + core.unitsRight;
  if (total === 0) return [];
  if (core.unitGroundFloors && core.unitGroundFloors.length === total) {
    return core.unitGroundFloors;
  }
  return Array(total).fill(core.groundFloors);
}

export function CoreConfigPanel({ core, unitTypes, onUpdate, onUnitTypesChange }: CoreConfigPanelProps) {
  const totalUnits = core.unitsLeft + core.unitsRight;
  const hasPiloti = core.piloti !== null && core.piloti.floor > 0;
  const unitFloors = getUnitFloors(core);

  const handleUnitsChange = (field: 'unitsLeft' | 'unitsRight', value: number) => {
    const otherSide = field === 'unitsLeft' ? core.unitsRight : core.unitsLeft;
    const clamped = Math.max(0, Math.min(MAX_TOTAL_UNITS - otherSide, value));
    const newTotal = clamped + otherSide;

    // unitGroundFloors 배열을 새 세대수에 맞춤
    const newUnitFloors = Array.from({ length: newTotal }, (_, i) => unitFloors[i] ?? core.groundFloors);
    onUpdate(core.id, { [field]: clamped, unitGroundFloors: newUnitFloors, groundFloors: Math.max(...newUnitFloors, core.groundFloors) });

    const adjusted = Array.from({ length: newTotal }, (_, i) => unitTypes[i] ?? '');
    onUnitTypesChange(core.id, adjusted);
  };

  const handleUnitGroundFloorsChange = (unitIndex: number, value: number) => {
    const clamped = Math.max(1, Math.min(MAX_GROUND_FLOORS, value));
    const newUnitFloors = [...unitFloors];
    newUnitFloors[unitIndex] = clamped;
    onUpdate(core.id, {
      unitGroundFloors: newUnitFloors,
      groundFloors: Math.max(...newUnitFloors),
    });
  };

  const handleUnitTypeChange = (index: number, value: string) => {
    const updated = unitTypes.map((t, i) => (i === index ? value : t));
    onUnitTypesChange(core.id, updated);
  };

  return (
    <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/50">
      <div className="flex items-start gap-3 flex-wrap">
        <Badge variant="default" className="mt-2 whitespace-nowrap">
          {CELL_LABELS.CORE(core.id)}
        </Badge>

        {/* 세대 배치 + 타입 */}
        <div className={`flex items-center gap-2 px-3 py-2 ${SECTION_STYLES.blue}`}>
          <span className={SECTION_LABEL_STYLES.blue}>세대</span>
          <div className="flex flex-col items-center gap-0.5">
            <Input
              type="number"
              min="0"
              max={MAX_TOTAL_UNITS - core.unitsRight}
              value={core.unitsLeft}
              onChange={(e) => handleUnitsChange('unitsLeft', Number(e.target.value))}
              className={INPUT_STYLES.number}
              title="왼쪽 세대수"
            />
            <span className={SECTION_SUB_LABEL_STYLES.blue}>좌</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Input
              type="number"
              min="0"
              max={MAX_TOTAL_UNITS - core.unitsLeft}
              value={core.unitsRight}
              onChange={(e) => handleUnitsChange('unitsRight', Number(e.target.value))}
              className={INPUT_STYLES.number}
              title="오른쪽 세대수"
            />
            <span className={SECTION_SUB_LABEL_STYLES.blue}>우</span>
          </div>
          <span className="text-xs text-slate-500">= {totalUnits}호</span>

          {totalUnits > 0 && (
            <>
              <div className="w-px h-6 bg-blue-200 dark:bg-blue-700 mx-1" />
              <span className={SECTION_LABEL_STYLES.blue}>타입</span>
              {Array.from({ length: totalUnits }, (_, i) => (
                <Input
                  key={i}
                  type="text"
                  placeholder={`${i + 1}호`}
                  value={unitTypes[i] ?? ''}
                  onChange={(e) => handleUnitTypeChange(i, e.target.value)}
                  className={INPUT_STYLES.type}
                />
              ))}
            </>
          )}
        </div>

        {/* 층수 */}
        <div className={`flex items-center gap-2 px-3 py-2 ${SECTION_STYLES.green}`}>
          <span className={SECTION_LABEL_STYLES.green}>층수</span>
          <div className="flex flex-col items-center gap-0.5">
            <Input
              type="number"
              min="0"
              max={MAX_BASEMENT_FLOORS}
              value={core.basementFloors}
              onChange={(e) => onUpdate(core.id, { basementFloors: Math.max(0, Number(e.target.value)) })}
              className={INPUT_STYLES.number}
              title="지하층 수"
            />
            <span className={SECTION_SUB_LABEL_STYLES.green}>지하</span>
          </div>

          {/* 세대별 지상층 수 */}
          {totalUnits > 0 ? (
            unitFloors.map((floors, i) => (
              <div key={`gf-${i}`} className="flex flex-col items-center gap-0.5">
                <Input
                  type="number"
                  min="1"
                  max={MAX_GROUND_FLOORS}
                  value={floors}
                  onChange={(e) => handleUnitGroundFloorsChange(i, Number(e.target.value))}
                  className={INPUT_STYLES.number}
                  title={`${i + 1}호 지상층 수`}
                />
                <span className={SECTION_SUB_LABEL_STYLES.green}>{i + 1}호</span>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center gap-0.5">
              <Input
                type="number"
                min="1"
                max={MAX_GROUND_FLOORS}
                value={core.groundFloors}
                onChange={(e) => onUpdate(core.id, { groundFloors: Math.max(1, Number(e.target.value)) })}
                className={INPUT_STYLES.number}
                title="지상층 수"
              />
              <span className={SECTION_SUB_LABEL_STYLES.green}>지상</span>
            </div>
          )}

          <div className="flex flex-col items-center gap-0.5">
            <Input
              type="number"
              min="0"
              max={MAX_ROOFTOP_FLOORS}
              value={core.rooftopFloors}
              onChange={(e) => onUpdate(core.id, { rooftopFloors: Math.max(0, Number(e.target.value)) })}
              className={INPUT_STYLES.number}
              title="옥탑층 수"
            />
            <span className={SECTION_SUB_LABEL_STYLES.green}>옥탑</span>
          </div>
        </div>

        {/* 필로티 */}
        <div className={`flex items-center gap-2 px-3 py-2 ${SECTION_STYLES.amber}`}>
          <span className={SECTION_LABEL_STYLES.amber}>필로티</span>
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
                    piloti: { floor, excludeUnits: core.piloti?.excludeUnits ?? [] },
                  });
                }
              }}
              className={INPUT_STYLES.number}
              title="필로티 층"
            />
            <span className={SECTION_SUB_LABEL_STYLES.amber}>층</span>
          </div>

          {hasPiloti && (
            <div className="flex items-center gap-1">
              <span className={SECTION_SUB_LABEL_STYLES.amber}>적용:</span>
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
                      onUpdate(core.id, { piloti: { ...core.piloti, excludeUnits } });
                    }}
                    className={`${TOGGLE_BUTTON_BASE} ${isExcluded ? TOGGLE_STYLES.amber.active : TOGGLE_STYLES.amber.inactive}`}
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
