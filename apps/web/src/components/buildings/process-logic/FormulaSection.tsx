'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Calculator, Info } from 'lucide-react';
import { Card } from '@/components/ui';

interface Formula {
  id: string;
  name: string;
  formula: string;
  variables: { name: string; description: string }[];
  example?: string;
}

const FORMULAS: Formula[] = [
  {
    id: 'total-workers',
    name: '총작업인원',
    formula: 'CEIL(수량 / 인당생산성)',
    variables: [
      { name: '수량', description: '해당 공정의 물량 (㎡, ㎥, TON 등)' },
      { name: '인당생산성', description: '작업자 1명이 1일 작업 가능한 양' },
    ],
    example: '형틀 500㎡ ÷ 인당생산성 10㎡ = 50명',
  },
  {
    id: 'equipment-count',
    name: '장비대수',
    formula: 'CEIL(MIN(최대대수, 수량 / 대당타설량))',
    variables: [
      { name: '최대대수', description: '동별공정계획의 펌프카 최대 투입대수 (기본값: 2)' },
      { name: '수량', description: '콘크리트 타설량 (㎥)' },
      { name: '대당타설량', description: '장비 1대당 1일 타설 가능량 (부위별 상이)' },
    ],
    example: 'MIN(2, 1000㎥ ÷ 650㎥) = MIN(2, 1.54) → CEIL(1.54) = 2대',
  },
  {
    id: 'daily-input-workers',
    name: '1일투입인원',
    formula: '장비대수 × 장비당인원',
    variables: [
      { name: '장비대수', description: '계산된 장비 투입 대수' },
      { name: '장비당인원', description: '장비 1대당 필요 인원 (버림: 4명, 기초/지하: 5명, 기준층: 6명)' },
    ],
    example: '장비 2대 × 6명 = 12명',
  },
  {
    id: 'direct-work-days',
    name: '순작업일수',
    formula: '수량 / (인당생산성 × 1일투입인원)',
    variables: [
      { name: '수량', description: '해당 공정의 물량' },
      { name: '인당생산성', description: '작업자 1명이 1일 작업 가능한 양' },
      { name: '1일투입인원', description: '하루에 투입되는 작업자 수' },
    ],
    example: '1000㎥ ÷ (130㎥ × 12명) = 0.64일 → 반올림 적용',
  },
  {
    id: 'total-work-days',
    name: '총작업일수',
    formula: '순작업일 + 간접일',
    variables: [
      { name: '순작업일', description: '실제 작업에 소요되는 일수' },
      { name: '간접일', description: '양생, 검측, 보강 등 부대 작업 일수' },
    ],
    example: '순작업 1일 + 양생 3일 = 4일',
  },
];

interface FormulaSectionProps {
  isEditing?: boolean;
}

export function FormulaSection({ isEditing = false }: FormulaSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedFormula, setExpandedFormula] = useState<string | null>(null);

  const toggleFormula = (id: string) => {
    setExpandedFormula(expandedFormula === id ? null : id);
  };

  return (
    <Card className="p-0 overflow-hidden">
      {/* 섹션 헤더 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              계산 공식
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              공정 일수 산출에 사용되는 기본 공식
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-zinc-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-zinc-400" />
        )}
      </button>

      {/* 섹션 콘텐츠 */}
      {isExpanded && (
        <div className="border-t border-zinc-200 dark:border-zinc-700">
          <div className="p-4 space-y-3">
            {FORMULAS.map((formula) => (
              <div
                key={formula.id}
                className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden"
              >
                {/* 공식 헤더 */}
                <button
                  onClick={() => toggleFormula(formula.id)}
                  className="w-full flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {formula.name}
                    </span>
                    <code className="px-2 py-1 bg-zinc-200 dark:bg-zinc-700 rounded text-sm font-mono text-zinc-700 dark:text-zinc-300">
                      {formula.formula}
                    </code>
                  </div>
                  {expandedFormula === formula.id ? (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  )}
                </button>

                {/* 공식 상세 */}
                {expandedFormula === formula.id && (
                  <div className="p-4 space-y-3 bg-white dark:bg-zinc-900">
                    {/* 변수 설명 */}
                    <div>
                      <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        변수 설명
                      </h4>
                      <ul className="space-y-1">
                        {formula.variables.map((variable, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <code className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                              {variable.name}
                            </code>
                            <span className="text-zinc-600 dark:text-zinc-400">
                              {variable.description}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 예제 */}
                    {formula.example && (
                      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            예제:{' '}
                          </span>
                          <span className="text-sm text-blue-600 dark:text-blue-400">
                            {formula.example}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 부위별 대당 타설량 기준표 */}
          <div className="border-t border-zinc-200 dark:border-zinc-700 p-4">
            <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              부위별 대당 타설량 기준
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {[
                { label: '버림', value: '650㎥' },
                { label: '기초', value: '650㎥' },
                { label: '지하층', value: '500㎥' },
                { label: '셋팅층', value: '400㎥' },
                { label: '기준층', value: '320㎥' },
                { label: 'PH층', value: '230㎥' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg"
                >
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {item.label}
                  </span>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
