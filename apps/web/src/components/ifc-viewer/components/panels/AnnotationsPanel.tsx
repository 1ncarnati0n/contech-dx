'use client';

import { useState } from 'react';
import { MessageSquare, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAnnotations } from '../../hooks/useAnnotations';
import type { Annotation } from '../../types';

/**
 * 주석 패널 컴포넌트
 *
 * 주석 목록을 표시하고 관리합니다.
 */
export function AnnotationsPanel() {
  const {
    annotations,
    isAnnotating,
    editAnnotation,
    deleteAnnotation,
    clearAllAnnotations,
    startAnnotating,
    stopAnnotating,
  } = useAnnotations();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleStartEdit = (annotation: Annotation) => {
    setEditingId(annotation.id);
    setEditText(annotation.text);
  };

  const handleSaveEdit = () => {
    if (editingId && editText.trim()) {
      editAnnotation(editingId, { text: editText.trim() });
    }
    setEditingId(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="px-4 py-3 bg-zinc-100 dark:bg-slate-800 flex items-center justify-between border-b border-zinc-300 dark:border-slate-600">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-zinc-500 dark:text-slate-400" />
          <span className="text-sm font-medium text-zinc-700 dark:text-slate-300">
            주석 ({annotations.length})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${isAnnotating ? 'text-primary bg-primary/10' : ''}`}
            onClick={isAnnotating ? stopAnnotating : startAnnotating}
            title={isAnnotating ? '주석 모드 종료' : '새 주석 추가'}
          >
            <Plus className="h-4 w-4" />
          </Button>
          {annotations.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={clearAllAnnotations}
              title="모든 주석 삭제"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 주석 모드 안내 */}
      {isAnnotating && (
        <div className="px-4 py-2 bg-primary/10 text-primary text-xs border-b border-primary/20">
          <strong>주석 모드:</strong> 3D 모델을 클릭하여 주석을 추가하세요
        </div>
      )}

      {/* 주석 목록 */}
      <div className="flex-1 overflow-auto p-4">
        {annotations.length === 0 ? (
          <div className="text-center text-zinc-500 dark:text-slate-500 py-8">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">주석이 없습니다</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-2"
              onClick={startAnnotating}
            >
              <Plus className="h-4 w-4" />
              주석 추가
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {annotations.map((annotation) => (
              <div
                key={annotation.id}
                className="bg-zinc-100 dark:bg-slate-700/50 rounded-lg p-3 border border-zinc-300 dark:border-slate-600"
              >
                {editingId === annotation.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full px-2 py-1 text-sm bg-white dark:bg-slate-800 border border-zinc-300 dark:border-slate-600 rounded resize-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-primary"
                        onClick={handleSaveEdit}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full mt-0.5"
                        style={{ backgroundColor: annotation.color || '#f59e0b' }}
                      />
                      <div className="flex-1">
                        {annotation.title && (
                          <div className="font-medium text-zinc-900 dark:text-white text-sm">
                            {annotation.title}
                          </div>
                        )}
                        <p className="text-sm text-zinc-700 dark:text-slate-300">
                          {annotation.text}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleStartEdit(annotation)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => deleteAnnotation(annotation.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-slate-500">
                      <span>
                        위치: ({annotation.position.x.toFixed(1)}, {annotation.position.y.toFixed(1)}, {annotation.position.z.toFixed(1)})
                      </span>
                      <span>{formatDate(annotation.createdAt)}</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
