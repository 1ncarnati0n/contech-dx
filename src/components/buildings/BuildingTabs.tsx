'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import { X, Check, X as XIcon } from 'lucide-react';
import type { Building } from '@/lib/types';

interface Props {
  buildings: Building[];
  activeIndex: number;
  onTabChange: (index: number) => void;
  onDelete?: (buildingId: string, index: number) => void;
  onUpdateBuildingName?: (buildingId: string, newName: string) => Promise<void>;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  children: ReactNode;
}

export function BuildingTabs({ buildings, activeIndex, onTabChange, onDelete, onUpdateBuildingName, onReorder, children }: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingIndex !== null && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingIndex]);

  const handleStartEdit = (index: number, currentName: string) => {
    setEditingIndex(index);
    setEditingName(currentName);
  };

  const handleSaveEdit = async (index: number, buildingId: string) => {
    if (editingName.trim() && onUpdateBuildingName) {
      try {
        await onUpdateBuildingName(buildingId, editingName.trim());
        setEditingIndex(null);
        setEditingName('');
      } catch (error) {
        // 에러는 onUpdateBuildingName에서 처리
      }
    } else {
      setEditingIndex(null);
      setEditingName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number, buildingId: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(index, buildingId);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (editingIndex !== null) return; // 편집 중일 때는 드래그 불가
    const building = buildings[index];
    if (!building) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', building.id);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex && onReorder) {
      onReorder(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
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
              draggable={onReorder !== undefined && editingIndex === null}
              onDragStart={(e) => handleDragStart(e, index)}
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
                ${draggedIndex === index ? 'opacity-50 cursor-move' : ''}
                ${dragOverIndex === index ? 'border-primary-300 dark:border-primary-700' : ''}
                ${onReorder && editingIndex === null ? 'cursor-move' : ''}
              `}
            >
              {editingIndex === index ? (
                <div className="flex items-center gap-1 flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index, building.id)}
                    className="flex-1 px-2 py-1 text-sm border border-primary-500 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveEdit(index, building.id);
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

