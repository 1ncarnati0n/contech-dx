'use client';

import { useState } from 'react';
import {
  Upload,
  Trash2,
  X,
  Plus,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  Database,
  History,
  Loader2,
} from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { formatFileSize, ALLOWED_EXTENSIONS } from './utils';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { FileSearchStore, UploadedFile, ChatSession } from './types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  stores: FileSearchStore[];
  selectedStore: string;
  selectedStoreInfo: FileSearchStore | null;
  uploadedFiles: UploadedFile[];
  attachedFiles: File[];
  loading: boolean;
  isAdmin?: boolean;
  onSelectStore: (storeName: string) => void;
  onCreateStore: (displayName: string) => Promise<boolean>;
  onDeleteStore: () => void;
  onAttachFiles: (files: File[]) => void;
  onRemoveAttachedFile: (index: number) => void;
  onClearAttachedFiles: () => void;
  onUploadFiles: () => void;
  onDeleteFile?: (fileName: string) => void;

  // 페이지네이션 관련 props
  nextPageToken?: string | null;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;

  // 채팅 세션 관련 props
  sessions?: ChatSession[];
  currentSessionId?: string | null;
  onSelectSession?: (sessionId: string) => void;
  onCreateSession?: () => void;
  onDeleteSession?: (sessionId: string) => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  stores,
  selectedStore,
  selectedStoreInfo,
  uploadedFiles,
  attachedFiles,
  loading,
  isAdmin = false,
  onSelectStore,
  onCreateStore,
  onDeleteStore,
  onAttachFiles,
  onRemoveAttachedFile,
  onClearAttachedFiles,
  onUploadFiles,
  onDeleteFile,

  nextPageToken,
  isLoadingMore = false,
  onLoadMore,

  sessions = [],
  currentSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
}: SidebarProps) {
  const [newStoreName, setNewStoreName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isStoreExpanded, setIsStoreExpanded] = useState(true);

  // ConfirmDialog states
  const [deleteStoreOpen, setDeleteStoreOpen] = useState(false);
  const [deleteFileTarget, setDeleteFileTarget] = useState<string | null>(null);
  const [deleteSessionTarget, setDeleteSessionTarget] = useState<string | null>(null);

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onCreateStore(newStoreName);
    if (success) {
      setNewStoreName('');
    }
  };

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
    onAttachFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onAttachFiles(Array.from(e.target.files));
    }
  };

  return (
    <>
      <div
        className={`absolute inset-y-0 left-0 z-30 w-80 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } flex flex-col`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <Database className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white text-sm">AI 문서 분석</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">문서 기반 AI 검색</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="lg:hidden">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">

          {/* 1. Store & Files Section */}
          <div className="space-y-3">
            <button
              onClick={() => setIsStoreExpanded(!isStoreExpanded)}
              className="flex items-center justify-between w-full text-xs font-semibold text-slate-500 dark:text-slate-400 px-1 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="w-3.5 h-3.5" />
                문서함 설정
              </span>
              {isStoreExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {isStoreExpanded && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                {/* Store Selector */}
                <div className="space-y-2">
                  <select
                    value={selectedStore}
                    onChange={(e) => onSelectStore(e.target.value)}
                    className="w-full p-2.5 rounded-lg text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all"
                  >
                    <option value="">문서함 선택...</option>
                    {stores.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.displayName}
                      </option>
                    ))}
                  </select>

                  <form onSubmit={handleCreateStore} className="flex gap-2">
                    <Input
                      value={newStoreName}
                      onChange={(e) => setNewStoreName(e.target.value)}
                      placeholder="새 문서함 이름"
                      className="h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      className="h-9 w-9 p-0 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-cyan-600"
                      disabled={!newStoreName.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </form>
                </div>

                {/* Selected Store Info */}
                {selectedStoreInfo && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-cyan-50 dark:bg-cyan-900/20 rounded-md">
                          <FolderOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <span className="font-medium text-sm text-slate-900 dark:text-white">{selectedStoreInfo.displayName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedStoreInfo.activeDocumentsCount != null && (
                          <span className="text-xs text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/30 px-2 py-0.5 rounded-full font-medium">
                            {selectedStoreInfo.activeDocumentsCount}개 문서
                          </span>
                        )}
                        <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                          {formatFileSize(selectedStoreInfo.sizeBytes || 0)}
                        </span>
                        <button
                          onClick={() => setDeleteStoreOpen(true)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          title="문서함 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>

                    {/* File Upload Area */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${isDragging
                          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                    >
                      <label className="cursor-pointer flex flex-col items-center gap-2">
                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full">
                          <Upload className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">파일 추가</span>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">드래그하거나 클릭</p>
                        </div>
                        <input
                          type="file"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                          accept={ALLOWED_EXTENSIONS.join(',')}
                        />
                      </label>
                    </div>

                    {/* Attached Files */}
                    {attachedFiles.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">대기 중 ({attachedFiles.length})</span>
                          <button onClick={onClearAttachedFiles} className="text-red-500 hover:text-red-600 font-medium">비우기</button>
                        </div>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {attachedFiles.map((f, i) => (
                            <div key={i} className="flex justify-between items-center text-xs bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                              <div className="flex-1 min-w-0">
                                <div className="truncate text-slate-700 dark:text-slate-300 font-medium">{f.name}</div>
                                <div className="text-slate-400">{formatFileSize(f.size)}</div>
                              </div>
                              <button onClick={() => onRemoveAttachedFile(i)} className="ml-2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors">
                                <X className="w-3.5 h-3.5 text-slate-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <Button
                          onClick={onUploadFiles}
                          disabled={loading || attachedFiles.length === 0}
                          size="sm"
                          className="w-full h-9 text-sm bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                              업로드 중...
                            </>
                          ) : (
                            `${attachedFiles.length}개 파일 업로드`
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Uploaded Files List */}
                    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <FileText className="w-3.5 h-3.5" />
                        <span className="font-medium">업로드된 파일 ({uploadedFiles.length}개)</span>
                      </div>
                      {uploadedFiles.length > 0 ? (
                        <>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {uploadedFiles.map((file) => (
                              <div key={file.name} className="flex justify-between items-center text-xs bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                <div className="flex-1 min-w-0">
                                  <div
                                    className="truncate text-slate-700 dark:text-slate-300 font-medium"
                                    title={file.displayName}
                                  >
                                    {file.displayName}
                                  </div>
                                  <div className="text-slate-400">{formatFileSize(file.sizeBytes)}</div>
                                </div>
                                {onDeleteFile && (
                                  <button
                                    onClick={() => setDeleteFileTarget(file.name)}
                                    className="ml-2 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                    title="파일 삭제"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          {/* 더 보기 버튼 */}
                          {nextPageToken && onLoadMore && (
                            <button
                              onClick={onLoadMore}
                              disabled={isLoadingMore}
                              className="w-full py-2 text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {isLoadingMore ? '로딩 중...' : '더 보기'}
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-4 text-xs text-slate-400">
                          업로드된 파일이 없습니다
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-200 dark:bg-slate-800" />

          {/* 2. History Section */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
              <History className="w-3.5 h-3.5" />
              최근 대화
            </h3>
            <div className="space-y-1">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>대화 내역이 없습니다</p>
                </div>
              ) : (
                sessions.map(session => {
                  const isCurrent = currentSessionId === session.id;
                  return (
                    <div
                      key={session.id}
                      onClick={() => onSelectSession?.(session.id)}
                      className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-all ${isCurrent
                          ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 font-medium border border-cyan-200 dark:border-cyan-800'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                    >
                      <MessageSquare className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-cyan-600 dark:text-cyan-400' : 'opacity-60'}`} />
                      <div className="flex-1 min-w-0">
                        <span className="block truncate">
                          {session.title || '새로운 대화'}
                        </span>
                        {session.updatedAt > 0 && (
                          <span className="block text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true, locale: ko })}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteSessionTarget(session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 rounded transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer: New Chat Button */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <Button
            onClick={onCreateSession}
            disabled={!selectedStore}
            className="w-full justify-center gap-2 h-10 bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>새로운 대화</span>
          </Button>
        </div>
      </div>

      {/* ConfirmDialog: 문서함 삭제 */}
      <ConfirmDialog
        open={deleteStoreOpen}
        onOpenChange={setDeleteStoreOpen}
        title="문서함 삭제"
        description="문서함과 포함된 모든 파일이 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        variant="danger"
        onConfirm={() => {
          setDeleteStoreOpen(false);
          onDeleteStore();
        }}
      />

      {/* ConfirmDialog: 파일 삭제 */}
      <ConfirmDialog
        open={!!deleteFileTarget}
        onOpenChange={(open) => { if (!open) setDeleteFileTarget(null); }}
        title="파일 삭제"
        description="이 파일을 삭제하시겠습니까?"
        confirmText="삭제"
        variant="danger"
        onConfirm={() => {
          if (deleteFileTarget && onDeleteFile) {
            onDeleteFile(deleteFileTarget);
          }
          setDeleteFileTarget(null);
        }}
      />

      {/* ConfirmDialog: 대화 삭제 */}
      <ConfirmDialog
        open={!!deleteSessionTarget}
        onOpenChange={(open) => { if (!open) setDeleteSessionTarget(null); }}
        title="대화 삭제"
        description="이 대화를 삭제하시겠습니까? 대화 내역이 모두 사라집니다."
        confirmText="삭제"
        variant="danger"
        onConfirm={() => {
          if (deleteSessionTarget) {
            onDeleteSession?.(deleteSessionTarget);
          }
          setDeleteSessionTarget(null);
        }}
      />
    </>
  );
}
