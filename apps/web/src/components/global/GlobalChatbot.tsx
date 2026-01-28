'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Bot,
  ChevronDown,
  Send,
  Loader2,
  MessageSquare,
  Square,
  AlertTriangle,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { Button, Textarea } from '@/components/ui';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { usePageContext, getPageTypeLabel } from '@/lib/hooks/usePageContext';
import { getPageChatbotConfig, getDynamicQuickQuestions, type TabContext } from '@/lib/data/global-chatbot-config';
import { sendGlobalChat } from '@/lib/services/global-chatbot';
import {
  useTabContextStore,
  selectBuildingContext,
  selectProcessPlanContext,
} from '@/lib/stores/useTabContextStore';
import type { GlobalChatMessage, ChatbotError } from '@/lib/services/global-chatbot';
import { GlobalQuickQuestions } from './GlobalQuickQuestions';
import { useResizableSidebar } from '@/lib/hooks';

/**
 * 전역 챗봇 컴포넌트
 * URL pathname을 분석하여 페이지별 맞춤 컨텍스트 제공
 */
export function GlobalChatbot() {
  const pageContext = usePageContext();
  const config = getPageChatbotConfig(pageContext.pageType);

  // Zustand 스토어에서 탭 컨텍스트 구독
  const buildingContext = useTabContextStore(selectBuildingContext);
  const processPlanContext = useTabContextStore(selectProcessPlanContext);

  // 탭 컨텍스트를 기반으로 동적 빠른 질문 생성
  const tabContext: TabContext | null = useMemo(() => {
    // 공정계획 페이지가 아니면 null 반환
    if (pageContext.pageType !== 'building-process-plan') {
      return null;
    }

    if (!buildingContext && !processPlanContext) {
      return null;
    }

    return {
      buildingName: buildingContext?.buildingName,
      currentStep: processPlanContext?.currentStep,
      hasErrors: processPlanContext?.hasErrors,
      totalDays: processPlanContext?.totalDays,
      completionRate: processPlanContext?.completionRate,
    };
  }, [pageContext.pageType, buildingContext, processPlanContext]);

  // 동적 빠른 질문 목록
  const quickQuestions = useMemo(() => {
    return getDynamicQuickQuestions(tabContext, config.quickQuestions, 4);
  }, [tabContext, config.quickQuestions]);

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [messages, setMessages] = useState<GlobalChatMessage[]>([]);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<ChatbotError | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 리사이즈 기능
  const { dimensions, isResizing, resizeDirection, startResize, resetToDefault } =
    useResizableSidebar({
      storageKey: 'global-chatbot-dimensions',
      defaultDimensions: { width: 400, height: 550 },
    });

  // 메시지 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSearching]);

  // Textarea 자동 리사이즈
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [query]);

  // 질문 전송
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim() || isSearching) return;

      const userMessage: GlobalChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: query,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage]);
      setQuery('');
      setIsSearching(true);
      setLastError(null);
      setRetryCount(0);

      // 이전 요청 취소
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const history = messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

        const response = await sendGlobalChat(
          {
            query: userMessage.content,
            pageType: pageContext.pageType,
            pageContext: {
              projectId: pageContext.projectId,
              buildingId: pageContext.buildingId,
              postId: pageContext.postId,
              pathname: pageContext.pathname,
            },
            tabContext: buildingContext && processPlanContext ? {
              buildingName: buildingContext.buildingName,
              totalUnits: buildingContext.totalUnits,
              coreCount: buildingContext.coreCount,
              floorCount: buildingContext.floorCount,
              currentStep: processPlanContext.currentStep,
              totalDays: processPlanContext.totalDays,
              hasErrors: processPlanContext.hasErrors,
              errorMessages: processPlanContext.errorMessages,
              selectedTypes: processPlanContext.selectedTypes,
              calculatedDays: processPlanContext.calculatedDays,
              completionRate: processPlanContext.completionRate,
            } : undefined,
            history,
          },
          {
            signal: abortController.signal,
            onRetry: (attempt, error) => {
              setRetryCount(attempt);
              setLastError(error);
            },
          }
        );

        if (abortController.signal.aborted) return;

        if (response.success && response.answer) {
          const aiMessage: GlobalChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: response.answer,
            timestamp: new Date(),
          };

          setMessages(prev => [...prev, aiMessage]);
          setLastError(null);
        } else {
          const errorMessage: GlobalChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: getErrorMessage(response.error),
            timestamp: new Date(),
            error: response.error,
          };
          setMessages(prev => [...prev, errorMessage]);
          setLastError(response.error || null);
        }
      } catch (error) {
        if (abortController.signal.aborted) return;

        const errorMessage: GlobalChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: `네트워크 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsSearching(false);
        setRetryCount(0);
        abortControllerRef.current = null;
      }
    },
    [query, isSearching, messages, pageContext, buildingContext, processPlanContext]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // 중지 핸들러
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsSearching(false);
      setRetryCount(0);
    }
  }, []);

  // 대화 초기화
  const handleClearMessages = useCallback(() => {
    setMessages([]);
    setLastError(null);
    setRetryCount(0);
  }, []);

  // 빠른 질문 클릭
  const handleQuickQuestion = useCallback((question: string) => {
    setQuery(question);
    setTimeout(() => {
      const form = document.querySelector('form[data-global-chatbot-form]');
      if (form) {
        (form as HTMLFormElement).requestSubmit();
      }
    }, 100);
  }, []);

  // 접힌 상태
  if (isCollapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <Button
          onClick={() => setIsCollapsed(false)}
          className="rounded-full w-14 h-14 shadow-lg bg-cyan-600 hover:bg-cyan-700 text-white"
          size="icon"
          title={config.title}
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-40 bg-white dark:bg-zinc-900 rounded-lg shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col"
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      {/* 리사이즈 중 전역 커서 오버레이 */}
      {isResizing && (
        <div
          className="fixed inset-0 z-50"
          style={{
            cursor:
              resizeDirection === 'top'
                ? 'ns-resize'
                : resizeDirection === 'left'
                  ? 'ew-resize'
                  : 'nwse-resize',
          }}
        />
      )}

      {/* 상단 리사이즈 핸들 */}
      <div
        className="absolute top-0 left-8 right-0 h-2 cursor-ns-resize group"
        onMouseDown={startResize('top')}
        onDoubleClick={resetToDefault}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-transparent group-hover:bg-cyan-400/50 transition-colors rounded-t" />
      </div>

      {/* 좌측 리사이즈 핸들 */}
      <div
        className="absolute left-0 top-8 bottom-0 w-2 cursor-ew-resize group"
        onMouseDown={startResize('left')}
        onDoubleClick={resetToDefault}
      >
        <div className="absolute inset-y-0 left-0 w-1 bg-transparent group-hover:bg-cyan-400/50 transition-colors rounded-l" />
      </div>

      {/* 코너 리사이즈 핸들 (좌상단) */}
      <div
        className="absolute top-0 left-0 w-8 h-8 cursor-nwse-resize group z-10"
        onMouseDown={startResize('top-left')}
        onDoubleClick={resetToDefault}
      >
        <div className="absolute top-1 left-1 w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3 h-3 text-cyan-500 rotate-45" />
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          <div className="flex flex-col">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
              {config.title}
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {buildingContext?.buildingName
                ? `${buildingContext.buildingName} - ${getPageTypeLabel(pageContext.pageType)}`
                : getPageTypeLabel(pageContext.pageType)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearMessages}
              className="h-8 w-8"
              title="대화 초기화"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="h-8 w-8"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-700">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center text-center text-zinc-500 dark:text-zinc-400">
              <Bot className="w-12 h-12 mb-4 text-cyan-600 dark:text-cyan-400" />
              <h4 className="text-lg font-semibold mb-2 text-zinc-800 dark:text-zinc-100">
                {config.welcomeMessage}
              </h4>
              <p className="text-sm mb-4">{config.description}</p>
            </div>
            <GlobalQuickQuestions
              questions={quickQuestions}
              onQuestionClick={handleQuickQuestion}
            />
          </div>
        ) : (
          messages.map(message => <MessageBubble key={message.id} message={message} />)
        )}

        {/* 로딩 상태 */}
        {isSearching && (
          <div className="flex flex-col gap-2 text-zinc-500 dark:text-zinc-400">
            <div className="flex gap-2 items-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">
                {retryCount > 0 ? `재시도 중 (${retryCount}/3)...` : '답변을 생성하고 있습니다...'}
              </span>
            </div>
            {lastError && lastError.retryable && (
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3 h-3" />
                <span>{lastError.message}</span>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <form onSubmit={handleSubmit} className="flex gap-2" data-global-chatbot-form>
          <Textarea
            ref={textareaRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="질문을 입력하세요..."
            className="flex-1 min-h-[40px] max-h-[200px] resize-none"
            disabled={isSearching}
            rows={1}
          />
          {isSearching ? (
            <Button
              type="button"
              onClick={handleStop}
              size="icon"
              className="rounded-full w-8 h-8 p-0 flex items-center justify-center transition-all bg-red-600 hover:bg-red-700 text-white"
              title="답변 생성 정지"
            >
              <Square className="w-3 h-3 fill-white" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!query.trim()}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}

/**
 * 에러 메시지 생성
 */
function getErrorMessage(error?: ChatbotError): string {
  if (!error) return '알 수 없는 오류가 발생했습니다.';

  switch (error.type) {
    case 'NETWORK_ERROR':
      return '네트워크 연결을 확인해주세요.';
    case 'API_RATE_LIMIT':
      return 'API 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.';
    case 'API_OVERLOADED':
      return '서버가 과부하 상태입니다. 잠시 후 다시 시도해주세요.';
    case 'TIMEOUT':
      return '요청 시간이 초과되었습니다. 다시 시도해주세요.';
    case 'CONTEXT_TOO_LARGE':
      return '대화 내용이 너무 깁니다. 새 대화를 시작해주세요.';
    default:
      return error.message;
  }
}

/**
 * 메시지 버블 컴포넌트
 */
function MessageBubble({ message }: { message: GlobalChatMessage }) {
  const isUser = message.role === 'user';
  const hasError = !!message.error;

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser
            ? 'bg-zinc-200 dark:bg-zinc-700'
            : hasError
              ? 'bg-red-100 dark:bg-red-900/30'
              : 'bg-cyan-100 dark:bg-cyan-900/30'
        }`}
      >
        {isUser ? (
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">U</span>
        ) : hasError ? (
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
        ) : (
          <Bot className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
        )}
      </div>

      <div
        className={`flex-1 max-w-[80%] ${
          isUser
            ? 'bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-lg rounded-tr-sm'
            : hasError
              ? 'bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800'
              : 'text-zinc-800 dark:text-zinc-100'
        }`}
      >
        {isUser ? (
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                code: ({ children }) => (
                  <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs">
                    {children}
                  </code>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-cyan-700 dark:text-cyan-400">
                    {children}
                  </strong>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
