/**
 * 내장 계산 공식 정의
 */

import type { CalculationFormula } from '@/lib/types';

/**
 * 시스템 기본 제공 공식 (읽기 전용)
 */
export const BUILT_IN_FORMULAS: CalculationFormula[] = [
  {
    id: 'total-workers',
    name: '총작업인원',
    formula: 'CEIL({수량} / {인당생산성})',
    variables: [
      {
        name: '수량',
        description: '해당 공정의 물량 (㎡, ㎥, TON 등)',
        valueType: 'reference',
      },
      {
        name: '인당생산성',
        description: '작업자 1명이 1일 작업 가능한 양',
        valueType: 'number',
      },
    ],
    example: '형틀 500㎡ ÷ 인당생산성 10㎡ = 50명',
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'equipment-count',
    name: '장비대수',
    formula: 'CEIL(MIN({최대대수}, {수량} / {대당타설량}))',
    variables: [
      {
        name: '최대대수',
        description: '동별공정계획의 펌프카 최대 투입대수 (기본값: 2)',
        valueType: 'number',
      },
      {
        name: '수량',
        description: '콘크리트 타설량 (㎥)',
        valueType: 'reference',
      },
      {
        name: '대당타설량',
        description: '장비 1대당 1일 타설 가능량 (부위별 상이)',
        valueType: 'number',
      },
    ],
    example: 'MIN(2, 1000㎥ ÷ 650㎥) = MIN(2, 1.54) → CEIL(1.54) = 2대',
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'daily-input-workers',
    name: '1일투입인원',
    formula: '{장비대수} * {장비당인원}',
    variables: [
      {
        name: '장비대수',
        description: '계산된 장비 투입 대수',
        valueType: 'calculated',
      },
      {
        name: '장비당인원',
        description: '장비 1대당 필요 인원 (버림: 4명, 기초/지하: 5명, 기준층: 6명)',
        valueType: 'number',
      },
    ],
    example: '장비 2대 × 6명 = 12명',
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'direct-work-days',
    name: '순작업일수',
    formula: '{수량} / ({인당생산성} * {1일투입인원})',
    variables: [
      {
        name: '수량',
        description: '해당 공정의 물량',
        valueType: 'reference',
      },
      {
        name: '인당생산성',
        description: '작업자 1명이 1일 작업 가능한 양',
        valueType: 'number',
      },
      {
        name: '1일투입인원',
        description: '하루에 투입되는 작업자 수',
        valueType: 'calculated',
      },
    ],
    example: '1000㎥ ÷ (130㎥ × 12명) = 0.64일 → 반올림 적용',
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'total-work-days',
    name: '총작업일수',
    formula: '{순작업일} + {간접일}',
    variables: [
      {
        name: '순작업일',
        description: '실제 작업에 소요되는 일수',
        valueType: 'calculated',
      },
      {
        name: '간접일',
        description: '양생, 검측, 보강 등 부대 작업 일수',
        valueType: 'number',
      },
    ],
    example: '순작업 1일 + 양생 3일 = 4일',
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
];
