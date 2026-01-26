'use client';

import { Button } from '@/components/ui';
import { HelpCircle, Calculator, AlertCircle, BookOpen, Lightbulb } from 'lucide-react';
import type { QuickQuestion, QuickQuestionCategory, HighlightTargetKey } from './ProcessPlanChatbotTypes';

interface QuickQuestionButtonsProps {
  onQuestionClick: (question: string) => void;
}

/**
 * 빠른 질문 목록 (확장됨)
 */
const QUICK_QUESTIONS: Record<QuickQuestionCategory, QuickQuestion[]> = {
  basic: [
    {
      id: 'basic-1',
      category: 'basic',
      question: '동별공정계획은 어떻게 입력하나요?',
      description: '공정계획 입력 방법',
      highlightTargets: ['buildingTabs', 'processTypeSelector'],
    },
    {
      id: 'basic-2',
      category: 'basic',
      question: '공정 타입은 어떻게 선택하나요?',
      description: '공정 타입 선택 가이드',
      highlightTargets: ['processTypeSelector'],
    },
    {
      id: 'basic-3',
      category: 'basic',
      question: '지하층 공정계획과 동별공정계획의 차이는?',
      description: '공정계획 구분 설명',
    },
    {
      id: 'basic-4',
      category: 'basic',
      question: '데이터를 저장하려면 어떻게 하나요?',
      description: '저장 방법',
      highlightTargets: ['saveButton'],
    },
  ],
  calculation: [
    {
      id: 'calc-1',
      category: 'calculation',
      question: '공정일수는 어떻게 계산되나요?',
      description: '공정일수 계산 로직',
      highlightTargets: ['processDaysResult', 'totalProcessDays'],
    },
    {
      id: 'calc-2',
      category: 'calculation',
      question: '물량 기반 계산은 어떻게 하나요?',
      description: '물량 참조 계산',
      highlightTargets: ['quantityInput', 'quantityTable'],
    },
    {
      id: 'calc-3',
      category: 'calculation',
      question: '순작업일과 간접일의 차이는?',
      description: '작업일 구분',
    },
    {
      id: 'calc-4',
      category: 'calculation',
      question: '5일 사이클과 6일 사이클의 차이점은?',
      description: '사이클 비교',
      highlightTargets: ['standardCycle'],
    },
  ],
  error: [
    {
      id: 'error-1',
      category: 'error',
      question: '물량 참조 오류가 발생했어요',
      description: '물량 참조 오류 해결',
      highlightTargets: ['quantityInput'],
    },
    {
      id: 'error-2',
      category: 'error',
      question: '공정일수가 계산되지 않아요',
      description: '계산 오류 해결',
      highlightTargets: ['processDaysResult'],
    },
    {
      id: 'error-3',
      category: 'error',
      question: '입력한 데이터가 저장되지 않아요',
      description: '저장 오류 해결',
      highlightTargets: ['saveButton'],
    },
    {
      id: 'error-4',
      category: 'error',
      question: '층 데이터가 표시되지 않아요',
      description: '층 설정 오류',
      highlightTargets: ['floorSettings'],
    },
  ],
  glossary: [
    {
      id: 'glossary-1',
      category: 'glossary',
      question: '순작업일이 무엇인가요?',
      description: '순작업일 용어',
    },
    {
      id: 'glossary-2',
      category: 'glossary',
      question: '갱폼과 알폼의 차이는?',
      description: '거푸집 용어',
    },
    {
      id: 'glossary-3',
      category: 'glossary',
      question: 'CP 타설구간이 무엇인가요?',
      description: 'CP 타설구간',
    },
    {
      id: 'glossary-4',
      category: 'glossary',
      question: '기준층과 셋팅층의 차이는?',
      description: '층 구분 용어',
    },
  ],
};

const CATEGORY_INFO: Record<
  QuickQuestionCategory,
  { label: string; icon: React.ReactNode; color: string }
> = {
  basic: {
    label: '기본 사용법',
    icon: <HelpCircle className="w-4 h-4" />,
    color:
      'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30',
  },
  calculation: {
    label: '계산 방법',
    icon: <Calculator className="w-4 h-4" />,
    color:
      'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30',
  },
  error: {
    label: '에러 해결',
    icon: <AlertCircle className="w-4 h-4" />,
    color:
      'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30',
  },
  glossary: {
    label: '용어 설명',
    icon: <BookOpen className="w-4 h-4" />,
    color:
      'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30',
  },
};

export function QuickQuestionButtons({ onQuestionClick }: QuickQuestionButtonsProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        빠른 질문
      </h4>
      <div className="space-y-3">
        {(Object.keys(QUICK_QUESTIONS) as QuickQuestionCategory[]).map(category => {
          const categoryInfo = CATEGORY_INFO[category];
          const questions = QUICK_QUESTIONS[category];

          return (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {categoryInfo.icon}
                <span>{categoryInfo.label}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {questions.slice(0, 3).map(question => (
                  <Button
                    key={question.id}
                    variant="outline"
                    size="sm"
                    onClick={() => onQuestionClick(question.question)}
                    className={`text-xs h-auto py-1.5 px-3 border ${categoryInfo.color} transition-colors`}
                  >
                    {question.description || question.question}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 컨텍스트 기반 추천 질문 컴포넌트
 */
interface ContextualQuestionsProps {
  currentStep?: 'type_selection' | 'quantity_input' | 'calculation' | 'review';
  hasErrors?: boolean;
  onQuestionClick: (question: string) => void;
}

export function ContextualQuestions({
  currentStep,
  hasErrors,
  onQuestionClick,
}: ContextualQuestionsProps) {
  // 현재 단계에 맞는 추천 질문
  const getContextualQuestions = (): string[] => {
    if (hasErrors) {
      return [
        '현재 발생한 오류를 어떻게 해결하나요?',
        '물량 데이터가 누락되었어요',
        '입력값을 다시 확인하고 싶어요',
      ];
    }

    switch (currentStep) {
      case 'type_selection':
        return [
          '어떤 사이클을 선택해야 하나요?',
          '공정 타입 선택 기준이 뭔가요?',
          '5일 사이클과 6일 사이클의 차이는?',
        ];
      case 'quantity_input':
        return [
          '물량 참조는 어떻게 하나요?',
          '물량 입력이 누락되었어요',
          '형틀, 철근, 콘크리트 물량의 의미는?',
        ];
      case 'calculation':
        return [
          '공정일수 계산 방법이 궁금해요',
          '계산 결과가 이상해요',
          '순작업일과 간접일의 차이는?',
        ];
      case 'review':
        return [
          '공정계획 검토 포인트는?',
          '총 공정일수가 적절한가요?',
          '저장 후 수정이 가능한가요?',
        ];
      default:
        return [
          '동별공정계획은 어떻게 입력하나요?',
          '공정일수는 어떻게 계산되나요?',
          '갱폼과 알폼의 차이는?',
        ];
    }
  };

  const questions = getContextualQuestions();

  return (
    <div className="space-y-2">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">추천 질문</span>
      <div className="flex flex-wrap gap-2">
        {questions.map((question, idx) => (
          <Button
            key={idx}
            variant="outline"
            size="sm"
            onClick={() => onQuestionClick(question)}
            className="text-xs h-auto py-1 px-2 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 dark:hover:bg-cyan-900/30"
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  );
}
