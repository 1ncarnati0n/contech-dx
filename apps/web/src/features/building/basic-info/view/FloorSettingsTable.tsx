'use client';

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input } from '@/shared/components/ui';
import type { Building, Floor, FloorClass } from '@/shared/types';
import { transformFloorsForDisplay } from '../service/floorDisplayTransform';
import { useFloorUpdate } from '../service/useFloorUpdate';
import { resolveFloorHeight, resolveFloorClass } from '@/features/building/shared/service/floorHeightResolver';

const FLOOR_CLASSES: FloorClass[] = ['지하층', '일반층', '셋팅층', '기준층', '최상층', '옥탑층'];

interface Props {
  building: Building;
  onUpdate: () => void;
}

function formatFloorLabel(label: string, floorClass: FloorClass): string {
  let formatted = label.replace(/코어\d+-/, '');

  // 옥탑층: PH1 → 옥탑1
  if ((floorClass === '옥탑층' || floorClass === 'PH층') && formatted.match(/^PH\d+$/i)) {
    const m = formatted.match(/PH(\d+)/i);
    if (m) formatted = `옥탑${m[1]}`;
  }

  // 기준층: "2~14F 기준층" → "2~14F"
  if (floorClass === '기준층' && formatted.includes('기준층')) {
    formatted = formatted.replace(/\s*기준층\s*/, '');
  }

  return formatted;
}

function findActualFloors(
  floor: Floor,
  allFloors: Floor[],
  coreCount: number,
  coreGroundFloors?: number[],
): { actualFloor: Floor | null; actualFloors: Floor[] } {
  // 가장 높은 코어 번호 (1-based)
  const tallestCoreLabel = coreCount > 1 && coreGroundFloors && coreGroundFloors.length > 0
    ? coreGroundFloors.indexOf(Math.max(...coreGroundFloors)) + 1
    : 1;

  // 더미 범위 층
  if (floor.id.startsWith('dummy-range-')) {
    const rangeMatch = floor.floorLabel.match(/(\d+)~(\d+)F/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      const matched = allFloors.filter(f => {
        if (f.floorClass !== '기준층') return false;
        if (coreCount > 1) {
          const pattern = new RegExp(`코어${tallestCoreLabel}-(\\d+)F`);
          const m = f.floorLabel.match(pattern);
          if (m) {
            const num = parseInt(m[1], 10);
            return num >= start && num <= end;
          }
        } else {
          const m = f.floorLabel.match(/(\d+)F/);
          if (m) {
            const num = parseInt(m[1], 10);
            return num >= start && num <= end;
          }
        }
        return false;
      });
      return { actualFloor: matched[0] || null, actualFloors: matched };
    }
    return { actualFloor: null, actualFloors: [] };
  }

  // 더미 단일 층
  if (floor.id.startsWith('dummy-')) {
    const found = allFloors.find(f => {
      const pattern = new RegExp(`코어${tallestCoreLabel}-(\\d+)F`);
      const coreMatch = f.floorLabel.match(pattern);
      const floorMatch = floor.id.match(/dummy-(\d+)F/);
      return coreMatch && floorMatch && coreMatch[1] === floorMatch[1];
    });
    return { actualFloor: found || null, actualFloors: [] };
  }

  return { actualFloor: floor, actualFloors: [] };
}

export function FloorSettingsTable({ building, onUpdate }: Props) {
  const { floors, handleFloorUpdate } = useFloorUpdate(building, onUpdate);

  const displayFloors = useMemo(
    () => transformFloorsForDisplay({
      floors,
      coreCount: building.meta.coreCount,
      coreGroundFloors: building.meta.floorCount.coreGroundFloors,
      buildingId: building.id,
      meta: building.meta,
    }),
    [floors, building.meta, building.id],
  );

  if (floors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>층 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            동 기본 정보에서 층수를 입력하고 저장하면 층 리스트가 자동 생성됩니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {/* 층분류 자동 설정 안내 */}
      <div className="mx-4 mt-4 mb-0 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs text-slate-600 dark:text-slate-400">
        <p className="font-medium mb-1">※ 층분류 자동 설정 안내</p>
        <ul className="space-y-0.5 ml-3">
          <li>• <strong>셋팅층 설정 시:</strong> 셋팅층 위쪽 → 기준층, 아래쪽 → 일반층으로 자동 변경</li>
          <li>• <strong>기준층 층고 기준:</strong> 기준층 층고와 같은 연속 구간의 마지막 층 = 셋팅층</li>
          <li>• <strong>예시:</strong> 2F를 셋팅층 설정 → 3~5F는 기준층, 1F는 일반층으로 자동 분류</li>
        </ul>
      </div>
      <CardHeader>
        <CardTitle>층 설정</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-2 py-1 text-left text-sm font-semibold text-slate-900 dark:text-white">층</th>
                <th className="px-2 py-1 text-left text-sm font-semibold text-slate-900 dark:text-white">지상/지하</th>
                <th className="px-2 py-1 text-left text-sm font-semibold text-slate-900 dark:text-white">층 분류</th>
                <th className="px-2 py-1 text-left text-sm font-semibold text-slate-900 dark:text-white">층고(mm)</th>
              </tr>
            </thead>
            <tbody>
              {displayFloors.map((floor) => {
                const { actualFloor, actualFloors } = findActualFloors(floor, floors, building.meta.coreCount, building.meta.floorCount.coreGroundFloors);
                const computedClass = resolveFloorClass(floor, building.meta);

                return (
                  <tr
                    key={floor.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <td className="px-2 py-1 text-sm text-slate-900 dark:text-white font-medium">
                      {formatFloorLabel(floor.floorLabel, computedClass)}
                    </td>
                    <td className="px-2 py-1 text-sm text-slate-600 dark:text-slate-400">
                      {floor.levelType}
                    </td>
                    <td className="px-2 py-1">
                      <select
                        value={computedClass}
                        onChange={async (e) => {
                          const newClass = e.target.value as FloorClass;
                          if (floor.id.startsWith('dummy-range-') && actualFloors.length > 0) {
                            for (const f of actualFloors) {
                              await handleFloorUpdate(f.id, { floorClass: newClass }, false);
                            }
                          } else if (actualFloor) {
                            await handleFloorUpdate(actualFloor.id, { floorClass: newClass });
                          }
                        }}
                        disabled={!actualFloor && actualFloors.length === 0}
                        className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {FLOOR_CLASSES.map((fc) => (
                          <option key={fc} value={fc}>{fc}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={resolveFloorHeight({ ...floor, floorClass: computedClass }, building.meta.heights) ?? ''}
                        disabled={true}
                        readOnly
                        className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white cursor-not-allowed"
                        placeholder="기준층고에서 설정"
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
  );
}
