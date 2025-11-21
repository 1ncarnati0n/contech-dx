'use client';

import { useRef, useEffect, useState, memo, useCallback } from 'react';
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
      <header className="h-20 bg-white border-b border-slate-200 p-4 flex items-center gap-4 shadow-sm z-10">
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
        <div className="whitespace-pre-wrap leading-relaxed text-sm">
          {message.content}
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
