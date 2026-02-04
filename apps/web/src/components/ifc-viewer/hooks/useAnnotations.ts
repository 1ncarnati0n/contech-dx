'use client';

import { useCallback, useEffect } from 'react';
import { useIfcViewerStore } from '../stores/useIfcViewerStore';
import {
  loadAnnotations,
  addAnnotationToStorage,
  updateAnnotationInStorage,
  removeAnnotationFromStorage,
  clearAllAnnotations as clearStorage,
} from '../utils/annotationStorage';
import type { Annotation } from '../types';

/**
 * 주석 관리 훅
 *
 * 3D 위치에 주석을 추가하고 관리합니다.
 */
export function useAnnotations() {
  const {
    annotations,
    setAnnotations,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    activeTool,
    setActiveTool,
  } = useIfcViewerStore();

  // LocalStorage에서 주석 로드
  const loadFromStorage = useCallback(() => {
    const stored = loadAnnotations();
    setAnnotations(stored);
  }, [setAnnotations]);

  // 새 주석 추가
  const createAnnotation = useCallback((
    position: { x: number; y: number; z: number },
    text: string,
    options?: {
      title?: string;
      author?: string;
      color?: string;
      modelId?: string;
    }
  ) => {
    const annotation: Annotation = {
      id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position,
      text,
      title: options?.title,
      author: options?.author,
      color: options?.color || '#f59e0b',
      modelId: options?.modelId,
      createdAt: Date.now(),
    };

    addAnnotation(annotation);
    addAnnotationToStorage(annotation);

    return annotation;
  }, [addAnnotation]);

  // 주석 업데이트
  const editAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    updateAnnotation(id, updates);
    updateAnnotationInStorage(id, updates);
  }, [updateAnnotation]);

  // 주석 삭제
  const deleteAnnotation = useCallback((id: string) => {
    removeAnnotation(id);
    removeAnnotationFromStorage(id);
  }, [removeAnnotation]);

  // 모든 주석 삭제
  const clearAllAnnotations = useCallback(() => {
    setAnnotations([]);
    clearStorage();
  }, [setAnnotations]);

  // 주석 모드 시작
  const startAnnotating = useCallback(() => {
    setActiveTool('annotate');
  }, [setActiveTool]);

  // 주석 모드 중지
  const stopAnnotating = useCallback(() => {
    setActiveTool('select');
  }, [setActiveTool]);

  // 초기 로드
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return {
    annotations,
    isAnnotating: activeTool === 'annotate',
    createAnnotation,
    editAnnotation,
    deleteAnnotation,
    clearAllAnnotations,
    startAnnotating,
    stopAnnotating,
    loadFromStorage,
  };
}
