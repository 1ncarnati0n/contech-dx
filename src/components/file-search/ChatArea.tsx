'use client';

import { useRef, useEffect, useState, memo } from 'react';
import {
  MessageSquare,
  Send,
  Menu,
  Bot,
  User,
  ExternalLink,
  Loader2,
  Sparkles,
  Paperclip,
  Square
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
      className={`flex-1 flex flex-col h-full transition-all duration-300 bg-white dark:bg-zinc-900 ${sidebarOpen ? 'lg:ml-80' : 'lg:ml-0'
        }`}
    >
      {/* Minimal Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {!sidebarOpen && (
            <Button variant="ghost" size="sm" onClick={onToggleSidebar} className="text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <Menu className="w-5 h-5" />
            </Button>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 text-sm font-medium text-zinc-700 dark:text-zinc-200">
            <Bot className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>{selectedStoreInfo?.displayName || '스토어 미선택'}</span>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-700">
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
      <div className="p-4 bg-gradient-to-t from-white via-white to-transparent dark:from-zinc-900 dark:via-zinc-900 pb-8">
        <div className="max-w-3xl mx-auto w-full">
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative flex flex-col gap-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-3xl p-4 shadow-lg focus-within:ring-2 focus-within:ring-cyan-500/20 focus-within:border-cyan-500 transition-all">
              <Textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedStore
                    ? '무엇이든 물어보세요...'
                    : '먼저 스토어를 선택해주세요'
                }
                className="w-full min-h-[24px] max-h-[200px] bg-transparent border-none focus:ring-0 resize-none p-0 text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                disabled={!selectedStore || isSearching}
                rows={1}
              />

              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-2">
                  {/* Future: Add file attachment button here */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-2 h-auto rounded-full"
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
                    className="rounded-full w-8 h-8 p-0 flex items-center justify-center transition-all bg-red-600 hover:bg-red-700 text-white"
                    title="답변 생성 정지"
                  >
                    <Square className="w-3 h-3 fill-white" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={!selectedStore || !query.trim() || isSearching}
                    size="sm"
                    className={`rounded-full w-8 h-8 p-0 flex items-center justify-center transition-all ${query.trim()
                        ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400'
                      }`}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="text-center mt-3">
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
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
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
        <Sparkles className="w-8 h-8 text-white" />
      </div>
      <div className="space-y-2 max-w-md">
        <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
          안녕하세요! 무엇을 도와드릴까요?
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          선택된 문서함 기반으로 AI가 답변해드립니다.
        </p>
      </div>
      {!selectedStore && (
        <div className="px-4 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-sm rounded-full border border-orange-100 dark:border-orange-900/50">
          👈 왼쪽 사이드바에서 스토어를 먼저 선택해주세요
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
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser
          ? 'bg-zinc-200 dark:bg-zinc-700'
          : 'bg-cyan-100 dark:bg-cyan-900/30'
        }`}>
        {isUser ? (
          <User className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
        ) : (
          <Bot className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[90%] space-y-2 ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`inline-block text-sm leading-relaxed ${isUser
            ? 'bg-zinc-100 dark:bg-zinc-800 px-5 py-3 rounded-2xl rounded-tr-sm text-zinc-800 dark:text-zinc-100'
            : 'text-zinc-800 dark:text-zinc-100 px-1'
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
                  <div className="overflow-x-auto my-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <table className="w-full text-sm text-left text-zinc-700 dark:text-zinc-300" {...props} />
                  </div>
                ),
                thead: ({ node: _node, ...props }) => (
                  <thead className="text-xs text-zinc-700 dark:text-zinc-300 uppercase bg-zinc-50 dark:bg-zinc-800/50" {...props} />
                ),
                tbody: ({ node: _node, ...props }) => (
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800" {...props} />
                ),
                th: ({ node: _node, ...props }) => (
                  <th className="px-4 py-3 font-semibold whitespace-nowrap" {...props} />
                ),
                td: ({ node: _node, ...props }) => (
                  <td className="px-4 py-3" {...props} />
                ),
                tr: ({ node: _node, ...props }) => (
                  <tr className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors" {...props} />
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
                  <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-600 pl-4 italic text-zinc-600 dark:text-zinc-400 my-4" {...props} />
                ),
                h1: ({ node: _node, ...props }) => <h1 className="text-xl font-bold mt-6 mb-4 text-zinc-900 dark:text-white" {...props} />,
                h2: ({ node: _node, ...props }) => <h2 className="text-lg font-bold mt-5 mb-3 text-zinc-900 dark:text-white" {...props} />,
                h3: ({ node: _node, ...props }) => <h3 className="text-base font-bold mt-4 mb-2 text-zinc-800 dark:text-zinc-200" {...props} />,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                code: ({ node: _node, className, children, ...props }: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match && !String(children).includes('\n');

                  return isInline ? (
                    <code className="bg-zinc-100 dark:bg-zinc-800 text-pink-500 dark:text-pink-400 rounded px-1.5 py-0.5 font-mono text-xs font-medium border border-zinc-200 dark:border-zinc-700" {...props}>
                      {children}
                    </code>
                  ) : (
                    <div className="relative my-4 rounded-lg overflow-hidden bg-zinc-950 shadow-md">
                      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 text-zinc-400 text-xs border-b border-zinc-800">
                        <span>Code</span>
                      </div>
                      <pre className="p-4 overflow-x-auto bg-zinc-950 text-zinc-50 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                        <code className="font-mono text-xs leading-relaxed" {...props}>
                          {children}
                        </code>
                      </pre>
                    </div>
                  );
                },
                p: ({ node: _node, ...props }) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
                hr: ({ node: _node, ...props }) => <hr className="my-6 border-zinc-200 dark:border-zinc-700" {...props} />,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Citations */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 pl-1">
            {message.citations.map((cit, idx) => (
              <a
                key={idx}
                href={cit.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors border border-zinc-200 dark:border-zinc-700"
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
    <div className="flex gap-4 justify-start animate-pulse">
      <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
        <Bot className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
      </div>
      <div className="flex items-center gap-2 px-1 py-2">
        <Loader2 className="w-4 h-4 animate-spin text-cyan-600 dark:text-cyan-400" />
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          답변을 생성하고 있습니다...
        </span>
      </div>
    </div>
  );
});