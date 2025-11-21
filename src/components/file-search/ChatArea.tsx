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
}

export default function ChatArea({
  messages,
  selectedStore,
  selectedStoreInfo,
  isSearching,
  sidebarOpen,
  onToggleSidebar,
  onSearch,
}: ChatAreaProps) {
  const [query, setQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !selectedStore) return;
    onSearch(query);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col transition-all duration-300 ${
        sidebarOpen ? 'lg:ml-80' : 'lg:ml-0'
      } w-full`}
    >
      {/* Header */}
      <header className="h-20 bg-white border-b border-slate-200 p-4 flex items-center gap-4 z-10">
        <Button variant="ghost" size="sm" onClick={onToggleSidebar}>
          <Menu className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-bold text-xl text-slate-800 flex items-center gap-2">
            <Bot className="w-6 h-6 text-cyan-600" />
            AI 문서 챗봇
          </h1>
          <p className="text-xs text-slate-500">
            {selectedStore
              ? `현재 스토어: ${selectedStoreInfo?.displayName || selectedStore}`
              : '스토어를 선택하여 대화를 시작하세요'}
          </p>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
        {messages.length === 0 ? (
          <EmptyState selectedStore={selectedStore} />
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}

        {isSearching && <LoadingBubble />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-cyan-500/20 focus-within:border-cyan-500 transition-all">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedStore
                  ? '메시지를 입력하세요...'
                  : '스토어를 먼저 선택해주세요'
              }
              className="flex-1 min-h-[44px] max-h-32 bg-transparent border-none focus:ring-0 resize-none py-2.5 px-3 text-sm"
              disabled={!selectedStore || isSearching}
              rows={1}
            />
            <Button
              type="submit"
              disabled={!selectedStore || !query.trim() || isSearching}
              size="sm"
              className={`mb-1 rounded-lg transition-all ${
                query.trim()
                  ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                  : 'bg-slate-200 text-slate-400'
              }`}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-center mt-2">
            <p className="text-[10px] text-slate-400">
              Gemini는 실수를 할 수 있습니다. 중요한 정보는 확인이 필요합니다.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * 빈 상태 컴포넌트 (메모이제이션 적용)
 */
const EmptyState = memo(function EmptyState({
  selectedStore,
}: {
  selectedStore: string;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
      <MessageSquare className="w-16 h-16 opacity-20" />
      <p className="text-lg font-medium">문서에 대해 무엇이든 물어보세요</p>
      {!selectedStore && (
        <p className="text-sm text-orange-500 bg-orange-50 px-4 py-2 rounded-full">
          👈 왼쪽 사이드바에서 스토어를 먼저 선택해주세요
        </p>
      )}
    </div>
  );
});

/**
 * 메시지 버블 컴포넌트 (메모이제이션 적용)
 */
const MessageBubble = memo(function MessageBubble({
  message,
}: {
  message: Message;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-cyan-600" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
          isUser
            ? 'bg-slate-800 text-white rounded-tr-none'
            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
        }`}
      >
        <div className="text-sm leading-relaxed">
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                // 기본 링크 스타일
                a: ({node, ...props}) => (
                  <a target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all" {...props} />
                ),
                // 테이블 스타일 강화
                table: ({node, ...props}) => (
                  <div className="overflow-x-auto my-4 rounded-lg border border-slate-200">
                    <table className="w-full text-sm text-left text-slate-700" {...props} />
                  </div>
                ),
                thead: ({node, ...props}) => (
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50" {...props} />
                ),
                tbody: ({node, ...props}) => (
                  <tbody className="divide-y divide-slate-100" {...props} />
                ),
                th: ({node, ...props}) => (
                  <th className="px-4 py-3 font-semibold whitespace-nowrap" {...props} />
                ),
                td: ({node, ...props}) => (
                  <td className="px-4 py-3" {...props} />
                ),
                tr: ({node, ...props}) => (
                  <tr className="bg-white hover:bg-slate-50 transition-colors" {...props} />
                ),
                // 리스트 스타일
                ul: ({node, ...props}) => (
                  <ul className="list-disc list-outside ml-5 space-y-1 my-3" {...props} />
                ),
                ol: ({node, ...props}) => (
                  <ol className="list-decimal list-outside ml-5 space-y-1 my-3" {...props} />
                ),
                li: ({node, ...props}) => (
                  <li className="pl-1" {...props} />
                ),
                // 인용구 스타일
                blockquote: ({node, ...props}) => (
                  <blockquote className="border-l-4 border-slate-300 pl-4 italic text-slate-600 my-4 bg-slate-50 py-2 pr-2 rounded-r" {...props} />
                ),
                // 헤딩 스타일
                h1: ({node, ...props}) => <h1 className="text-xl font-bold mt-6 mb-4 text-slate-900" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-lg font-bold mt-5 mb-3 text-slate-900 border-b pb-2 border-slate-100" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-base font-bold mt-4 mb-2 text-slate-800" {...props} />,
                // 코드 블록 스타일
                code: ({node, className, children, ...props}: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match && !String(children).includes('\n');
                  
                  return isInline ? (
                    <code className="bg-slate-100 text-red-500 rounded px-1.5 py-0.5 font-mono text-xs font-medium border border-slate-200" {...props}>
                      {children}
                    </code>
                  ) : (
                    <div className="relative my-4 rounded-lg overflow-hidden bg-slate-900 shadow-md">
                      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-slate-400 text-xs">
                        <span>Code</span>
                      </div>
                      <pre className="p-4 overflow-x-auto bg-slate-900 text-slate-50 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        <code className="font-mono text-xs leading-relaxed" {...props}>
                          {children}
                        </code>
                      </pre>
                    </div>
                  );
                },
                // 문단 간격
                p: ({node, ...props}) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
                // 구분선
                hr: ({node, ...props}) => <hr className="my-6 border-slate-200" {...props} />,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100/20">
            <p className="text-xs font-semibold mb-1 opacity-70 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> 참고 문서
            </p>
            <div className="flex flex-wrap gap-2">
              {message.citations.map((cit, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-black/5 px-2 py-1 rounded hover:bg-black/10 cursor-help"
                  title={`위치: ${cit.startIndex}-${cit.endIndex}`}
                >
                  {cit.uri ? (
                    <a
                      href={cit.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline text-blue-500"
                    >
                      출처 {idx + 1}
                    </a>
                  ) : (
                    `출처 ${idx + 1}`
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-slate-600" />
        </div>
      )}
    </div>
  );
});

/**
 * 로딩 버블 컴포넌트 (메모이제이션 적용)
 */
const LoadingBubble = memo(function LoadingBubble() {
  return (
    <div className="flex gap-4 justify-start">
      <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center shrink-0">
        <Bot className="w-5 h-5 text-cyan-600" />
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
        <span className="text-sm text-slate-500">
          답변을 생성하고 있습니다...
        </span>
      </div>
    </div>
  );
});