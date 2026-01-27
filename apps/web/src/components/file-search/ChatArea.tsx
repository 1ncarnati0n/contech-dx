'use client';

import { useRef, useEffect, useState, memo } from 'react';
import {
  Send,
  Menu,
  Bot,
  User,
  ExternalLink,
  Loader2,
  Sparkles,
  Paperclip,
  Square,
  FileSearch
} from 'lucide-react';
import { Button, Textarea } from '@/components/ui';
import type { Message, FileSearchStore } from './types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatAreaProps {
  messages: Message[];
  selectedStore: string;
  selectedStoreInfo: FileSearchStore | null;
  isSearching: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onSearch: (query: string) => void;
  onStopSearch?: () => void;
}

export default function ChatArea({
  messages,
  selectedStore,
  selectedStoreInfo,
  isSearching,
  sidebarOpen,
  onToggleSidebar,
  onSearch,
  onStopSearch,
}: ChatAreaProps) {
  const [query, setQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSearching]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !selectedStore) return;
    onSearch(query);
    setQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col h-full transition-all duration-300 bg-white dark:bg-slate-950 ${sidebarOpen ? 'lg:ml-80' : 'lg:ml-0'
        }`}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {!sidebarOpen && (
            <Button variant="ghost" size="sm" onClick={onToggleSidebar} className="text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Menu className="w-5 h-5" />
            </Button>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200">
            <Bot className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>{selectedStoreInfo?.displayName || '문서함 미선택'}</span>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
        <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-8">
          {messages.length === 0 ? (
            <EmptyState selectedStore={selectedStore} />
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
          )}

          {isSearching && <LoadingBubble />}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-gradient-to-t from-white via-white to-transparent dark:from-slate-950 dark:via-slate-950 pb-8">
        <div className="max-w-3xl mx-auto w-full">
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative flex flex-col gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-lg focus-within:ring-2 focus-within:ring-cyan-500/20 focus-within:border-cyan-500 transition-all">
              <Textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedStore
                    ? '무엇이든 물어보세요...'
                    : '먼저 문서함을 선택해주세요'
                }
                className="w-full min-h-[24px] max-h-[200px] bg-transparent border-none focus:ring-0 resize-none p-0 text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                disabled={!selectedStore || isSearching}
                rows={1}
              />

              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2 h-auto rounded-full"
                    disabled
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                </div>
                {isSearching && onStopSearch ? (
                  <Button
                    type="button"
                    onClick={onStopSearch}
                    size="sm"
                    className="rounded-full w-9 h-9 p-0 flex items-center justify-center transition-all bg-red-600 hover:bg-red-700 text-white shadow-sm"
                    title="답변 생성 정지"
                  >
                    <Square className="w-3 h-3 fill-white" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={!selectedStore || !query.trim() || isSearching}
                    size="sm"
                    className={`rounded-full w-9 h-9 p-0 flex items-center justify-center transition-all shadow-sm ${query.trim()
                        ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                      }`}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="text-center mt-3">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                AI는 실수를 할 수 있습니다. 중요한 정보는 확인이 필요합니다.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * 빈 상태 컴포넌트
 */
const EmptyState = memo(function EmptyState({
  selectedStore,
}: {
  selectedStore: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/20">
        <FileSearch className="w-10 h-10 text-white" />
      </div>
      <div className="space-y-3 max-w-md">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
          AI 문서 분석
        </h2>
        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
          업로드한 문서를 기반으로 AI가 정확한 답변을 제공합니다.
          <br />
          질문을 입력하면 관련 정보를 찾아드립니다.
        </p>
      </div>
      {!selectedStore && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm rounded-full border border-amber-200 dark:border-amber-800">
          <span className="text-base">👈</span>
          <span>왼쪽 사이드바에서 문서함을 선택해주세요</span>
        </div>
      )}
      {selectedStore && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full mt-4">
          {[
            '이 문서의 핵심 내용을 요약해주세요',
            '주요 결론이나 시사점은 무엇인가요?',
          ].map((suggestion, idx) => (
            <button
              key={idx}
              className="text-left p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * 메시지 버블 컴포넌트
 */
const MessageBubble = memo(function MessageBubble({
  message,
}: {
  message: Message;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`group flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${isUser
          ? 'bg-slate-200 dark:bg-slate-700'
          : 'bg-gradient-to-br from-cyan-500 to-blue-600'
        }`}>
        {isUser ? (
          <User className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[85%] space-y-2 ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`inline-block text-sm leading-relaxed ${isUser
            ? 'bg-slate-100 dark:bg-slate-800 px-5 py-3 rounded-2xl rounded-tr-md text-slate-800 dark:text-slate-100'
            : 'text-slate-800 dark:text-slate-100 px-1'
          }`}>
          {isUser ? (
            <div className="whitespace-pre-wrap text-left">{message.content}</div>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ node: _node, ...props }) => (
                  <a target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-400 hover:underline break-all" {...props} />
                ),
                table: ({ node: _node, ...props }) => (
                  <div className="overflow-x-auto my-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300" {...props} />
                  </div>
                ),
                thead: ({ node: _node, ...props }) => (
                  <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-800/50" {...props} />
                ),
                tbody: ({ node: _node, ...props }) => (
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800" {...props} />
                ),
                th: ({ node: _node, ...props }) => (
                  <th className="px-4 py-3 font-semibold whitespace-nowrap" {...props} />
                ),
                td: ({ node: _node, ...props }) => (
                  <td className="px-4 py-3" {...props} />
                ),
                tr: ({ node: _node, ...props }) => (
                  <tr className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" {...props} />
                ),
                ul: ({ node: _node, ...props }) => (
                  <ul className="list-disc list-outside ml-5 space-y-1 my-3" {...props} />
                ),
                ol: ({ node: _node, ...props }) => (
                  <ol className="list-decimal list-outside ml-5 space-y-1 my-3" {...props} />
                ),
                li: ({ node: _node, ...props }) => (
                  <li className="pl-1" {...props} />
                ),
                blockquote: ({ node: _node, ...props }) => (
                  <blockquote className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-600 dark:text-slate-400 my-4" {...props} />
                ),
                h1: ({ node: _node, ...props }) => <h1 className="text-xl font-bold mt-6 mb-4 text-slate-900 dark:text-white" {...props} />,
                h2: ({ node: _node, ...props }) => <h2 className="text-lg font-bold mt-5 mb-3 text-slate-900 dark:text-white" {...props} />,
                h3: ({ node: _node, ...props }) => <h3 className="text-base font-bold mt-4 mb-2 text-slate-800 dark:text-slate-200" {...props} />,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                code: ({ node: _node, className, children, ...props }: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match && !String(children).includes('\n');

                  return isInline ? (
                    <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-400 rounded px-1.5 py-0.5 font-mono text-xs font-medium border border-slate-200 dark:border-slate-700" {...props}>
                      {children}
                    </code>
                  ) : (
                    <div className="relative my-4 rounded-xl overflow-hidden bg-slate-900 shadow-md">
                      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-slate-400 text-xs border-b border-slate-700">
                        <span className="font-medium">{match ? match[1] : 'Code'}</span>
                      </div>
                      <pre className="p-4 overflow-x-auto bg-slate-900 text-slate-50 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        <code className="font-mono text-xs leading-relaxed" {...props}>
                          {children}
                        </code>
                      </pre>
                    </div>
                  );
                },
                p: ({ node: _node, ...props }) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
                hr: ({ node: _node, ...props }) => <hr className="my-6 border-slate-200 dark:border-slate-700" {...props} />,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Citations */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pl-1">
            {message.citations.map((cit, idx) => (
              <a
                key={idx}
                href={cit.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all border border-slate-200 dark:border-slate-700"
                title={`위치: ${cit.startIndex}-${cit.endIndex}`}
              >
                <ExternalLink className="w-3 h-3" />
                <span>출처 {idx + 1}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * 로딩 버블 컴포넌트
 */
const LoadingBubble = memo(function LoadingBubble() {
  return (
    <div className="flex gap-4 justify-start">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
        <Bot className="w-5 h-5 text-white" />
      </div>
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-md">
        <Loader2 className="w-4 h-4 animate-spin text-cyan-600 dark:text-cyan-400" />
        <span className="text-sm text-slate-600 dark:text-slate-400">
          답변을 생성하고 있습니다...
        </span>
      </div>
    </div>
  );
});
