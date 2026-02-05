'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui';
import { FormulaDisplay, type CalculationResult } from './FormulaDisplay';
import type { ProcessItem } from '@/lib/data/process-modules';

interface ProcessItemCardProps {
  /** 세부공종 항목 데이터 */
  item: ProcessItem;
  /** 순번 (1부터 시작) */
  index: number;
  /** 계산 결과 */
  calculationResult: CalculationResult;
  /** 순작업일 오버라이드 값 */
  overriddenDirectWorkDays?: number;
  /** 순작업일 변경 핸들러 */
  onDirectWorkDaysChange: (value: number | null) => void;
  /** 추가 클래스명 */
  className?: string;
}

/**
 * 개별 세부공종 카드 컴포넌트
 * 순번, 세부공정 정보, 계산 과정을 표시합니다.
 */
export function ProcessItemCard({
  item,
  index,
  calculationResult,
  overriddenDirectWorkDays,
  onDirectWorkDaysChange,
  className,
}: ProcessItemCardProps) {
  const {
    quantity,
    quantitySource,
    totalWorkers,
    dailyInputWorkers,
    directWorkDays,
    totalWorkDays,
    equipmentCount,
    formulaSteps,
  } = calculationResult;

  // 먹매김이 아닌 항목인지 확인
  const isNotMarking = !item.workItem.includes('먹매김');
  // 타설 항목인지 확인 (장비대수 계산이 있는 경우)
  const isConcreteItem = item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined;

  // 공정명에서 번호와 괄호 내용 제거
  const cleanWorkItemName = item.workItem
    .replace(/^\d+\.\s*/, '')
    .replace(/\s*\(1일\)/, '');

  return (
    <div
      className={cn(
        'p-4 bg-white dark:bg-zinc-900 rounded-lg',
        'border border-zinc-200 dark:border-zinc-800',
        'hover:border-accent-300 dark:hover:border-accent-700',
        'hover:shadow-md transition-all duration-200',
        className
      )}
    >
      {/* 헤더: 순번 + 공정명 */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {/* 순번 배지 */}
          <span
            className={cn(
              'inline-flex items-center justify-center',
              'w-7 h-7 rounded-full',
              'bg-accent-500 text-white',
              'text-xs font-bold',
              'flex-shrink-0'
            )}
          >
            #{index}
          </span>
          {/* 공정명 */}
          <h4 className="font-bold text-base text-zinc-900 dark:text-white">
            {cleanWorkItemName}
          </h4>
        </div>
      </div>

      {/* 순작업일 입력 */}
      <div className="mb-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
            순작업일
          </label>
          <Input
            type="number"
            min="0"
            step="1"
            value={directWorkDays > 0 ? Math.round(directWorkDays) : ''}
            onChange={(e) => {
              const value = e.target.value === '' ? null : Math.round(parseFloat(e.target.value) || 0);
              onDirectWorkDaysChange(value);
            }}
            className={cn(
              'w-24 h-10 text-base font-bold',
              'text-zinc-900 dark:text-white',
              '[&::-webkit-inner-spin-button]:appearance-none',
              '[&::-webkit-outer-spin-button]:appearance-none',
              '[-moz-appearance:textfield]'
            )}
            placeholder="0"
          />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">일</span>
        </div>
      </div>

      {/* 상세 정보 그리드 */}
      <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
        {/* 단위 */}
        {item.unit && (
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 dark:text-zinc-500">●</span>
            <span>단위:</span>
            <span className="text-zinc-900 dark:text-white">{item.unit}</span>
          </div>
        )}

        {/* 수량 + 출처 */}
        {item.quantityReference && (
          <div className="flex items-start gap-2">
            <span className="text-zinc-500 dark:text-zinc-500">●</span>
            <span>수량:</span>
            <span className="text-zinc-900 dark:text-white">
              {quantity.toFixed(2)}
            </span>
            {quantitySource && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px]',
                  'bg-blue-100 dark:bg-blue-900/50',
                  'text-blue-700 dark:text-blue-300',
                  'whitespace-nowrap'
                )}
              >
                ← {quantitySource}
              </span>
            )}
          </div>
        )}

        {/* 장비투입대수 (타설 항목) */}
        {isConcreteItem && equipmentCount && equipmentCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 dark:text-zinc-500">●</span>
            <span>장비투입대수:</span>
            <span className="text-zinc-900 dark:text-white">{equipmentCount}대</span>
          </div>
        )}

        {/* 인당 생산성 (타설 제외) */}
        {isNotMarking && !isConcreteItem && item.dailyProductivity > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 dark:text-zinc-500">●</span>
            <span>인당생산성:</span>
            <span className="text-zinc-900 dark:text-white">
              {item.dailyProductivity}
              {item.unit && <span className="text-zinc-500">/{item.unit}</span>}
            </span>
          </div>
        )}

        {/* 총투입인원 */}
        {isNotMarking && totalWorkers > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 dark:text-zinc-500">●</span>
            <span>총투입인원:</span>
            <span className="text-zinc-900 dark:text-white">{totalWorkers}명</span>
          </div>
        )}

        {/* 1일 투입인원 */}
        {dailyInputWorkers > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 dark:text-zinc-500">●</span>
            <span>1일투입인원:</span>
            <span className="text-zinc-900 dark:text-white">{dailyInputWorkers}명</span>
          </div>
        )}

        {/* 간접작업일 */}
        {item.indirectDays > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 dark:text-zinc-500">●</span>
            <span>간접작업일:</span>
            <span className="text-zinc-900 dark:text-white">{item.indirectDays}일</span>
            {item.indirectWorkItem && (
              <span className="text-zinc-500">({item.indirectWorkItem})</span>
            )}
          </div>
        )}

        {/* 총작업일수 */}
        <div className="flex items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-accent-500 dark:text-accent-400">▶</span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            총작업일수:
          </span>
          <span className="font-bold text-zinc-900 dark:text-white">
            {totalWorkDays}일
          </span>
        </div>
      </div>

      {/* 계산 과정 (접이식) */}
      <FormulaDisplay steps={formulaSteps} defaultOpen={false} />
    </div>
  );
}

ProcessItemCard.displayName = 'ProcessItemCard';
