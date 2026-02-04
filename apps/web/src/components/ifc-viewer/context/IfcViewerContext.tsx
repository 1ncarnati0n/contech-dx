'use client';

import { createContext, useContext, useRef, useCallback, type ReactNode, type RefObject } from 'react';
import type { ViewOrientation } from '../types';

// ============================================
// Context 타입 정의
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRef = RefObject<any>;

interface IfcViewerContextValue {
  // Container ref
  containerRef: RefObject<HTMLDivElement | null>;

  // Core refs - @thatopen/components 타입이 복잡하여 any 사용
  componentsRef: AnyRef;
  worldRef: AnyRef;
  threeRef: AnyRef;

  // Feature refs
  ifcLoaderRef: AnyRef;
  fragmentsRef: AnyRef;
  highlighterRef: AnyRef;
  boundingBoxerRef: AnyRef;
  clipperRef: AnyRef;
  lengthMeasurementRef: AnyRef;
  areaMeasurementRef: AnyRef;

  // File input ref
  fileInputRef: RefObject<HTMLInputElement | null>;

  // 초기화 상태
  isInitializedRef: RefObject<boolean>;

  // 유틸리티 함수들
  resetCamera: () => void;
  fitToModel: () => Promise<void>;
  setViewOrientation: (orientation: ViewOrientation) => Promise<void>;
  toggleProjection: () => Promise<'Perspective' | 'Orthographic' | null>;
  clearHighlight: () => void;
}

// ============================================
// Context 생성
// ============================================

const IfcViewerContext = createContext<IfcViewerContextValue | null>(null);

// ============================================
// Provider 컴포넌트
// ============================================

interface IfcViewerProviderProps {
  children: ReactNode;
}

export function IfcViewerProvider({ children }: IfcViewerProviderProps) {
  // Container ref
  const containerRef = useRef<HTMLDivElement>(null);

  // Core refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const componentsRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const worldRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const threeRef = useRef<any>(null);

  // Feature refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ifcLoaderRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fragmentsRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const highlighterRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boundingBoxerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clipperRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lengthMeasurementRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const areaMeasurementRef = useRef<any>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 초기화 상태
  const isInitializedRef = useRef(false);

  // 유틸리티 함수들
  const resetCamera = useCallback(() => {
    if (worldRef.current?.camera?.controls) {
      worldRef.current.camera.controls.reset(true);
    }
  }, []);

  const fitToModel = useCallback(async () => {
    if (worldRef.current?.camera) {
      await worldRef.current.camera.fitToItems();
    }
  }, []);

  const setViewOrientation = useCallback(async (orientation: ViewOrientation) => {
    // hasCameraControls() 대신 controls 직접 확인 - 초기화 타이밍 이슈 방지
    if (!worldRef.current?.camera?.controls || !boundingBoxerRef.current) return;

    try {
      const camera = worldRef.current.camera;
      const { position, target } = await boundingBoxerRef.current.getCameraOrientation(orientation);
      await camera.controls.setLookAt(
        position.x,
        position.y,
        position.z,
        target.x,
        target.y,
        target.z,
        true
      );
    } catch (error) {
      console.warn('View orientation failed:', error);
    }
  }, []);

  const toggleProjection = useCallback(async (): Promise<'Perspective' | 'Orthographic' | null> => {
    if (!worldRef.current?.camera) return null;

    try {
      const camera = worldRef.current.camera;

      // OrthoPerspectiveCamera의 projection API 확인
      if (camera.projection) {
        const currentMode = camera.projection.current ?? 'Perspective';
        const newMode = currentMode === 'Perspective' ? 'Orthographic' : 'Perspective';

        // projection.set()은 동기일 수 있음 - await 유지하되 동기도 처리
        const result = camera.projection.set(newMode);
        if (result instanceof Promise) {
          await result;
        }

        return newMode;
      }
      return null;
    } catch (error) {
      console.warn('Projection toggle failed:', error);
      return null;
    }
  }, []);

  const clearHighlight = useCallback(() => {
    if (highlighterRef.current) {
      highlighterRef.current.clear('select');
    }
  }, []);

  const value: IfcViewerContextValue = {
    containerRef,
    componentsRef,
    worldRef,
    threeRef,
    ifcLoaderRef,
    fragmentsRef,
    highlighterRef,
    boundingBoxerRef,
    clipperRef,
    lengthMeasurementRef,
    areaMeasurementRef,
    fileInputRef,
    isInitializedRef,
    resetCamera,
    fitToModel,
    setViewOrientation,
    toggleProjection,
    clearHighlight,
  };

  return (
    <IfcViewerContext.Provider value={value}>
      {children}
    </IfcViewerContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useIfcViewerContext() {
  const context = useContext(IfcViewerContext);
  if (!context) {
    throw new Error('useIfcViewerContext must be used within IfcViewerProvider');
  }
  return context;
}
