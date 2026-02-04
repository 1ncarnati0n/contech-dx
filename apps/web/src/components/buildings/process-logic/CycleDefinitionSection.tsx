'use client';

import { useState, Fragment } from 'react';
import { Timer, Check, Minus } from 'lucide-react';
import { Card } from '@/components/ui';

interface CycleDefinition {
  cycle: string;
  days: number;
  settingFloor: boolean;
  standardFloor: boolean;
  phFloor: boolean;
  description: string;
}

const CYCLE_DEFINITIONS: CycleDefinition[] = [
  {
    cycle: '5일',
    days: 5,
    settingFloor: false,
    standardFloor: true,
    phFloor: true,
    description: '빠른 공정 (고층 단순 구조)',
  },
  {
    cycle: '6일',
    days: 6,
    settingFloor: true,
    standardFloor: true,
    phFloor: true,
    description: '표준 공정 (일반적인 아파트)',
  },
  {
    cycle: '7일',
    days: 7,
    settingFloor: true,
    standardFloor: true,
    phFloor: true,
    description: '안정 공정 (복잡한 구조)',
  },
  {
    cycle: '8일',
    days: 8,
    settingFloor: true,
    standardFloor: true,
    phFloor: true,
    description: '여유 공정 (대형 평면)',
  },
];

// 각 사이클별 세부 일정 정의
const CYCLE_DETAILS: Record<
  string,
  { day: number; task: string; category: string }[]
> = {
  '5일': [
    { day: 1, task: '먹매김, 갱폼설치', category: '준비' },
    { day: 2, task: '벽철근 조립, 알폼조립', category: '철근/형틀' },
    { day: 3, task: '슬라브철근 조립, 마감작업', category: '철근/형틀' },
    { day: 4, task: '콘크리트 타설', category: '타설' },
    { day: 5, task: '양생', category: '양생' },
  ],
  '6일': [
    { day: 1, task: '먹매김, 갱폼설치', category: '준비' },
    { day: 2, task: '벽철근 조립', category: '철근' },
    { day: 3, task: '알폼조립', category: '형틀' },
    { day: 4, task: '슬라브철근 조립', category: '철근' },
    { day: 5, task: '마감작업, 타설', category: '타설' },
    { day: 6, task: '양생', category: '양생' },
  ],
  '7일': [
    { day: 1, task: '먹매김', category: '준비' },
    { day: 2, task: '갱폼설치, 보강', category: '형틀' },
    { day: 3, task: '벽철근 조립', category: '철근' },
    { day: 4, task: '알폼조립', category: '형틀' },
    { day: 5, task: '슬라브철근 조립, 검측', category: '철근' },
    { day: 6, task: '마감작업, 타설', category: '타설' },
    { day: 7, task: '양생', category: '양생' },
  ],
  '8일': [
    { day: 1, task: '먹매김', category: '준비' },
    { day: 2, task: '갱폼설치', category: '형틀' },
    { day: 3, task: '갱폼 보강/검측', category: '형틀' },
    { day: 4, task: '벽철근 조립', category: '철근' },
    { day: 5, task: '알폼조립', category: '형틀' },
    { day: 6, task: '슬라브철근 조립', category: '철근' },
    { day: 7, task: '마감작업, 타설', category: '타설' },
    { day: 8, task: '양생', category: '양생' },
  ],
};

export function CycleDefinitionSection() {
  const [selectedCycle, setSelectedCycle] = useState<string | null>('6일');

  const getCategoryColor = (category: string) => {
    switch (category) {
      case '준비':
        return 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300';
      case '형틀':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
      case '철근':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case '철근/형틀':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
      case '타설':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case '양생':
        return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400';
      default:
        return 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300';
    }
  };

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
              기준층/셋팅층/PH층 공정 사이클 비교
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
                    기준층
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                    PH층
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                    설명
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                    상세
                  </th>
                </tr>
              </thead>
              <tbody>
                {CYCLE_DEFINITIONS.map((def) => (
                  <Fragment key={def.cycle}>
                    {/* 사이클 메인 행 */}
                    <tr
                      className={`transition-colors border-b border-zinc-200 dark:border-zinc-700 ${
                        selectedCycle === def.cycle
                          ? 'bg-purple-50 dark:bg-purple-900/20'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
                      }`}
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
                        {def.standardFloor ? (
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
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() =>
                            setSelectedCycle(
                              selectedCycle === def.cycle ? null : def.cycle
                            )
                          }
                          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                            selectedCycle === def.cycle
                              ? 'bg-purple-600 text-white'
                              : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                          }`}
                        >
                          {selectedCycle === def.cycle ? '접기' : '보기'}
                        </button>
                      </td>
                    </tr>

                    {/* 사이클 상세 행 - 선택 시 바로 아래에 표시 */}
                    {selectedCycle === def.cycle && CYCLE_DETAILS[def.cycle] && (
                      <tr key={`${def.cycle}-detail`}>
                        <td
                          colSpan={6}
                          className="px-0 py-0 bg-purple-50/50 dark:bg-purple-900/10 border-b border-zinc-200 dark:border-zinc-700"
                        >
                          <div className="px-4 py-4">
                            <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-3 flex items-center gap-2">
                              <Timer className="w-4 h-4" />
                              {def.cycle} 사이클 일별 작업 상세
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {CYCLE_DETAILS[def.cycle].map((detail) => (
                                <div
                                  key={detail.day}
                                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-800 rounded-lg border border-purple-200 dark:border-purple-800/50 shadow-sm"
                                >
                                  <span className="w-7 h-7 flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold rounded">
                                    D{detail.day}
                                  </span>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-zinc-900 dark:text-white">
                                      {detail.task}
                                    </span>
                                    <span
                                      className={`text-xs px-1.5 py-0.5 rounded w-fit ${getCategoryColor(
                                        detail.category
                                      )}`}
                                    >
                                      {detail.category}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
