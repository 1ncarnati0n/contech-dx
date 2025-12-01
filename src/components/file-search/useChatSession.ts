'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '@/lib/constants';
import type { Message, ChatSession } from './types';

interface UseChatSessionOptions {
  selectedStore: string;
  onStoreChange?: (storeName: string) => Promise<void>;
}

// LocalStorage에서 메시지 파싱 시 타입 정의
interface StoredMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  citations?: Message['citations'];
  timestamp: string;
}

/**
 * 채팅 세션 관리 훅
 * 채팅 메시지, 세션 관리 로직을 담당합니다.
 */
export function useChatSession({ selectedStore, onStoreChange }: UseChatSessionOptions) {
  // 채팅 상태
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 세션 상태 (LocalStorage)
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // 초기 로드
  useEffect(() => {
    loadAllSessions();
  }, []);

  // 전체 세션 목록 로드
  const loadAllSessions = useCallback(() => {
    const savedSessions = localStorage.getItem('chat_sessions_all');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        parsed.sort((a: ChatSession, b: ChatSession) => b.updatedAt - a.updatedAt);
        setSessions(parsed);
      } catch (e) {
        console.error('Failed to parse sessions', e);
        setSessions([]);
      }
    }
  }, []);

  // 메시지 로드 (세션 선택 시)
  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      return;
    }

    const savedMessages = localStorage.getItem(`chat_messages_${currentSessionId}`);
    if (savedMessages) {
      try {
        const parsed: Message[] = JSON.parse(savedMessages).map((m: StoredMessage) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setMessages(parsed);
      } catch (e) {
        console.error('Failed to parse messages', e);
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  // 세션 선택 (스토어 자동 전환 포함)
  const selectSession = useCallback(async (sessionId: string) => {
    const sessionToSelect = sessions.find(s => s.id === sessionId);
    if (!sessionToSelect) return;

    if (sessionToSelect.storeName !== selectedStore && onStoreChange) {
      await onStoreChange(sessionToSelect.storeName);
    }

    setCurrentSessionId(sessionId);
  }, [sessions, selectedStore, onStoreChange]);

  // 새 세션 생성
  const createSession = useCallback(() => {
    if (!selectedStore) return;
    setCurrentSessionId(null);
    setMessages([]);
  }, [selectedStore]);

  // 세션 삭제
  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const newSessions = prev.filter(s => s.id !== sessionId);
      localStorage.setItem('chat_sessions_all', JSON.stringify(newSessions));
      return newSessions;
    });
    localStorage.removeItem(`chat_messages_${sessionId}`);

    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }
  }, [currentSessionId]);

  // 스토어 삭제 시 관련 세션 정리
  const clearSessionsByStore = useCallback((storeName: string) => {
    setSessions(prev => {
      const sessionsToDelete = prev.filter(s => s.storeName === storeName);
      sessionsToDelete.forEach(s => localStorage.removeItem(`chat_messages_${s.id}`));

      const newSessions = prev.filter(s => s.storeName !== storeName);
      localStorage.setItem('chat_sessions_all', JSON.stringify(newSessions));
      return newSessions;
    });
    setMessages([]);
  }, []);

  // 검색 (채팅)
  const search = useCallback(
    async (query: string) => {
      if (!query.trim() || !selectedStore) return;

      let sessionId = currentSessionId;
      let isNewSession = false;

      // 세션이 없으면 자동 생성
      if (!sessionId) {
        sessionId = Date.now().toString();
        isNewSession = true;
        setCurrentSessionId(sessionId);
      }

      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: query,
        timestamp: new Date(),
      };

      const msgsWithUser = [...messages, userMsg];
      setMessages(msgsWithUser);
      localStorage.setItem(`chat_messages_${sessionId}`, JSON.stringify(msgsWithUser));

      setIsSearching(true);

      try {
        const response = await fetch(API_ENDPOINTS.GEMINI_SEARCH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, storeName: selectedStore }),
        });
        const data = await response.json();

        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: data.success
            ? data.answer
            : `오류가 발생했습니다: ${data.error || '알 수 없는 오류'}`,
          citations: data.success ? data.citations : undefined,
          timestamp: new Date(),
        };

        const finalMessages = [...msgsWithUser, aiMsg];
        setMessages(finalMessages);
        localStorage.setItem(`chat_messages_${sessionId}`, JSON.stringify(finalMessages));

        // 세션 목록 업데이트
        setSessions(prev => {
          const sessionIndex = prev.findIndex(s => s.id === sessionId);
          const newTitle = isNewSession
            ? (query.length > 20 ? query.substring(0, 20) + '...' : query)
            : (prev[sessionIndex]?.title || query.substring(0, 20));
          const newPreview = aiMsg.content.substring(0, 50) + (aiMsg.content.length > 50 ? '...' : '');

          const newSession: ChatSession = {
            id: sessionId!,
            storeName: selectedStore,
            title: newTitle,
            preview: newPreview,
            updatedAt: Date.now(),
          };

          let newSessions;
          if (sessionIndex >= 0) {
            newSessions = [...prev];
            newSessions[sessionIndex] = newSession;
            newSessions.sort((a, b) => b.updatedAt - a.updatedAt);
          } else {
            newSessions = [newSession, ...prev];
          }

          localStorage.setItem('chat_sessions_all', JSON.stringify(newSessions));
          return newSessions;
        });

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류';
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: `네트워크 오류가 발생했습니다: ${message}`,
          timestamp: new Date(),
        };

        const errorMessages = [...msgsWithUser, errorMsg];
        setMessages(errorMessages);
        localStorage.setItem(`chat_messages_${sessionId}`, JSON.stringify(errorMessages));
      } finally {
        setIsSearching(false);
      }
    },
    [selectedStore, currentSessionId, messages]
  );

  return {
    // 상태
    messages,
    isSearching,
    sessions,
    currentSessionId,
    // 액션
    search,
    selectSession,
    createSession,
    deleteSession,
    clearSessionsByStore,
    loadAllSessions,
  };
}

export type ChatSessionState = ReturnType<typeof useChatSession>;

