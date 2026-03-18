'use client';

import { Undo2, Redo2, X, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

interface FullscreenGanttHeaderProps {
  projectName: string;
  canUndo: boolean;
  canRedo: boolean;
  historyLength: { past: number; future: number };
  hasUnsavedChanges: boolean;
  saveStatus: 'idle' | 'saving' | 'saved';
  onUndo: () => void;
  onRedo: () => void;
  onClose: () => void;
}

function ThemeToggleButton() {
  const { setTheme, resolvedTheme } = useTheme();

  if (!resolvedTheme) {
    return (
      <button
        className="flex items-center justify-center rounded p-2 transition-colors"
        style={{ backgroundColor: 'var(--gantt-bg-secondary)' }}
      >
        <Sun className="h-4 w-4" style={{ color: 'var(--gantt-text-secondary)' }} />
      </button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex items-center justify-center rounded p-2 transition-colors hover:opacity-80"
      style={{ backgroundColor: 'var(--gantt-bg-secondary)' }}
      title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      {isDark ? (
        <Sun className="h-4 w-4" style={{ color: 'var(--gantt-text-secondary)' }} />
      ) : (
        <Moon className="h-4 w-4" style={{ color: 'var(--gantt-text-secondary)' }} />
      )}
    </button>
  );
}

export function FullscreenGanttHeader({
  projectName,
  canUndo,
  canRedo,
  historyLength,
  hasUnsavedChanges,
  saveStatus,
  onUndo,
  onRedo,
  onClose,
}: FullscreenGanttHeaderProps) {
  return (
    <div
      className="flex h-12 shrink-0 items-center justify-between px-4 shadow-sm"
      style={{
        backgroundColor: 'var(--gantt-bg-primary)',
        borderBottom: '1px solid var(--gantt-border)',
      }}
    >
      <div className="flex items-center gap-3">
        <h1
          className="flex items-center gap-2 text-lg font-extrabold"
          style={{ color: 'var(--gantt-text-primary)' }}
        >
          <span>
            <span style={{ color: 'var(--gantt-teal)' }}>건설</span>{' '}
            <span style={{ color: 'var(--gantt-vermilion)' }}>표준공정표</span>
          </span>
          <span className="text-sm font-normal" style={{ color: 'var(--gantt-text-secondary)' }}>
            - {projectName}
          </span>
        </h1>

        <div
          className="flex items-center gap-1 pl-3"
          style={{ borderLeft: '1px solid var(--gantt-border)' }}
        >
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors"
            style={{
              backgroundColor: canUndo ? 'var(--gantt-bg-secondary)' : 'var(--gantt-bg-tertiary)',
              color: canUndo ? 'var(--gantt-text-primary)' : 'var(--gantt-text-muted)',
              cursor: canUndo ? 'pointer' : 'not-allowed',
            }}
            title="실행 취소 (Ctrl+Z / Cmd+Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">실행취소</span>
            {historyLength.past > 0 && (
              <span className="ml-0.5 text-[10px]" style={{ color: 'var(--gantt-text-muted)' }}>
                ({historyLength.past})
              </span>
            )}
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors"
            style={{
              backgroundColor: canRedo ? 'var(--gantt-bg-secondary)' : 'var(--gantt-bg-tertiary)',
              color: canRedo ? 'var(--gantt-text-primary)' : 'var(--gantt-text-muted)',
              cursor: canRedo ? 'pointer' : 'not-allowed',
            }}
            title="다시 실행 (Ctrl+Shift+Z / Cmd+Shift+Z)"
          >
            <Redo2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">다시실행</span>
            {historyLength.future > 0 && (
              <span className="ml-0.5 text-[10px]" style={{ color: 'var(--gantt-text-muted)' }}>
                ({historyLength.future})
              </span>
            )}
          </button>
        </div>

        {hasUnsavedChanges && (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            변경사항 있음
          </span>
        )}

        {saveStatus === 'saved' && !hasUnsavedChanges && (
          <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            저장됨
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggleButton />

        <button
          onClick={onClose}
          className="flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
          style={{ color: 'var(--gantt-text-secondary)' }}
          title="닫기"
        >
          <X className="h-4 w-4" />
          <span className="hidden sm:inline">닫기</span>
        </button>
      </div>
    </div>
  );
}
