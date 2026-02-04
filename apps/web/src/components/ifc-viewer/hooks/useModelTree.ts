'use client';

import { useCallback, useEffect } from 'react';
import { useIfcViewerContext } from '../context/IfcViewerContext';
import { useIfcViewerStore } from '../stores/useIfcViewerStore';
import type { SpatialTreeNode } from '../types';

/**
 * 모델 트리 훅
 *
 * IFC 모델의 공간 구조를 트리 형태로 제공합니다.
 * @thatopen/components의 RelationsTree를 사용합니다.
 */
export function useModelTree() {
  const { fragmentsRef, highlighterRef, componentsRef, worldRef } = useIfcViewerContext();
  const {
    spatialTree,
    setSpatialTree,
    expandedNodes,
    toggleNodeExpanded,
    expandAll,
    collapseAll,
    categoryFilter,
    toggleCategory,
    setSelectedElements,
  } = useIfcViewerStore();

  // 공간 구조 트리 빌드
  const buildSpatialTree = useCallback(async () => {
    if (!fragmentsRef.current) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fragments = fragmentsRef.current as any;
      const tree: SpatialTreeNode[] = [];

      // 모든 모델 순회
      for (const [modelId, model] of fragments.list.entries()) {
        // 모델의 공간 구조 가져오기
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const modelData = model as any;

        try {
          // 기본 모델 노드 생성
          const rootNode: SpatialTreeNode = {
            id: Date.now(),
            expressId: 0,
            name: modelId,
            type: 'IfcProject',
            children: [],
            modelId,
            isVisible: true,
            isExpanded: true,
          };

          // 모델의 아이템 데이터 가져오기
          if (modelData.getItemsData) {
            const allLocalIds = modelData.getAllItemIDs?.() || [];
            if (allLocalIds.length > 0) {
              const itemsData = await modelData.getItemsData(allLocalIds.slice(0, 100)); // 처음 100개만

              // 타입별로 그룹화
              const typeGroups: Record<string, SpatialTreeNode[]> = {};

              itemsData.forEach((item: { localId?: number; type?: string; name?: string }, index: number) => {
                const type = item.type || 'Unknown';
                if (!typeGroups[type]) {
                  typeGroups[type] = [];
                }

                typeGroups[type].push({
                  id: item.localId ?? Date.now() + index,
                  expressId: item.localId ?? index,
                  name: item.name || `${type} ${typeGroups[type].length + 1}`,
                  type,
                  children: [],
                  modelId,
                  isVisible: true,
                });
              });

              // 타입별 그룹 노드 생성
              Object.entries(typeGroups).forEach(([type, items]) => {
                const groupNode: SpatialTreeNode = {
                  id: Date.now() + Math.random() * 1000,
                  expressId: 0,
                  name: `${type} (${items.length})`,
                  type,
                  children: items,
                  modelId,
                  isVisible: true,
                };
                rootNode.children.push(groupNode);
              });
            }
          }

          tree.push(rootNode);
        } catch (error) {
          console.warn('Failed to build tree for model:', modelId, error);

          // 기본 노드만 추가
          tree.push({
            id: Date.now(),
            expressId: 0,
            name: modelId,
            type: 'IfcProject',
            children: [],
            modelId,
            isVisible: true,
          });
        }
      }

      setSpatialTree(tree);
    } catch (error) {
      console.error('Failed to build spatial tree:', error);
    }
  }, [fragmentsRef, setSpatialTree]);

  // 노드 선택
  const selectNode = useCallback(async (node: SpatialTreeNode) => {
    if (!fragmentsRef.current || !highlighterRef.current) return;

    try {
      // 하이라이터로 선택
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fragments = fragmentsRef.current as any;
      const model = fragments.list.get(node.modelId);

      if (model && node.expressId > 0) {
        // 아이템 데이터 가져오기
        const itemsData = await model.getItemsData([node.expressId]);

        if (itemsData.length > 0) {
          const item = itemsData[0];
          setSelectedElements([{
            id: node.expressId,
            type: item.type || node.type,
            name: item.name || node.name,
            properties: item.attributes || {},
          }]);
        }

        // 하이라이트 적용 (highlighter API에 따라 조정 필요)
        // highlighterRef.current.highlightByID('select', node.modelId, [node.expressId]);
      }
    } catch (error) {
      console.warn('Failed to select node:', error);
    }
  }, [fragmentsRef, highlighterRef, setSelectedElements]);

  // 노드 가시성 토글
  const toggleNodeVisibility = useCallback(async (node: SpatialTreeNode) => {
    if (!fragmentsRef.current) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fragments = fragmentsRef.current as any;
      const model = fragments.list.get(node.modelId);

      if (model && node.expressId > 0) {
        // 가시성 토글 (실제 API에 따라 조정 필요)
        // model.setVisibility([node.expressId], !node.isVisible);
      }
    } catch (error) {
      console.warn('Failed to toggle visibility:', error);
    }
  }, [fragmentsRef]);

  // 카메라를 노드로 이동
  const focusOnNode = useCallback(async (node: SpatialTreeNode) => {
    if (!worldRef.current?.camera) return;

    try {
      // 노드에 카메라 포커스 (BoundingBox 계산 필요)
      await worldRef.current.camera.fitToItems();
    } catch (error) {
      console.warn('Failed to focus on node:', error);
    }
  }, [worldRef]);

  // 모델 로드 후 트리 빌드
  useEffect(() => {
    if (!fragmentsRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fragments = fragmentsRef.current as any;

    // 모델이 로드되면 트리 빌드
    const handleModelLoaded = () => {
      buildSpatialTree();
    };

    if (fragments.list?.onItemSet) {
      fragments.list.onItemSet.add(handleModelLoaded);
    }

    // 이미 로드된 모델이 있으면 트리 빌드
    if (fragments.list?.size > 0) {
      buildSpatialTree();
    }

    return () => {
      // cleanup
    };
  }, [fragmentsRef, buildSpatialTree]);

  return {
    spatialTree,
    expandedNodes,
    categoryFilter,
    buildSpatialTree,
    selectNode,
    toggleNodeExpanded,
    toggleNodeVisibility,
    focusOnNode,
    expandAll,
    collapseAll,
    toggleCategory,
  };
}
