'use client';

import { Button } from '@/components/ui';
import { Lightbulb, X } from 'lucide-react';
import type { QuickQuestion } from '@/lib/data/global-chatbot-config';
import { QUICK_QUESTION_CATEGORY_STYLES } from '@/lib/data/global-chatbot-config';

interface GlobalQuickQuestionsProps {
  questions: QuickQuestion[];
  onQuestionClick: (question: string) => void;
  onClose?: () => void;
}

/**
 * 전역 챗봇용 빠른 질문 버튼 컴포넌트
 */
export function GlobalQuickQuestions({
  questions,
  onQuestionClick,
  onClose,
}: GlobalQuickQuestionsProps) {
  if (!questions || questions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          빠른 질문
        </h4>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            title="빠른 질문 숨기기"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {questions.map(question => {
          const styles = QUICK_QUESTION_CATEGORY_STYLES[question.category];
          return (
            <Button
              key={question.id}
              variant="outline"
              size="sm"
              onClick={() => onQuestionClick(question.question)}
              className={`text-xs h-auto py-1.5 px-3 border transition-colors hover:opacity-80 ${styles.bgColor} ${styles.color} ${styles.borderColor}`}
            >
              {question.description}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
