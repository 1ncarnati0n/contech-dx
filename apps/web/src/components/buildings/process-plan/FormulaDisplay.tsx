'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 산식 단계 인터페이스
 */
export interface FormulaStep {
  stepNumber: number;
  title: string;
  formula?: string;
  variables?: Array<{
    name: string;
    value: number | string;
    source?: string; // 데이터 출처 (예: "물량입력표 D6")
  }>;
  result?: {
    value: number | string;
    unit?: string;
  };
}

/**
 * 계산 결과 인터페이스 (외부에서 사용)
 */
export interface CalculationResult {
  quantity: number;
  quantitySource?: string;
  totalWorkers: number;
  dailyInputWorkers: number;
  directWorkDays: number;
  indirectDays: number;
  totalWorkDays: number;
  equipmentCount?: number;
  formulaSteps: FormulaStep[];
}

interface FormulaDisplayProps {
  /** 계산 단계들 */
  steps: FormulaStep[];
  /** 초기 열림 상태 */
  defaultOpen?: boolean;
  /** 추가 클래스명 */
  className?: string;
}

/**
 * 산식 표시 컴포넌트
 * 계산 과정을 단계별로 시각화합니다.
 */
export function FormulaDisplay({
  steps,
  defaultOpen = false,
  className,
}: FormulaDisplayProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <div className={cn('mt-2', className)}>
      {/* 토글 버튼 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 text-xs font-medium',
          'text-cyan-600 dark:text-cyan-400',
          'hover:text-cyan-700 dark:hover:text-cyan-300',
          'transition-colors duration-150'
        )}
      >
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <Calculator className="w-3.5 h-3.5" />
        <span>계산 과정</span>
      </button>

      {/* 산식 내용 */}
      {isOpen && (
        <div
          className={cn(
            'mt-2 p-3 rounded-lg',
            'bg-slate-50 dark:bg-slate-800/50',
            'border border-slate-200 dark:border-slate-700'
          )}
        >
          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.stepNumber} className="space-y-1">
                {/* 단계 제목 */}
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center',
                      'w-5 h-5 rounded-full',
                      'bg-cyan-100 dark:bg-cyan-900/50',
                      'text-cyan-700 dark:text-cyan-300',
                      'text-xs font-bold'
                    )}
                  >
                    {step.stepNumber}
                  </span>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {step.title}
                  </span>
                </div>

                {/* 변수 목록 */}
                {step.variables && step.variables.length > 0 && (
                  <div className="ml-7 space-y-0.5">
                    {step.variables.map((variable, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className="text-slate-600 dark:text-slate-400">
                          {variable.name} =
                        </span>
                        <span className="font-mono text-slate-900 dark:text-white">
                          {typeof variable.value === 'number'
                            ? variable.value.toFixed(2)
                            : variable.value}
                        </span>
                        {variable.source && (
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded-full text-[10px]',
                              'bg-blue-100 dark:bg-blue-900/50',
                              'text-blue-700 dark:text-blue-300'
                            )}
                          >
                            ← {variable.source}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 수식 */}
                {step.formula && (
                  <div
                    className={cn(
                      'ml-7 px-2 py-1 rounded',
                      'bg-slate-100 dark:bg-slate-700/50',
                      'font-mono text-xs',
                      'text-slate-700 dark:text-slate-300'
                    )}
                  >
                    {step.formula}
                  </div>
                )}

                {/* 결과 */}
                {step.result && (
                  <div className="ml-7 flex items-center gap-1 text-xs">
                    <span className="text-slate-600 dark:text-slate-400">
                      =
                    </span>
                    <span
                      className={cn(
                        'font-bold',
                        'text-green-600 dark:text-green-400'
                      )}
                    >
                      {typeof step.result.value === 'number'
                        ? step.result.value.toFixed(2)
                        : step.result.value}
                      {step.result.unit && (
                        <span className="font-normal ml-0.5">
                          {step.result.unit}
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

FormulaDisplay.displayName = 'FormulaDisplay';
