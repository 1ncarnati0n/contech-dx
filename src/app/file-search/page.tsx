'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Card, CardHeader, CardContent, Button, Input, Textarea } from '@/components/ui';

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

interface SearchResult {
  answer: string;
  citations: Citation[];
}

export default function FileSearchPage() {
  const [stores, setStores] = useState<FileSearchStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedStoreInfo, setSelectedStoreInfo] = useState<FileSearchStore | null>(null);
  const [newStoreName, setNewStoreName] = useState('');

  // 파일 관리 상태
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]); // 첨부된 파일 (업로드 전)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]); // 업로드된 파일 (서버)
  const [isDragging, setIsDragging] = useState(false);

  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 스토어 목록 로드
  const loadStores = async () => {
    try {
      const response = await fetch('/api/gemini/list-stores');
      const data = await response.json();

      if (data.success) {
        setStores(data.stores);
      } else {
        setError(data.error || '스토어 목록을 불러오는데 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '스토어 목록을 불러오는데 실패했습니다.');
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  // 새 스토어 생성
  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) {
      setError('스토어 이름을 입력해주세요.');
      return;
    }

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
        setSuccess('스토어가 성공적으로 생성되었습니다!');
        setNewStoreName('');
        await loadStores();
        setSelectedStore(data.store.name);
      } else {
        setError(data.error || '스토어 생성에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '스토어 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 스토어 정보 및 파일 목록 로드
  const loadStoreInfo = async (storeName: string) => {
    try {
      // 스토어 정보 로드
      const storeResponse = await fetch('/api/gemini/get-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeName }),
      });

      const storeData = await storeResponse.json();
      if (storeData.success) {
        setSelectedStoreInfo(storeData.store);
      }

      // 파일 목록 로드
      const filesResponse = await fetch('/api/gemini/list-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeName }),
      });

      const filesData = await filesResponse.json();
      if (filesData.success) {
        setUploadedFiles(filesData.documents || []);
      }
    } catch (err: any) {
      console.error('스토어 정보 로드 실패:', err);
    }
  };

  // 스토어 삭제
  const handleDeleteStore = async () => {
    if (!selectedStore) return;

    if (!confirm('정말 이 스토어를 삭제하시겠습니까? 모든 문서가 함께 삭제됩니다.')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/gemini/delete-store', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeName: selectedStore, force: true }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('스토어가 성공적으로 삭제되었습니다!');
        setSelectedStore('');
        setSelectedStoreInfo(null);
        setUploadedFiles([]);
        await loadStores();
      } else {
        setError(data.error || '스토어 삭제에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '스토어 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => {
      const validTypes = ['.pdf', '.docx', '.doc', '.txt', '.json', '.csv', '.xlsx'];
      return validTypes.some(type => file.name.toLowerCase().endsWith(type));
    });

    if (validFiles.length !== files.length) {
      setError('일부 파일은 지원하지 않는 형식입니다. PDF, DOCX, TXT 등만 가능합니다.');
    }

    setAttachedFiles(prev => [...prev, ...validFiles]);
  };

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAttachedFiles(prev => [...prev, ...files]);
    }
  };

  // 첨부된 파일 제거
  const handleRemoveAttached = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 모든 첨부 파일 업로드
  const handleUploadAll = async () => {
    if (attachedFiles.length === 0) {
      setError('첨부된 파일이 없습니다.');
      return;
    }
    if (!selectedStore) {
      setError('스토어를 선택해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

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
        setSuccess(`${attachedFiles.length}개 파일이 성공적으로 업로드되었습니다!`);
        setAttachedFiles([]);
        await loadStoreInfo(selectedStore);
      } else {
        setError(data.error || '파일 업로드에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '파일 업로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 검색 수행
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setError('질문을 입력해주세요.');
      return;
    }
    if (!selectedStore) {
      setError('스토어를 선택해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setSearchResult(null);

    try {
      const response = await fetch('/api/gemini/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, storeName: selectedStore }),
      });

      const data = await response.json();

      if (data.success) {
        setSearchResult({
          answer: data.answer,
          citations: data.citations || [],
        });
      } else {
        setError(data.error || '검색에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '검색에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // 파일 아이콘 가져오기
  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('text')) return '📃';
    return '📁';
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 mb-2">
          <FileSearch className="w-8 h-8 text-orange-600" />
          AI 문서 검색 (RAG)
        </h1>
        <p className="text-slate-600">Gemini 3 Pro를 활용한 지능형 문서 검색 시스템</p>
      </div>

      {/* 알림 메시지 */}
      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}
      {success && (
        <Card className="mb-6 bg-green-50 border-green-200">
          <CardContent className="p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-700 text-sm">{success}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽: 스토어 관리 & 파일 업로드 */}
        <div className="space-y-6">
          {/* 새 스토어 생성 */}
          <Card>
            <CardHeader
              title="새 스토어 생성"
              description="문서를 저장할 스토어를 생성하세요"
              action={<FolderPlus className="w-5 h-5 text-slate-400" />}
            />
            <CardContent>
              <form onSubmit={handleCreateStore} className="space-y-4">
                <Input
                  label="스토어 이름"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="예: 건설 프로젝트 문서"
                  disabled={loading}
                  icon={<Database className="w-4 h-4" />}
                />
                <Button
                  type="submit"
                  disabled={loading}
                  loading={loading}
                  variant="primary"
                  className="w-full"
                  icon={<FolderPlus className="w-4 h-4" />}
                >
                  스토어 생성
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 스토어 선택 */}
          <Card>
            <CardHeader
              title="스토어 선택 및 관리"
              description="사용할 스토어를 선택하세요"
            />
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  사용할 스토어
                </label>
                <select
                  value={selectedStore}
                  onChange={async (e) => {
                    setSelectedStore(e.target.value);
                    setAttachedFiles([]);
                    if (e.target.value) {
                      await loadStoreInfo(e.target.value);
                    } else {
                      setSelectedStoreInfo(null);
                      setUploadedFiles([]);
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-slate-500 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50"
                  disabled={loading}
                >
                  <option value="">-- 스토어를 선택하세요 --</option>
                  {stores.map((store) => (
                    <option key={store.name} value={store.name}>
                      {store.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {selectedStoreInfo && (
                <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                  <h3 className="font-semibold text-sm text-slate-700">스토어 정보</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-slate-600">활성:</span>
                      <span className="font-medium text-slate-900">
                        {selectedStoreInfo.activeDocumentsCount || 0}개
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-orange-600" />
                      <span className="text-slate-600">처리 중:</span>
                      <span className="font-medium text-slate-900">
                        {selectedStoreInfo.pendingDocumentsCount || 0}개
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-slate-600">실패:</span>
                      <span className="font-medium text-red-600">
                        {selectedStoreInfo.failedDocumentsCount || 0}개
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-cyan-600" />
                      <span className="text-slate-600">크기:</span>
                      <span className="font-medium text-slate-900">
                        {formatFileSize(selectedStoreInfo.sizeBytes || 0)}
                      </span>
                    </div>
                  </div>

                  {/* 업로드된 파일 목록 */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <h4 className="font-semibold text-xs text-slate-700 mb-2 flex items-center gap-2">
                        <FileType className="w-4 h-4" />
                        업로드된 파일 ({uploadedFiles.length}개)
                      </h4>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {uploadedFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 hover:border-slate-300 transition-colors"
                          >
                            <span className="text-lg">{getFileIcon(file.mimeType)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 truncate text-xs">
                                {file.displayName}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                <span>{formatFileSize(file.sizeBytes)}</span>
                                <span>•</span>
                                <span className={file.state === 'ACTIVE' ? 'text-green-600 font-medium' : 'text-orange-600'}>
                                  {file.state}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleDeleteStore}
                    disabled={loading}
                    variant="danger"
                    size="sm"
                    className="w-full mt-2"
                    icon={<Trash2 className="w-4 h-4" />}
                  >
                    스토어 삭제
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 파일 첨부 (드래그 앤 드롭) */}
          <Card>
            <CardHeader
              title="파일 첨부"
              description="드래그 앤 드롭 또는 파일 선택"
              action={<Upload className="w-5 h-5 text-slate-400" />}
            />
            <CardContent className="space-y-4">
              {/* 드래그 앤 드롭 영역 */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                } ${!selectedStore ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-700 font-medium mb-2">
                  여기에 파일을 드래그하거나
                </p>
                <label className="inline-block">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    accept=".pdf,.docx,.doc,.txt,.json,.csv,.xlsx"
                    className="hidden"
                    disabled={!selectedStore}
                  />
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
                    <File className="w-4 h-4" />
                    파일 선택
                  </span>
                </label>
                <p className="text-xs text-slate-500 mt-3">
                  PDF, DOCX, TXT, JSON, CSV, XLSX 지원
                </p>
              </div>

              {/* 첨부된 파일 목록 */}
              {attachedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">
                      첨부된 파일 ({attachedFiles.length}개)
                    </p>
                    <button
                      onClick={() => setAttachedFiles([])}
                      className="text-xs text-slate-500 hover:text-red-600 transition-colors"
                    >
                      모두 제거
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {attachedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-sm bg-white border border-slate-200 p-3 rounded-lg group hover:border-slate-300 transition-colors"
                      >
                        <FileType className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{file.name}</p>
                          <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveAttached(idx)}
                          className="text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={handleUploadAll}
                    disabled={loading || !selectedStore}
                    loading={loading}
                    variant="accent"
                    className="w-full"
                    icon={<Upload className="w-4 h-4" />}
                  >
                    {attachedFiles.length}개 파일 업로드
                  </Button>
                </div>
              )}

              {!selectedStore && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  먼저 스토어를 선택해주세요
                </p>
              )}
            </CardContent>
          </Card>

        </div>

        {/* 오른쪽: 검색 */}
        <div className="space-y-6">
          {/* 검색 */}
          <Card>
            <CardHeader
              title="문서 검색"
              description="업로드된 문서에 대해 질문하세요"
              action={<Search className="w-5 h-5 text-slate-400" />}
            />
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <Textarea
                  label="질문 입력"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="업로드된 문서에 대해 질문하세요..."
                  rows={4}
                  disabled={loading || !selectedStore}
                />
                <Button
                  type="submit"
                  disabled={loading || !selectedStore || !query.trim()}
                  loading={loading}
                  variant="secondary"
                  className="w-full"
                  icon={<Search className="w-4 h-4" />}
                >
                  검색하기
                </Button>
                {!selectedStore && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    먼저 스토어를 선택해주세요
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          {/* 검색 결과 */}
          {searchResult && (
            <Card>
              <CardHeader title="검색 결과" />
              <CardContent>
                <div className="bg-slate-50 p-4 rounded-lg mb-4">
                  <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {searchResult.answer}
                  </p>
                </div>

                {searchResult.citations.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      출처
                    </h3>
                    <ul className="space-y-2">
                      {searchResult.citations.map((citation, idx) => (
                        <li key={idx} className="text-sm text-slate-600">
                          {citation.uri ? (
                            <a
                              href={citation.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-600 hover:text-cyan-700 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Citation {idx + 1}: {citation.uri}
                            </a>
                          ) : (
                            <span>
                              Citation {idx + 1}: 위치 {citation.startIndex}-{citation.endIndex}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 사용 안내 */}
      <Card className="mt-8 bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-cyan-900 mb-4 flex items-center gap-2">
            <FileSearch className="w-5 h-5" />
            사용 방법
          </h3>
          <ol className="text-sm text-cyan-800 space-y-2 list-decimal list-inside leading-relaxed">
            <li>먼저 <strong>새 스토어</strong>를 생성하거나 기존 스토어를 선택하세요</li>
            <li><strong>드래그 앤 드롭</strong> 또는 파일 선택으로 여러 파일을 첨부하세요</li>
            <li>첨부된 파일 목록을 확인하고 <strong>일괄 업로드</strong> 버튼을 클릭하세요</li>
            <li>업로드된 파일 목록에서 <strong>저장된 문서</strong>를 확인할 수 있습니다</li>
            <li>검색 창에 <strong>질문을 입력</strong>하여 문서 내용을 검색하세요</li>
            <li>Gemini AI가 문서를 분석하여 <strong>답변과 출처</strong>를 제공합니다</li>
          </ol>
          <p className="text-sm text-cyan-700 mt-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Tip:</strong> 여러 파일을 한 번에 선택하거나 드래그하여 빠르게 업로드할 수 있습니다.
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
