'use client';

import { useCallback, useEffect } from 'react';
import { useIfcViewerContext } from '../context/IfcViewerContext';
import { useIfcViewerStore } from '../stores/useIfcViewerStore';

interface UseIfcLoaderOptions {
  autoLoadUrl?: string;
  autoLoadFileName?: string;
}

/**
 * IFC 파일 로딩 훅
 *
 * 파일 업로드 및 URL 로딩 기능을 제공합니다.
 */
export function useIfcLoader(options: UseIfcLoaderOptions = {}) {
  const { autoLoadUrl, autoLoadFileName } = options;

  const {
    ifcLoaderRef,
    worldRef,
    fragmentsRef,
  } = useIfcViewerContext();

  const {
    isReady,
    stats,
    setLoadingState,
    setStats,
  } = useIfcViewerStore();

  // URL에서 IFC 로드
  const loadIfcFromUrl = useCallback(async (url: string, fileName: string) => {
    if (!ifcLoaderRef.current || !worldRef.current || !fragmentsRef.current || !isReady) {
      return;
    }

    const startTime = performance.now();

    try {
      setLoadingState({ phase: 'loading', progress: 10, message: '모델 불러오는 중...' });

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const data = new Uint8Array(buffer);
      const fileSizeMB = (buffer.byteLength / (1024 * 1024)).toFixed(2);

      setLoadingState({ phase: 'processing', progress: 30, message: 'IFC 처리 중...' });

      await ifcLoaderRef.current.load(data, true, fileName);

      setLoadingState({ phase: 'processing', progress: 80, message: '렌더링 중...' });

      await new Promise(resolve => setTimeout(resolve, 500));
      await fragmentsRef.current.core.update(true);

      if (worldRef.current?.camera) {
        await worldRef.current.camera.fitToItems();
      }

      const loadTime = Math.round(performance.now() - startTime);

      setStats({
        meshCount: fragmentsRef.current.list.size || 0,
        fileSize: `${fileSizeMB} MB`,
        loadTime,
      });

      setLoadingState({ phase: 'complete', progress: 100, message: '로딩 완료' });

    } catch (error) {
      console.warn('IFC load from URL failed:', error);
      setLoadingState({ phase: 'idle', progress: 0, message: '' });
    }
  }, [isReady, ifcLoaderRef, worldRef, fragmentsRef, setLoadingState, setStats]);

  // 파일에서 IFC 로드
  const loadIfcFromFile = useCallback(async (file: File) => {
    if (!ifcLoaderRef.current || !worldRef.current || !fragmentsRef.current || !isReady) {
      setLoadingState({
        phase: 'error',
        progress: 0,
        message: '뷰어가 아직 초기화되지 않았습니다.',
      });
      return;
    }

    const startTime = performance.now();

    try {
      setLoadingState({ phase: 'loading', progress: 10, message: '파일 읽는 중...' });

      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      const fileSizeMB = (buffer.byteLength / (1024 * 1024)).toFixed(2);
      const fileName = file.name.replace('.ifc', '');

      setLoadingState({ phase: 'processing', progress: 30, message: 'IFC 처리 중...' });

      await ifcLoaderRef.current.load(data, true, fileName);

      setLoadingState({ phase: 'processing', progress: 80, message: '렌더링 중...' });

      await new Promise(resolve => setTimeout(resolve, 500));
      await fragmentsRef.current.core.update(true);

      if (worldRef.current?.camera) {
        await worldRef.current.camera.fitToItems();
      }

      const loadTime = Math.round(performance.now() - startTime);

      setStats({
        meshCount: fragmentsRef.current.list.size || 0,
        fileSize: `${fileSizeMB} MB`,
        loadTime,
      });

      setLoadingState({ phase: 'complete', progress: 100, message: '로딩 완료' });

    } catch (error) {
      console.error('IFC 로드 실패:', error);
      setLoadingState({
        phase: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'IFC 로드 실패',
      });
    }
  }, [isReady, ifcLoaderRef, worldRef, fragmentsRef, setLoadingState, setStats]);

  // 자동 로드
  useEffect(() => {
    if (!isReady || stats || !autoLoadUrl || !autoLoadFileName) return;

    loadIfcFromUrl(autoLoadUrl, autoLoadFileName);
  }, [isReady, stats, autoLoadUrl, autoLoadFileName, loadIfcFromUrl]);

  return {
    loadIfcFromUrl,
    loadIfcFromFile,
  };
}
