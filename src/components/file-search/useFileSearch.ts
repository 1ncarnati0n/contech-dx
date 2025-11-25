'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FileSearchStore, UploadedFile, Message, ChatSession } from './types';
import { filterValidFiles } from './utils';

/**
 * File Search 기능을 위한 커스텀 훅
 */
export function useFileSearch() {
  // Store 상태
  const [stores, setStores] = useState<FileSearchStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedStoreInfo, setSelectedStoreInfo] = useState<FileSearchStore | null>(null);

  // 파일 상태
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // 채팅 상태
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 세션 상태 (LocalStorage)
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // UI 상태
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 초기 로드
  useEffect(() => {
    loadStores();
    loadAllSessions();
  }, []);

  // 전체 세션 목록 로드
  const loadAllSessions = () => {
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
  };

  // 스토어 변경 시 현재 세션 정리
  useEffect(() => {
    if (!selectedStore) {
      // 스토어 선택 해제 시 세션도 닫기
      // 단, 초기 로드 시에는 실행되지 않도록 주의해야 함 (selectedStore가 ''일 때)
      // 하지만 여기서는 단순하게 처리
      // setCurrentSessionId(null); // 이 줄을 제거하면 스토어가 바뀌어도 이전 채팅 내용이 남아있을 수 있음.
      // 하지만 스토어를 바꿨는데 이전 스토어의 채팅이 보이는건 이상함.
      // 따라서 스토어 변경 -> 현재 세션이 해당 스토어 소속이 아니면 닫기 로직이 필요.
      return;
    }

    // 현재 열려있는 세션이 있고, 그 세션이 선택된 스토어와 다르면 닫기
    if (currentSessionId) {
      // sessions 상태를 여기서 참조하면 의존성 배열 문제 발생 가능.
      // 하지만 sessions는 자주 바뀌지 않으므로 괜찮을 수 있음.
      const currentSession = sessions.find(s => s.id === currentSessionId);
      if (currentSession && currentSession.storeName !== selectedStore) {
        // setCurrentSessionId(null); 
        // setMessages([]);
        // *주의*: selectSession 함수 내에서 selectStore -> setCurrentSessionId 순서로 호출하는데,
        // 여기서 초기화해버리면 race condition 발생 가능.
        // 따라서 여기서는 아무것도 하지 않는 것이 안전할 수 있음. 
        // 사용자가 명시적으로 스토어를 바꾼 경우(드롭다운)와 selectSession으로 바꾼 경우를 구분하기 어려움.
      }
    }
  }, [selectedStore]); // sessions, currentSessionId 제외

  // 메시지 로드 (세션 선택 시)
  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      return;
    }

    const savedMessages = localStorage.getItem(`chat_messages_${currentSessionId}`);
    if (savedMessages) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed = JSON.parse(savedMessages).map((m: any) => ({
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

  // 스토어 목록 로드
  const loadStores = useCallback(async () => {
    try {
      const response = await fetch('/api/gemini/list-stores');
      const data = await response.json();
      if (data.success) {
        setStores(data.stores);
      }
    } catch (err) {
      console.error('Error loading stores:', err);
    }
  }, []);

  // 스토어 상세 정보 로드
  const loadStoreInfo = useCallback(async (storeName: string) => {
    try {
      const [storeResponse, filesResponse] = await Promise.all([
        fetch('/api/gemini/get-store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeName }),
        }),
        fetch('/api/gemini/list-files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeName }),
        }),
      ]);

      const [storeData, filesData] = await Promise.all([
        storeResponse.json(),
        filesResponse.json(),
      ]);

      if (storeData.success) setSelectedStoreInfo(storeData.store);
      if (filesData.success) setUploadedFiles(filesData.documents || []);
    } catch (err) {
      console.error('Error loading store info:', err);
    }
  }, []);

  // 스토어 선택
  const selectStore = useCallback(
    async (storeName: string) => {
      setSelectedStore(storeName);
      setAttachedFiles([]);

      // 스토어 변경 시 기본적으로 채팅 화면 비우기 (새 채팅 대기)
      // 단, selectSession에 의해 호출된 경우는 예외 처리 필요하지만,
      // selectSession에서 setCurrentSessionId를 나중에 호출하므로 괜찮음.
      // setCurrentSessionId(null); // 이걸 하면 selectSession이 동작 안 할 수 있음. 
      // -> useEffect [currentSessionId] 가 실행되면서 메시지를 로드하는데, 
      // 여기서 null로 만들면 메시지가 로드되다가 지워짐.
      // 따라서 selectStore에서는 세션 ID를 건드리지 않아야 함.

      if (storeName) {
        await loadStoreInfo(storeName);
      } else {
        setSelectedStoreInfo(null);
        setUploadedFiles([]);
      }
    },
    [loadStoreInfo]
  );

  // 스토어 생성
  const createStore = useCallback(
    async (displayName: string): Promise<boolean> => {
      if (!displayName.trim()) return false;

      setLoading(true);
      setError('');
      setSuccess('');

      try {
        const response = await fetch('/api/gemini/create-store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName }),
        });
        const data = await response.json();

        if (data.success) {
          setSuccess('스토어가 생성되었습니다.');
          await loadStores();
          await selectStore(data.store.name);
          return true;
        } else {
          setError(data.error || '스토어 생성 실패');
          return false;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadStores, selectStore]
  );

  // 스토어 삭제
  const deleteStore = useCallback(async () => {
    if (!selectedStore) return;

    setLoading(true);
    try {
      const response = await fetch('/api/gemini/delete-store', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeName: selectedStore, force: true }),
      });
      const data = await response.json();

      if (data.success) {
        setSuccess('스토어가 삭제되었습니다.');

        // 관련 세션 데이터도 삭제
        setSessions(prev => {
          const sessionsToDelete = prev.filter(s => s.storeName === selectedStore);
          sessionsToDelete.forEach(s => localStorage.removeItem(`chat_messages_${s.id}`));

          const newSessions = prev.filter(s => s.storeName !== selectedStore);
          localStorage.setItem('chat_sessions_all', JSON.stringify(newSessions));
          return newSessions;
        });

        setSelectedStore('');
        setSelectedStoreInfo(null);
        setUploadedFiles([]);
        setMessages([]);
        await loadStores();
        return true;
      } else {
        setError(data.error);
        return false;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedStore, loadStores]);

  // 파일 첨부
  const attachFiles = useCallback((files: File[]) => {
    const validFiles = filterValidFiles(files);
    setAttachedFiles((prev) => [...prev, ...validFiles]);
  }, []);

  // 첨부 파일 제거
  const removeAttachedFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 첨부 파일 전체 제거
  const clearAttachedFiles = useCallback(() => {
    setAttachedFiles([]);
  }, []);

  // 파일 업로드
  const uploadFiles = useCallback(async () => {
    if (attachedFiles.length === 0 || !selectedStore) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('storeName', selectedStore);
      attachedFiles.forEach((file, index) => {
        formData.append(`file${index}`, file);
      });

      const response = await fetch('/api/gemini/upload-file', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        setSuccess(`${attachedFiles.length}개 파일 업로드 완료`);
        setAttachedFiles([]);
        await loadStoreInfo(selectedStore);
        return true;
      } else {
        setError(data.error || '업로드 실패');
        return false;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [attachedFiles, selectedStore, loadStoreInfo]);

  // 세션 선택 (스토어 자동 전환 포함)
  const selectSession = useCallback(async (sessionId: string) => {
    const sessionToSelect = sessions.find(s => s.id === sessionId);
    if (!sessionToSelect) return;

    if (sessionToSelect.storeName !== selectedStore) {
      await selectStore(sessionToSelect.storeName);
    }

    setCurrentSessionId(sessionId);
  }, [sessions, selectedStore, selectStore]);

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
        const response = await fetch('/api/gemini/search', {
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

  // 알림 제거
  const clearNotification = useCallback(() => {
    setError('');
    setSuccess('');
  }, []);

  return {
    stores,
    selectedStore,
    selectedStoreInfo,
    attachedFiles,
    uploadedFiles,
    messages,
    isSearching,
    sessions,
    currentSessionId,
    loading,
    error,
    success,
    selectStore,
    createStore,
    deleteStore,
    attachFiles,
    removeAttachedFile,
    clearAttachedFiles,
    uploadFiles,
    search,
    selectSession,
    createSession,
    deleteSession,
    clearNotification,
  };
}