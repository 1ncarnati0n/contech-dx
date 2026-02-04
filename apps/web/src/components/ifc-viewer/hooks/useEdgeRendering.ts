'use client';

import { useCallback, useEffect } from 'react';
import { useIfcViewerContext } from '../context/IfcViewerContext';
import { useIfcViewerStore } from '../stores/useIfcViewerStore';

/**
 * 엣지 렌더링 훅
 *
 * PostproductionRenderer의 outline 효과를 제어합니다.
 * @thatopen/components-front의 PostproductionRenderer는
 * customEffects.outlineEnabled 속성으로 엣지 라인을 토글할 수 있습니다.
 */
export function useEdgeRendering() {
  const { worldRef } = useIfcViewerContext();
  const { edgesEnabled, setEdgesEnabled, toggleEdges } = useIfcViewerStore();

  // 엣지 효과 업데이트
  const updateEdgeEffect = useCallback((enabled: boolean) => {
    if (!worldRef.current?.renderer) return;

    try {
      const renderer = worldRef.current.renderer;
      const pp = renderer.postproduction;

      if (!pp) return;

      // PostproductionRenderer의 customEffects 접근
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const postproduction = pp as any;

      // 방법 1: customEffects 객체의 outlineEnabled
      if (postproduction.customEffects) {
        postproduction.customEffects.outlineEnabled = enabled;
      }

      // 방법 2: postproduction의 outlinesEnabled 속성 시도
      if ('outlinesEnabled' in postproduction) {
        postproduction.outlinesEnabled = enabled;
      }

      // 렌더러 업데이트 트리거 - 효과 변경을 즉시 반영
      if (typeof renderer.update === 'function') {
        renderer.update();
      }
    } catch (error) {
      console.warn('Edge rendering update failed:', error);
    }
  }, [worldRef]);

  // 엣지 토글
  const handleToggleEdges = useCallback(() => {
    const newEnabled = !edgesEnabled;
    setEdgesEnabled(newEnabled);
    updateEdgeEffect(newEnabled);
  }, [edgesEnabled, setEdgesEnabled, updateEdgeEffect]);

  // 엣지 활성화
  const enableEdges = useCallback(() => {
    setEdgesEnabled(true);
    updateEdgeEffect(true);
  }, [setEdgesEnabled, updateEdgeEffect]);

  // 엣지 비활성화
  const disableEdges = useCallback(() => {
    setEdgesEnabled(false);
    updateEdgeEffect(false);
  }, [setEdgesEnabled, updateEdgeEffect]);

  // 초기 상태 동기화
  useEffect(() => {
    if (worldRef.current?.renderer?.postproduction) {
      updateEdgeEffect(edgesEnabled);
    }
  }, [worldRef, edgesEnabled, updateEdgeEffect]);

  return {
    edgesEnabled,
    toggleEdges: handleToggleEdges,
    enableEdges,
    disableEdges,
  };
}
