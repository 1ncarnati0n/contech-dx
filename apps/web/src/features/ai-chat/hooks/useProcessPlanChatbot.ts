'use client';

/**
 * 공정계획 챗봇 커스텀 훅
 * 상태 관리, 메시지 전송, 하이라이트 처리
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ProcessPlanMessage,
  ProcessPlanChatContext,
  ChatContextSnapshot,
  HighlightTarget,
  ChatbotError,
  ChatbotState,
} from '@/features/building/chatbot/ProcessPlanChatbotTypes';
import { sendProcessPlanChat } from '@/features/ai-chat/service/process-plan-chatbot';
import { buildChatContext } from '@/features/ai-chat/service/chatbot-context-builder';

interface UseProcessPlanChatbotOptions {
  projectId: string;
  buildingId?: string;
  page?: 'building' | 'basement';
  onHighlightRequest?: (targets: HighlightTarget[]) => void;
}

interface UseProcessPlanChatbotReturn {
  // 상태
  isOpen: boolean;
  isLoading: boolean;
  messages: ProcessPlanMessage[];
  error: ChatbotError | null;
  retryCount: number;
  activeHighlights: HighlightTarget[];

  // 액션
  open: () => void;
  close: () => void;
  toggle: () => void;
  sendMessage: (query: string) => Promise<void>;
  clearMessages: () => void;
  cancelRequest: () => void;
  clearHighlights: () => void;

  // 컨텍스트
  updateContext: (context: Partial<ProcessPlanChatContext>) => void;
  setContextSnapshot: (snapshot: ChatContextSnapshot) => void;
}

/**
 * 공정계획 챗봇 훅
 */
export function useProcessPlanChatbot(
  options: UseProcessPlanChatbotOptions
): UseProcessPlanChatbotReturn {
  const { projectId, buildingId, page = 'building', onHighlightRequest } = options;

  // 상태
  const [state, setState] = useState<ChatbotState>({
    isOpen: false,
    isLoading: false,
    messages: [],
    error: null,
    retryCount: 0,
    activeHighlights: [],
  });

  // 컨텍스트
  const [context, setContext] = useState<ProcessPlanChatContext>({
    page,
    projectId,
    buildingId,
  });

  const [contextSnapshot, setContextSnapshotState] = useState<ChatContextSnapshot | undefined>();

  // AbortController ref
  const abortControllerRef = useRef<AbortController | null>(null);

  // 컨텍스트 업데이트 시 동기화
  useEffect(() => {
    setContext(prev => ({
      ...prev,
      page,
      projectId,
      buildingId,
    }));
  }, [page, projectId, buildingId]);

  // 열기/닫기
  const open = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: true }));
  }, []);

  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const toggle = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  // 메시지 전송
  const sendMessage = useCallback(
    async (query: string) => {
      if (!query.trim() || state.isLoading) return;

      // 사용자 메시지 추가
      const userMessage: ProcessPlanMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: query,
        timestamp: new Date(),
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        isLoading: true,
        error: null,
        retryCount: 0,
      }));

      // 이전 요청 취소
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        // 컨텍스트 스냅샷 생성 (building, processPlan이 있는 경우)
        const snapshot = contextSnapshot || (context.building
          ? buildChatContext(context)
          : undefined);

        const history = state.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

        const response = await sendProcessPlanChat(
          {
            query,
            context,
            contextSnapshot: snapshot,
            history,
          },
          {
            signal: abortController.signal,
            onRetry: (attempt, error) => {
              setState(prev => ({
                ...prev,
                retryCount: attempt,
                error,
              }));
            },
          }
        );

        // 요청 취소 확인
        if (abortController.signal.aborted) return;

        if (response.success && response.answer) {
          const aiMessage: ProcessPlanMessage = {
            id: `ai-${Date.now()}`,
            role: 'model',
            content: response.answer,
            citations: response.citations,
            timestamp: new Date(),
            highlightTargets: response.highlightTargets,
          };

          setState(prev => ({
            ...prev,
            messages: [...prev.messages, aiMessage],
            isLoading: false,
            error: null,
            retryCount: 0,
            activeHighlights: response.highlightTargets || [],
          }));

          // 하이라이트 요청
          if (response.highlightTargets && response.highlightTargets.length > 0) {
            onHighlightRequest?.(response.highlightTargets);
          }
        } else {
          const errorMessage: ProcessPlanMessage = {
            id: `error-${Date.now()}`,
            role: 'model',
            content: `오류가 발생했습니다: ${response.error?.message || '알 수 없는 오류'}`,
            timestamp: new Date(),
            error: response.error,
          };

          setState(prev => ({
            ...prev,
            messages: [...prev.messages, errorMessage],
            isLoading: false,
            error: response.error || null,
          }));
        }
      } catch (error) {
        if (abortController.signal.aborted) return;

        const chatbotError: ChatbotError = {
          type: 'UNKNOWN',
          message: error instanceof Error ? error.message : '알 수 없는 오류',
          retryable: true,
        };

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: chatbotError,
        }));
      } finally {
        abortControllerRef.current = null;
      }
    },
    [state.isLoading, state.messages, context, contextSnapshot, onHighlightRequest]
  );

  // 메시지 초기화
  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
      error: null,
      retryCount: 0,
      activeHighlights: [],
    }));
  }, []);

  // 요청 취소
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setState(prev => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, []);

  // 하이라이트 초기화
  const clearHighlights = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeHighlights: [],
    }));
  }, []);

  // 컨텍스트 업데이트
  const updateContext = useCallback((updates: Partial<ProcessPlanChatContext>) => {
    setContext(prev => ({ ...prev, ...updates }));
  }, []);

  // 컨텍스트 스냅샷 설정
  const setContextSnapshot = useCallback((snapshot: ChatContextSnapshot) => {
    setContextSnapshotState(snapshot);
  }, []);

  return {
    // 상태
    isOpen: state.isOpen,
    isLoading: state.isLoading,
    messages: state.messages,
    error: state.error,
    retryCount: state.retryCount,
    activeHighlights: state.activeHighlights,

    // 액션
    open,
    close,
    toggle,
    sendMessage,
    clearMessages,
    cancelRequest,
    clearHighlights,

    // 컨텍스트
    updateContext,
    setContextSnapshot,
  };
}

export default useProcessPlanChatbot;
