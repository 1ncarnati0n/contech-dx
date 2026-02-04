'use client';

import { ChevronRight, ChevronDown, Eye, EyeOff, Focus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TreeNodeIcon } from './TreeNodeIcon';
import type { SpatialTreeNode } from '../../types';

interface TreeNodeProps {
  node: SpatialTreeNode;
  level: number;
  isExpanded: boolean;
  onToggleExpand: (nodeId: number) => void;
  onSelect: (node: SpatialTreeNode) => void;
  onToggleVisibility: (node: SpatialTreeNode) => void;
  onFocus: (node: SpatialTreeNode) => void;
  expandedNodes: Set<number>;
}

/**
 * 트리 노드 컴포넌트
 *
 * 재귀적으로 IFC 요소 트리를 렌더링합니다.
 */
export function TreeNode({
  node,
  level,
  isExpanded,
  onToggleExpand,
  onSelect,
  onToggleVisibility,
  onFocus,
  expandedNodes,
}: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const paddingLeft = level * 16;

  return (
    <div className="select-none">
      <div
        className="group flex items-center gap-1 py-1 px-2 hover:bg-zinc-100 dark:hover:bg-slate-700/50 rounded cursor-pointer"
        style={{ paddingLeft }}
        onClick={() => onSelect(node)}
      >
        {/* 확장/축소 버튼 */}
        <button
          className="p-0.5 hover:bg-zinc-200 dark:hover:bg-slate-600 rounded"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) {
              onToggleExpand(node.id);
            }
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3 text-zinc-500 dark:text-slate-400" />
            ) : (
              <ChevronRight className="h-3 w-3 text-zinc-500 dark:text-slate-400" />
            )
          ) : (
            <span className="w-3 h-3 inline-block" />
          )}
        </button>

        {/* 아이콘 */}
        <TreeNodeIcon type={node.type} />

        {/* 이름 */}
        <span className="flex-1 text-xs text-zinc-700 dark:text-slate-300 truncate">
          {node.name}
        </span>

        {/* 액션 버튼들 (호버 시 표시) */}
        <div className="hidden group-hover:flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onFocus(node);
            }}
            title="포커스"
          >
            <Focus className="h-3 w-3 text-zinc-400 hover:text-zinc-600 dark:text-slate-500 dark:hover:text-slate-300" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(node);
            }}
            title={node.isVisible ? '숨기기' : '보이기'}
          >
            {node.isVisible !== false ? (
              <Eye className="h-3 w-3 text-zinc-400 hover:text-zinc-600 dark:text-slate-500 dark:hover:text-slate-300" />
            ) : (
              <EyeOff className="h-3 w-3 text-zinc-400 hover:text-zinc-600 dark:text-slate-500 dark:hover:text-slate-300" />
            )}
          </Button>
        </div>
      </div>

      {/* 자식 노드들 */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              isExpanded={expandedNodes.has(child.id)}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onToggleVisibility={onToggleVisibility}
              onFocus={onFocus}
              expandedNodes={expandedNodes}
            />
          ))}
        </div>
      )}
    </div>
  );
}
