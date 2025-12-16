'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import { X, Check, X as XIcon } from 'lucide-react';
import type { Building } from '@/lib/types';
import { useTabDragDrop } from '@/lib/hooks';

// ============================================
// Props 타입 정의
// ============================================
interface Props {
  buildings: Building[];
  activeIndex: number;
  onTabChange: (index: number) => void;
  onDelete?: (buildingId: string, index: number) => void;
  onUpdateBuildingName?: (buildingId: string, newName: string) => Promise<void>;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  children: ReactNode;
}

// ============================================
// 컴포넌트
// ============================================
export function BuildingTabs({ buildings, activeIndex, onTabChange, onDelete, onUpdateBuildingName, onReorder, children }: Props) {
  // 편집 상태 관리
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 드래그앤드롭 훅 사용
  const {
    isDraggable,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    getDragStyles,
  } = useTabDragDrop({
    items: buildings,
    onReorder,
    isEditingActive: editingIndex !== null,
  });

  // 편집 모드 포커스 처리
  useEffect(() => {
    if (editingIndex !== null && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingIndex]);

  // 편집 핸들러
  const handleStartEdit = (index: number, currentName: string) => {
    setEditingIndex(index);
    setEditingName(currentName);
  };

  const handleSaveEdit = async (buildingId: string) => {
    if (editingName.trim() && onUpdateBuildingName) {
      try {
        await onUpdateBuildingName(buildingId, editingName.trim());
      } catch {
        // 에러는 onUpdateBuildingName에서 처리
      }
    }
    setEditingIndex(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, buildingId: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(buildingId);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  if (buildings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* 탭 헤더 */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {buildings.map((building, index) => (
            <div
              key={building.id}
              draggable={isDraggable}
              onDragStart={(e) => handleDragStart(e, index, building.id)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                flex items-center gap-1 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors group
                ${
                  index === activeIndex
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                }
                ${getDragStyles(index)}
              `}
            >
              {editingIndex === index ? (
                <div className="flex items-center gap-1 flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, building.id)}
                    className="flex-1 px-2 py-1 text-sm border border-primary-500 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveEdit(building.id);
                    }}
                    className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                    title="저장"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelEdit();
                    }}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    title="취소"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => onTabChange(index)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(index, building.buildingName);
                    }}
                    className="flex-1 text-left"
                    title="더블클릭하여 이름 수정"
                  >
                    {building.buildingName}
                  </button>
                  {onDelete && buildings.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(building.id, index);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                      title="동 삭제"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="min-h-[400px]">
        {children}
      </div>
    </div>
  );
}

