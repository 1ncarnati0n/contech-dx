'use client';

import { useState, useCallback } from 'react';
import type { CalculationFormula, FormulaVariable } from '@/lib/types';
import { BUILT_IN_FORMULAS } from '@/lib/data/built-in-formulas';
import { logger } from '@/lib/utils/logger';

const STORAGE_FORMULAS_PREFIX = 'contech-process-formulas-';

interface UseFormulaEditorOptions {
  projectId: string;
}

interface UseFormulaEditorReturn {
  formulas: CalculationFormula[];
  isLoading: boolean;

  // Actions
  loadFormulas: () => void;
  createFormula: (formula: Omit<CalculationFormula, 'id' | 'isBuiltIn' | 'createdAt' | 'updatedAt'>) => void;
  updateFormula: (id: string, updates: Partial<Omit<CalculationFormula, 'id' | 'isBuiltIn' | 'createdAt' | 'updatedAt'>>) => void;
  deleteFormula: (id: string) => void;
  validateFormula: (formula: string) => { isValid: boolean; error?: string };
}

/**
 * 공식 편집 훅
 *
 * 내장 공식과 사용자 정의 공식을 관리합니다.
 * 내장 공식은 읽기 전용이며, 사용자 정의 공식만 수정 가능합니다.
 */
export function useFormulaEditor({ projectId }: UseFormulaEditorOptions): UseFormulaEditorReturn {
  const [customFormulas, setCustomFormulas] = useState<CalculationFormula[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = `${STORAGE_FORMULAS_PREFIX}${projectId}`;

  // 공식 ID 생성
  const generateFormulaId = useCallback(() => {
    return `formula-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // localStorage에서 사용자 정의 공식 로드
  const loadFormulas = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as CalculationFormula[];
        setCustomFormulas(parsed);
      }
      setIsLoading(false);
    } catch (error) {
      logger.error('Failed to load custom formulas:', error);
      setIsLoading(false);
    }
  }, [storageKey]);

  // localStorage에 사용자 정의 공식 저장
  const saveFormulasToStorage = useCallback(
    (formulas: CalculationFormula[]) => {
      if (typeof window === 'undefined') return;

      try {
        localStorage.setItem(storageKey, JSON.stringify(formulas));
        setCustomFormulas(formulas);
      } catch (error) {
        logger.error('Failed to save custom formulas:', error);
      }
    },
    [storageKey]
  );

  // 공식 생성
  const createFormula = useCallback(
    (formula: Omit<CalculationFormula, 'id' | 'isBuiltIn' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const newFormula: CalculationFormula = {
        ...formula,
        id: generateFormulaId(),
        isBuiltIn: false,
        createdAt: now,
        updatedAt: now,
      };

      const updated = [...customFormulas, newFormula];
      saveFormulasToStorage(updated);
    },
    [customFormulas, generateFormulaId, saveFormulasToStorage]
  );

  // 공식 수정
  const updateFormula = useCallback(
    (id: string, updates: Partial<Omit<CalculationFormula, 'id' | 'isBuiltIn' | 'createdAt' | 'updatedAt'>>) => {
      const updated = customFormulas.map((f) =>
        f.id === id && !f.isBuiltIn
          ? { ...f, ...updates, updatedAt: new Date().toISOString() }
          : f
      );
      saveFormulasToStorage(updated);
    },
    [customFormulas, saveFormulasToStorage]
  );

  // 공식 삭제
  const deleteFormula = useCallback(
    (id: string) => {
      const updated = customFormulas.filter((f) => f.id !== id || f.isBuiltIn);
      saveFormulasToStorage(updated);
    },
    [customFormulas, saveFormulasToStorage]
  );

  // 공식 문법 검증
  const validateFormula = useCallback((formula: string): { isValid: boolean; error?: string } => {
    // 기본 검증: 빈 문자열 체크
    if (!formula.trim()) {
      return { isValid: false, error: '공식을 입력해주세요.' };
    }

    // 변수 패턴 체크 ({변수명})
    const variablePattern = /\{([^}]+)\}/g;
    const variables = formula.match(variablePattern);

    if (!variables || variables.length === 0) {
      return { isValid: false, error: '최소 1개 이상의 변수가 필요합니다. 예: {수량}' };
    }

    // 지원하는 함수 체크
    const supportedFunctions = ['CEIL', 'FLOOR', 'ROUND', 'MIN', 'MAX', 'ABS'];
    const functionPattern = /([A-Z]+)\(/g;
    const functions = [...formula.matchAll(functionPattern)].map((m) => m[1]);

    for (const fn of functions) {
      if (!supportedFunctions.includes(fn)) {
        return {
          isValid: false,
          error: `지원하지 않는 함수: ${fn}. 지원 함수: ${supportedFunctions.join(', ')}`,
        };
      }
    }

    // 괄호 균형 체크
    const openCount = (formula.match(/\(/g) || []).length;
    const closeCount = (formula.match(/\)/g) || []).length;

    if (openCount !== closeCount) {
      return { isValid: false, error: '괄호가 올바르게 닫히지 않았습니다.' };
    }

    // 허용된 문자만 사용 체크 (변수, 연산자, 함수, 괄호, 숫자, 공백, 소수점)
    const allowedPattern = /^[\s\d+\-*/().{}\w가-힣]+$/;
    if (!allowedPattern.test(formula)) {
      return { isValid: false, error: '허용되지 않은 문자가 포함되어 있습니다.' };
    }

    return { isValid: true };
  }, []);

  // 내장 공식 + 사용자 정의 공식 결합
  const allFormulas = [...BUILT_IN_FORMULAS, ...customFormulas];

  return {
    formulas: allFormulas,
    isLoading,
    loadFormulas,
    createFormula,
    updateFormula,
    deleteFormula,
    validateFormula,
  };
}
