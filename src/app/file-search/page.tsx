'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FileSearch,
  FolderPlus,
  Upload,
  Search,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  File,
  Database,
  ExternalLink,
  X,
  FileType,
  MessageSquare,
  Send,
  Menu,
  ChevronLeft,
  ChevronRight,
  Bot,
  User
} from 'lucide-react';
import { Card, CardHeader, CardContent, Button, Input, Textarea } from '@/components/ui';

// --- Interfaces ---

interface FileSearchStore {
  name: string;
  displayName: string;
  createTime: string;
  activeDocumentsCount?: number;
  pendingDocumentsCount?: number;
  failedDocumentsCount?: number;
  sizeBytes?: number;
}

interface UploadedFile {
  name: string;
  displayName: string;
  mimeType: string;
  sizeBytes: number;
  createTime: string;
  state: string;
}

interface Citation {
  startIndex: number;
  endIndex: number;
  uri?: string;
  license?: string;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  citations?: Citation[];
  timestamp: Date;
}

// --- Helper Functions ---

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('text')) return '📃';
  return '📁';
};

// --- Main Component ---

export default function FileSearchPage() {
  // --- State: Store & Files ---
  const [stores, setStores] = useState<FileSearchStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedStoreInfo, setSelectedStoreInfo] = useState<FileSearchStore | null>(null);
  const [newStoreName, setNewStoreName] = useState('');

  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // --- State: Chat ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- State: UI ---
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false); // General loading (store ops)
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // --- Effects ---
  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- API Interactions ---

  const loadStores = async () => {
    try {
      const response = await fetch('/api/gemini/list-stores');
      const data = await response.json();
      if (data.success) {
        setStores(data.stores);
      } else {
        console.error('Failed to load stores:', data.error);
      }
    } catch (err) {
      console.error('Error loading stores:', err);
    }
  };

  const loadStoreInfo = async (storeName: string) => {
    try {
      const storeResponse = await fetch('/api/gemini/get-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeName }),
      });
      const storeData = await storeResponse.json();
      if (storeData.success) setSelectedStoreInfo(storeData.store);

      const filesResponse = await fetch('/api/gemini/list-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeName }),
      });
      const filesData = await filesResponse.json();
      if (filesData.success) setUploadedFiles(filesData.documents || []);
    } catch (err) {
      console.error('Error loading store info:', err);
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/gemini/create-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: newStoreName }),
      });
      const data = await response.json();

      if (data.success) {
        setSuccess('스토어가 생성되었습니다.');
        setNewStoreName('');
        await loadStores();
        setSelectedStore(data.store.name);
        // Auto-select newly created store
        setSelectedStoreInfo(data.store);
        setUploadedFiles([]);
      } else {
        setError(data.error || '스토어 생성 실패');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStore = async () => {
    if (!selectedStore || !confirm('정말 삭제하시겠습니까?')) return;

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
        setSelectedStore('');
        setSelectedStoreInfo(null);
        setUploadedFiles([]);
        setMessages([]); // Clear chat on store delete
        await loadStores();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAll = async () => {
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
      } else {
        setError(data.error || '업로드 실패');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !selectedStore) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setIsSearching(true);

    try {
      const response = await fetch('/api/gemini/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg.content, storeName: selectedStore }),
      });
      const data = await response.json();

      if (data.success) {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: data.answer,
          citations: data.citations,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: `오류가 발생했습니다: ${data.error || '알 수 없는 오류'}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: `네트워크 오류가 발생했습니다: ${err.message}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSearching(false);
    }
  };

  // --- Event Handlers ---

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file =>
      ['.pdf', '.docx', '.doc', '.txt', '.json', '.csv', '.xlsx'].some(type => file.name.toLowerCase().endsWith(type))
    );
    setAttachedFiles(prev => [...prev, ...validFiles]);
  };

  // --- Render Helpers ---

  const renderSidebar = () => (
    <div className={`absolute inset-y-0 left-0 z-50 w-80 bg-slate-50 border-r border-slate-200 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
        <h2 className="font-bold text-lg flex items-center gap-2 text-slate-800">
          <Database className="w-5 h-5 text-orange-600" />
          스토어 관리
        </h2>
        <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)} className="lg:hidden">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Store Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">현재 스토어</label>
          <select
            value={selectedStore}
            onChange={async (e) => {
              setSelectedStore(e.target.value);
              setAttachedFiles([]);
              setMessages([]); // Clear chat when switching stores
              if (e.target.value) await loadStoreInfo(e.target.value);
              else { setSelectedStoreInfo(null); setUploadedFiles([]); }
            }}
            className="w-full p-2 border rounded-md text-sm"
          >
            <option value="">-- 선택하세요 --</option>
            {stores.map(s => <option key={s.name} value={s.name}>{s.displayName}</option>)}
          </select>
        </div>

        {/* New Store */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">새 스토어 만들기</label>
          <div className="flex gap-2">
            <Input
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              placeholder="이름 입력"
              className="h-9 text-sm"
            />
            <Button onClick={handleCreateStore} disabled={loading} size="sm" variant="primary" className="h-9 px-3">
              <FolderPlus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Store Info & Files */}
        {selectedStoreInfo && (
          <div className="space-y-4 border-t border-slate-200 pt-4">
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-sm">{selectedStoreInfo.displayName}</h3>
                <span className="text-xs text-slate-500">{formatFileSize(selectedStoreInfo.sizeBytes || 0)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <div className="bg-green-50 p-1 rounded text-green-700">
                  <div className="font-bold">{selectedStoreInfo.activeDocumentsCount || 0}</div>
                  <div>활성</div>
                </div>
                <div className="bg-orange-50 p-1 rounded text-orange-700">
                  <div className="font-bold">{selectedStoreInfo.pendingDocumentsCount || 0}</div>
                  <div>처리중</div>
                </div>
                <div className="bg-red-50 p-1 rounded text-red-700">
                  <div className="font-bold">{selectedStoreInfo.failedDocumentsCount || 0}</div>
                  <div>실패</div>
                </div>
              </div>
              <Button onClick={handleDeleteStore} variant="danger" size="sm" className="w-full mt-3 h-7 text-xs">
                <Trash2 className="w-3 h-3 mr-1" /> 스토어 삭제
              </Button>
            </div>

            {/* File Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${isDragging ? 'border-orange-500 bg-orange-50' : 'border-slate-300 bg-slate-50'}`}
            >
              <p className="text-xs text-slate-600 mb-2">파일을 드래그하거나 선택하세요</p>
              <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 bg-slate-700 text-white rounded text-xs hover:bg-slate-800">
                <Upload className="w-3 h-3" /> 파일 선택
                <input type="file" multiple onChange={(e) => {
                  if (e.target.files) setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                }} className="hidden" accept=".pdf,.docx,.txt,.json,.csv" />
              </label>
            </div>

            {/* Attached Files List */}
            {attachedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>대기중 ({attachedFiles.length})</span>
                  <button onClick={() => setAttachedFiles([])} className="text-red-500 hover:underline">비우기</button>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {attachedFiles.map((f, i) => (
                    <div key={i} className="flex justify-between items-center text-xs bg-white p-1.5 rounded border">
                      <span className="truncate flex-1">{f.name}</span>
                      <button onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}><X className="w-3 h-3 text-slate-400" /></button>
                    </div>
                  ))}
                </div>
                <Button onClick={handleUploadAll} disabled={loading} className="w-full h-8 text-xs" variant="accent">
                  업로드 시작
                </Button>
              </div>
            )}

            {/* Uploaded Files List */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <FileType className="w-3 h-3" /> 업로드된 파일 ({uploadedFiles.length})
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-white p-2 rounded border border-slate-100">
                    <span>{getFileIcon(f.mimeType)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{f.displayName}</div>
                      <div className="text-[10px] text-slate-400">{formatFileSize(f.sizeBytes)} • {f.state}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-100 overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="absolute inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {renderSidebar()}

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'lg:ml-80' : 'lg:ml-0'} w-full`}>

        {/* Chat Header */}
        <header className="bg-white border-b border-slate-200 p-4 flex items-center gap-4 shadow-sm z-10">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl text-slate-800 flex items-center gap-2">
              <Bot className="w-6 h-6 text-cyan-600" />
              AI 문서 챗봇
            </h1>
            <p className="text-xs text-slate-500">
              {selectedStore ? `현재 스토어: ${selectedStoreInfo?.displayName || selectedStore}` : '스토어를 선택하여 대화를 시작하세요'}
            </p>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <MessageSquare className="w-16 h-16 opacity-20" />
              <p className="text-lg font-medium">문서에 대해 무엇이든 물어보세요</p>
              {!selectedStore && (
                <p className="text-sm text-orange-500 bg-orange-50 px-4 py-2 rounded-full">
                  👈 왼쪽 사이드바에서 스토어를 먼저 선택해주세요
                </p>
              )}
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-cyan-600" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${msg.role === 'user'
                    ? 'bg-slate-800 text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                  }`}>
                  <div className="whitespace-pre-wrap leading-relaxed text-sm">
                    {msg.content}
                  </div>

                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100/20">
                      <p className="text-xs font-semibold mb-1 opacity-70 flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> 참고 문서
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {msg.citations.map((cit, idx) => (
                          <span key={idx} className="text-xs bg-black/5 px-2 py-1 rounded hover:bg-black/10 cursor-help" title={`위치: ${cit.startIndex}-${cit.endIndex}`}>
                            {cit.uri ? (
                              <a href={cit.uri} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-500">
                                출처 {idx + 1}
                              </a>
                            ) : (
                              `출처 {idx + 1}`
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-slate-600" />
                  </div>
                )}
              </div>
            ))
          )}
          {isSearching && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-cyan-600" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                <span className="text-sm text-slate-500">답변을 생성하고 있습니다...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-slate-200 p-4">
          <form onSubmit={handleSearch} className="max-w-4xl mx-auto relative">
            <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-cyan-500/20 focus-within:border-cyan-500 transition-all">
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSearch(e);
                  }
                }}
                placeholder={selectedStore ? "메시지를 입력하세요..." : "스토어를 먼저 선택해주세요"}
                className="flex-1 min-h-[44px] max-h-32 bg-transparent border-none focus:ring-0 resize-none py-2.5 px-3 text-sm"
                disabled={!selectedStore || isSearching}
                rows={1}
              />
              <Button
                type="submit"
                disabled={!selectedStore || !query.trim() || isSearching}
                size="sm"
                className={`mb-1 rounded-lg transition-all ${query.trim() ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : 'bg-slate-200 text-slate-400'
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

      {/* Notifications */}
      {(error || success) && (
        <div className="fixed bottom-20 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <Card className={`shadow-lg border ${error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <CardContent className="p-3 flex items-center gap-3">
              {error ? <AlertCircle className="w-5 h-5 text-red-600" /> : <CheckCircle2 className="w-5 h-5 text-green-600" />}
              <p className={`text-sm ${error ? 'text-red-700' : 'text-green-700'}`}>{error || success}</p>
              <button onClick={() => { setError(''); setSuccess(''); }} className="ml-2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
