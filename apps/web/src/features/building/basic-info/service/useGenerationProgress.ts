'use client';

import { useState, useCallback } from 'react';

interface UseGenerationProgressResult {
  isGenerating: boolean;
  progress: number;
  message: string;
  handleStart: () => void;
  handleProgress: (progress: number, message: string) => void;
  handleComplete: (onAfterComplete?: () => Promise<void>) => Promise<void>;
}

/**
 * 층 생성 진행률 상태 관리 훅
 */
export function useGenerationProgress(): UseGenerationProgressResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  const handleStart = useCallback(() => {
    setIsGenerating(true);
    setProgress(0);
    setMessage('데이터 저장 중...');
  }, []);

  const handleProgress = useCallback((p: number, msg: string) => {
    setProgress(p);
    setMessage(msg);
  }, []);

  const handleComplete = useCallback(async (onAfterComplete?: () => Promise<void>) => {
    setProgress(100);
    setMessage('완료!');

    if (onAfterComplete) {
      await onAfterComplete();
    }

    setTimeout(() => {
      setIsGenerating(false);
      setProgress(0);
      setMessage('');
    }, 300);
  }, []);

  return {
    isGenerating,
    progress,
    message,
    handleStart,
    handleProgress,
    handleComplete,
  };
}
