'use client';

import { useRef } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MenuSearchProps {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
}

export default function MenuSearch({ value, onChange, resultCount, totalCount }: MenuSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // 검색 필드에 자동 포커스하지 않음 (모바일에서 키보드가 바로 올라오는 것 방지)

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  const hasQuery = value.trim().length > 0;
  const isFiltered = hasQuery && resultCount < totalCount;

  return (
    <div className="px-3 py-2">
      <div className="relative">
        {/* 검색 아이콘 */}
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />

        {/* 검색 입력 필드 */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="메뉴 검색..."
          className="w-full pl-9 pr-9 py-2.5 text-sm rounded-lg
            bg-zinc-100 dark:bg-zinc-800
            text-zinc-900 dark:text-white
            placeholder:text-zinc-400 dark:placeholder:text-zinc-500
            border border-transparent
            focus:border-accent-300 dark:focus:border-accent-600
            focus:bg-white dark:focus:bg-zinc-900
            focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-900/30
            outline-none transition-all"
        />

        {/* 클리어 버튼 */}
        <AnimatePresence>
          {hasQuery && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md
                text-zinc-400 hover:text-zinc-600
                dark:text-zinc-500 dark:hover:text-zinc-300
                hover:bg-zinc-200 dark:hover:bg-zinc-700
                transition-colors"
              aria-label="검색어 지우기"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* 검색 결과 카운트 */}
      <AnimatePresence>
        {isFiltered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="mt-2 px-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-medium text-accent-600 dark:text-accent-400">{resultCount}</span>개 메뉴 검색됨
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
