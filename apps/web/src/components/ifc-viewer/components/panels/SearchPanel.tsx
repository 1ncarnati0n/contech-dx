'use client';

import { Search, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { usePropertySearch } from '../../hooks/usePropertySearch';
import { TreeNodeIcon } from '../tree/TreeNodeIcon';

/**
 * 검색 패널 컴포넌트
 *
 * IFC 요소를 이름, 타입, 속성으로 검색합니다.
 */
export function SearchPanel() {
  const {
    searchQuery,
    searchResults,
    isSearching,
    selectResult,
    handleQueryChange,
    clearSearch,
  } = usePropertySearch();

  return (
    <div className="flex flex-col h-full">
      {/* 검색 입력 */}
      <div className="p-3 border-b border-zinc-200 dark:border-slate-600">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="이름, 타입, 속성으로 검색..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-zinc-100 dark:bg-slate-700 border border-zinc-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={clearSearch}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        {searchQuery && (
          <div className="mt-2 text-xs text-zinc-500 dark:text-slate-400">
            {isSearching ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                검색 중...
              </span>
            ) : (
              <span>{searchResults.length}개 결과</span>
            )}
          </div>
        )}
      </div>

      {/* 검색 결과 */}
      <div className="flex-1 overflow-auto">
        {!searchQuery ? (
          <div className="p-4 text-center text-zinc-500 dark:text-slate-500">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">검색어를 입력하세요</p>
            <p className="text-xs mt-1 opacity-70">
              이름, 타입, 속성 값으로 검색할 수 있습니다
            </p>
          </div>
        ) : searchResults.length === 0 && !isSearching ? (
          <div className="p-4 text-center text-zinc-500 dark:text-slate-500">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">결과가 없습니다</p>
          </div>
        ) : (
          <div className="p-2">
            {searchResults.map((result, index) => (
              <button
                key={`${result.id}-${index}`}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-slate-700/50 rounded transition-colors"
                onClick={() => selectResult(result)}
              >
                <TreeNodeIcon type={result.type} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                    {result.name}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-slate-400 truncate">
                    {result.type}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 검색 팁 */}
      {!searchQuery && (
        <div className="p-3 border-t border-zinc-200 dark:border-slate-600">
          <div className="text-xs text-zinc-500 dark:text-slate-500 space-y-1">
            <div><strong>검색 예시:</strong></div>
            <div>• IfcWall - 벽 요소 검색</div>
            <div>• 거실 - 이름에 "거실" 포함</div>
            <div>• 콘크리트 - 재질 속성 검색</div>
          </div>
        </div>
      )}
    </div>
  );
}
