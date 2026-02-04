'use client';

import { FolderTree, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useModelTree } from '../../hooks/useModelTree';
import { TreeNode } from '../tree/TreeNode';

/**
 * 모델 트리 패널 컴포넌트
 *
 * IFC 모델의 공간 구조를 트리 형태로 표시합니다.
 */
export function ModelTreePanel() {
  const {
    spatialTree,
    expandedNodes,
    buildSpatialTree,
    selectNode,
    toggleNodeExpanded,
    toggleNodeVisibility,
    focusOnNode,
    expandAll,
    collapseAll,
  } = useModelTree();

  if (spatialTree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <FolderTree className="h-8 w-8 text-zinc-400 dark:text-slate-500 mb-2" />
        <p className="text-sm text-zinc-500 dark:text-slate-400 mb-4">
          모델 트리가 비어있습니다
        </p>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={buildSpatialTree}
        >
          <RefreshCw className="h-4 w-4" />
          트리 생성
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-slate-600">
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-zinc-500 dark:text-slate-400" />
          <span className="text-xs font-medium text-zinc-700 dark:text-slate-300">
            모델 트리
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={expandAll}
            title="모두 펼치기"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={collapseAll}
            title="모두 접기"
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={buildSpatialTree}
            title="새로고침"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* 트리 컨텐츠 */}
      <div className="flex-1 overflow-auto p-2">
        {spatialTree.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            level={0}
            isExpanded={expandedNodes.has(node.id)}
            onToggleExpand={toggleNodeExpanded}
            onSelect={selectNode}
            onToggleVisibility={toggleNodeVisibility}
            onFocus={focusOnNode}
            expandedNodes={expandedNodes}
          />
        ))}
      </div>
    </div>
  );
}
