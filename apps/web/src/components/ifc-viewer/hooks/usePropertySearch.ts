'use client';

import { useCallback, useState } from 'react';
import { useIfcViewerContext } from '../context/IfcViewerContext';
import { useIfcViewerStore } from '../stores/useIfcViewerStore';
import type { SelectedElement } from '../types';

/**
 * 속성 검색 훅
 *
 * IFC 요소의 속성으로 검색합니다.
 */
export function usePropertySearch() {
  const { fragmentsRef, highlighterRef } = useIfcViewerContext();
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    setSelectedElements,
  } = useIfcViewerStore();

  const [isSearching, setIsSearching] = useState(false);

  // 검색 실행
  const search = useCallback(async (query: string) => {
    if (!query.trim() || !fragmentsRef.current) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fragments = fragmentsRef.current as any;
      const results: SelectedElement[] = [];
      const queryLower = query.toLowerCase();

      // 모든 모델 검색
      for (const [modelId, model] of fragments.list.entries()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const modelData = model as any;

        if (!modelData.getItemsData) continue;

        // 모든 아이템 ID 가져오기
        const allLocalIds = modelData.getAllItemIDs?.() || [];
        if (allLocalIds.length === 0) continue;

        // 배치 처리 (한 번에 100개씩)
        const batchSize = 100;
        for (let i = 0; i < Math.min(allLocalIds.length, 1000); i += batchSize) {
          const batch = allLocalIds.slice(i, i + batchSize);
          const itemsData = await modelData.getItemsData(batch);

          for (const item of itemsData) {
            // 이름으로 검색
            if (item.name?.toLowerCase().includes(queryLower)) {
              results.push({
                id: item.localId ?? 0,
                type: item.type || 'Unknown',
                name: item.name || 'Unnamed',
                properties: item.attributes || {},
              });
              continue;
            }

            // 타입으로 검색
            if (item.type?.toLowerCase().includes(queryLower)) {
              results.push({
                id: item.localId ?? 0,
                type: item.type || 'Unknown',
                name: item.name || 'Unnamed',
                properties: item.attributes || {},
              });
              continue;
            }

            // 속성 값으로 검색
            if (item.attributes) {
              for (const [key, value] of Object.entries(item.attributes)) {
                const valueStr = String(value).toLowerCase();
                if (key.toLowerCase().includes(queryLower) || valueStr.includes(queryLower)) {
                  results.push({
                    id: item.localId ?? 0,
                    type: item.type || 'Unknown',
                    name: item.name || 'Unnamed',
                    properties: item.attributes || {},
                  });
                  break;
                }
              }
            }
          }

          // 최대 결과 제한
          if (results.length >= 50) break;
        }

        if (results.length >= 50) break;
      }

      setSearchResults(results);
    } catch (error) {
      console.warn('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [fragmentsRef, setSearchResults]);

  // 검색 결과 선택
  const selectResult = useCallback((result: SelectedElement) => {
    setSelectedElements([result]);

    // 하이라이트 적용
    // highlighterRef.current?.highlightByID('select', modelId, [result.id]);
  }, [setSelectedElements]);

  // 검색 쿼리 변경
  const handleQueryChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      search(query);
    } else {
      setSearchResults([]);
    }
  }, [setSearchQuery, search, setSearchResults]);

  // 검색 초기화
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, [setSearchQuery, setSearchResults]);

  return {
    searchQuery,
    searchResults,
    isSearching,
    search,
    selectResult,
    handleQueryChange,
    clearSearch,
  };
}
