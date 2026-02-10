'use client';

import { Timer, Check, Minus } from 'lucide-react';
import { Card } from '@/components/ui';

interface CycleDefinition {
  cycle: string;
  days: number;
  settingFloor: boolean;
  phFloor: boolean;
  description: string;
}

const CYCLE_DEFINITIONS: CycleDefinition[] = [
  {
    cycle: '5일',
    days: 5,
    settingFloor: false,
    phFloor: true,
    description: '빠른 공정 (고층 단순 구조)',
  },
  {
    cycle: '6일',
    days: 6,
    settingFloor: true,
    phFloor: true,
    description: '표준 공정 (일반적인 아파트)',
  },
  {
    cycle: '7일',
    days: 7,
    settingFloor: true,
    phFloor: true,
    description: '안정 공정 (복잡한 구조)',
  },
  {
    cycle: '8일',
    days: 8,
    settingFloor: true,
    phFloor: true,
    description: '여유 공정 (대형 평면)',
  },
];

export function CycleDefinitionSection() {

  return (
    <Card className="p-0 overflow-hidden">
      {/* 섹션 헤더 */}
      <div className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Timer className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              사이클 정의
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              셋팅층/옥탑층 공정 사이클 비교
            </p>
          </div>
        </div>
      </div>

      {/* 섹션 콘텐츠 */}
      <div className="border-t border-zinc-200 dark:border-zinc-700">
        {/* 사이클 비교 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                  사이클
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                  셋팅층
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                  옥탑층
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                  설명
                </th>
              </tr>
            </thead>
            <tbody>
              {CYCLE_DEFINITIONS.map((def) => (
                <tr
                  key={def.cycle}
                  className="transition-colors border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                >
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-10 h-10 flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold rounded-lg">
                        {def.days}
                      </span>
                      <span className="font-medium text-zinc-900 dark:text-white">
                        {def.cycle} 사이클
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {def.settingFloor ? (
                      <Check className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <Minus className="w-5 h-5 text-zinc-300 dark:text-zinc-600 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {def.phFloor ? (
                      <Check className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <Minus className="w-5 h-5 text-zinc-300 dark:text-zinc-600 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {def.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 사이클 선택 가이드 */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700">
          <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            사이클 선택 가이드
          </h4>
          <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              5일 사이클: 단순 구조, 소형 평면, 숙련된 인력
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              6일 사이클: 일반적인 아파트, 표준 권장
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              7일 사이클: 복잡한 구조, 대형 평면
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              8일 사이클: 특수 구조, 품질 우선
            </li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
