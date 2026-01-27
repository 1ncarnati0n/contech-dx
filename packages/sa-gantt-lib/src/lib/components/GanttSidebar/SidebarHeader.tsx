'use client';

import type { SidebarHeaderProps } from './types';
import { GANTT_LAYOUT } from '../../types';

const { HEADER_HEIGHT } = GANTT_LAYOUT;

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  viewMode,
  activeGroupName,
  activeCPName,
  columns,
  resizingIndex,
  selectedTaskIds,
  tasks,
  onColumnResizeStart,
  onColumnResizeDoubleClick,
  onTaskGroup,
  onTaskUngroup,
  onClearSelection,
  dragHandleWidth = 0,
}) => {
  const selectedGroupTask = selectedTaskIds.size === 1
    ? tasks.find(t => t.id === Array.from(selectedTaskIds)[0] && t.type === 'GROUP')
    : null;
  const canGroup = selectedTaskIds.size >= 1 && onTaskGroup && !selectedGroupTask;
  const canUngroup = selectedGroupTask && onTaskUngroup;

  const renderGroupButtons = () => {
    if (!canGroup && !canUngroup && selectedTaskIds.size === 0) return null;

    return (
      <div className="flex items-center gap-2">
        {selectedTaskIds.size > 0 && (
          <span className="text-xs" style={{ color: 'var(--gantt-text-muted)' }}>
            {selectedTaskIds.size}개 선택
          </span>
        )}

        {canUngroup && (
          <button
            onClick={() => {
              onTaskUngroup(selectedGroupTask!.id);
              onClearSelection();
            }}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-white transition-colors"
            style={{ backgroundColor: 'var(--gantt-text-muted)' }}
            title="그룹 해제"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
            해제
          </button>
        )}

        {selectedTaskIds.size > 0 && (
          <button
            onClick={onClearSelection}
            className="flex items-center justify-center rounded p-1 transition-colors"
            style={{ color: 'var(--gantt-text-muted)' }}
            title="선택 해제 (ESC)"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  const renderColumnHeaders = () => (
    <div
      className="flex h-[32px]"
      style={{ borderTop: '1px solid var(--gantt-border-light)' }}
    >
      {/* Drag Handle Spacer - 바디와 컬럼폭 동기화 */}
      {dragHandleWidth > 0 && (
        <div className="shrink-0" style={{ width: dragHandleWidth }} />
      )}
      {columns.map((col, idx) => (
        <div
          key={col.id}
          className="relative flex shrink-0 items-center justify-center text-xs font-medium"
          style={{
            width: idx === 0 && dragHandleWidth > 0 ? col.width - dragHandleWidth : col.width,
            color: 'var(--gantt-text-secondary)',
          }}
        >
          {col.label}
          {idx < columns.length - 1 && (
            <div
              className="absolute right-0 top-0 z-10 h-full w-3 touch-none flex justify-center group"
              style={{ transform: 'translateX(50%)', cursor: 'col-resize' }}
              onMouseDown={(e) => onColumnResizeStart(e, idx)}
              onDoubleClick={(e) => onColumnResizeDoubleClick(e, idx)}
              title="드래그하여 컬럼 너비 조절 / 더블클릭으로 내용에 맞게 자동 조절"
            >
              <div
                className="h-full w-[2px] transition-colors pointer-events-none"
                style={{
                  backgroundColor: resizingIndex === idx
                    ? 'var(--gantt-focus)'
                    : 'transparent',
                }}
              />
            </div>
          )}
          {idx < columns.length - 1 && (
            <div
              className="absolute right-0 top-0 h-full w-px pointer-events-none"
              style={{ backgroundColor: 'var(--gantt-border-light)' }}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div
      className="flex shrink-0 flex-col"
      style={{
        height: HEADER_HEIGHT,
        backgroundColor: 'var(--gantt-bg-secondary)',
        borderBottom: '1px solid var(--gantt-border)',
      }}
    >
      <div className="flex flex-1 items-center justify-between px-4">
        <span style={{ color: 'var(--gantt-text-secondary)', fontSize: '0.875rem' }}>
          {viewMode === 'MASTER' ? (
            '공구공정표 Master'
          ) : viewMode === 'UNIFIED' ? (
            '통합보기 공정표'
          ) : (
            <>
              주공정(C.P)표 Detail : {' '}
              <span className="font-bold" style={{ color: 'var(--gantt-text-primary)' }}>
                {activeGroupName ? `${activeGroupName} / ` : ''}
                {activeCPName || ''}
              </span>
            </>
          )}
        </span>
        {renderGroupButtons()}
      </div>
      {renderColumnHeaders()}
    </div>
  );
};
