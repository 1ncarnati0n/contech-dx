'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useIfcViewerContext } from '../context/IfcViewerContext';
import { useIfcViewerStore } from '../stores/useIfcViewerStore';
import type { MeasurementResult, MeasurementType } from '../types';

/**
 * 측정 도구 훅
 *
 * 거리, 면적 측정 기능을 제공합니다.
 * @thatopen/components-front의 LengthMeasurement, AreaMeasurement를 사용합니다.
 */
export function useMeasurements() {
  const { componentsRef, worldRef } = useIfcViewerContext();
  const {
    measurements,
    addMeasurement,
    removeMeasurement,
    clearMeasurements,
    activeTool,
    setActiveTool,
  } = useIfcViewerStore();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lengthMeasurementRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const areaMeasurementRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  // 측정 도구 초기화
  const initMeasurements = useCallback(async () => {
    if (!componentsRef.current || !worldRef.current || isInitializedRef.current) return;

    try {
      const OBF = await import('@thatopen/components-front');

      // LengthMeasurement 초기화
      const lengthMeasurement = componentsRef.current.get(OBF.LengthMeasurement);
      lengthMeasurement.world = worldRef.current;
      lengthMeasurement.enabled = false;
      lengthMeasurement.snapEnabled = true;
      lengthMeasurementRef.current = lengthMeasurement;

      // AreaMeasurement 초기화 (사용 가능한 경우)
      if (OBF.AreaMeasurement) {
        const areaMeasurement = componentsRef.current.get(OBF.AreaMeasurement);
        areaMeasurement.world = worldRef.current;
        areaMeasurement.enabled = false;
        areaMeasurementRef.current = areaMeasurement;
      }

      isInitializedRef.current = true;
    } catch (error) {
      console.warn('Failed to initialize measurements:', error);
    }
  }, [componentsRef, worldRef]);

  // 거리 측정 시작
  const startDistanceMeasurement = useCallback(async () => {
    await initMeasurements();

    if (!lengthMeasurementRef.current) return;

    // 다른 측정 비활성화
    if (areaMeasurementRef.current) {
      areaMeasurementRef.current.enabled = false;
    }

    lengthMeasurementRef.current.enabled = true;
    setActiveTool('measure-distance');
  }, [initMeasurements, setActiveTool]);

  // 면적 측정 시작
  const startAreaMeasurement = useCallback(async () => {
    await initMeasurements();

    if (!areaMeasurementRef.current) {
      console.warn('Area measurement not available');
      return;
    }

    // 다른 측정 비활성화
    if (lengthMeasurementRef.current) {
      lengthMeasurementRef.current.enabled = false;
    }

    areaMeasurementRef.current.enabled = true;
    setActiveTool('measure-area');
  }, [initMeasurements, setActiveTool]);

  // 측정 중지
  const stopMeasurement = useCallback(() => {
    if (lengthMeasurementRef.current) {
      lengthMeasurementRef.current.enabled = false;
    }
    if (areaMeasurementRef.current) {
      areaMeasurementRef.current.enabled = false;
    }
    setActiveTool('select');
  }, [setActiveTool]);

  // 마지막 측정 삭제
  const deleteLastMeasurement = useCallback(() => {
    if (lengthMeasurementRef.current && activeTool === 'measure-distance') {
      lengthMeasurementRef.current.delete();
    }
    if (areaMeasurementRef.current && activeTool === 'measure-area') {
      areaMeasurementRef.current.delete();
    }
  }, [activeTool]);

  // 모든 측정 삭제
  const deleteAllMeasurements = useCallback(() => {
    if (lengthMeasurementRef.current) {
      lengthMeasurementRef.current.deleteAll();
    }
    if (areaMeasurementRef.current) {
      areaMeasurementRef.current.deleteAll();
    }
    clearMeasurements();
  }, [clearMeasurements]);

  // 측정 취소
  const cancelMeasurement = useCallback(() => {
    if (lengthMeasurementRef.current) {
      lengthMeasurementRef.current.cancelCreation();
    }
    if (areaMeasurementRef.current) {
      areaMeasurementRef.current.cancelCreation();
    }
  }, []);

  // 측정 결과 저장 (수동 호출)
  const saveMeasurement = useCallback((type: MeasurementType, value: number, unit: string, label?: string) => {
    const result: MeasurementResult = {
      id: `${type}-${Date.now()}`,
      type,
      value,
      unit,
      points: [],
      label,
      timestamp: Date.now(),
    };
    addMeasurement(result);
    return result;
  }, [addMeasurement]);

  // ESC 키로 측정 취소
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeTool === 'measure-distance' || activeTool === 'measure-area') {
          cancelMeasurement();
          stopMeasurement();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, cancelMeasurement, stopMeasurement]);

  return {
    measurements,
    activeTool,
    startDistanceMeasurement,
    startAreaMeasurement,
    stopMeasurement,
    deleteLastMeasurement,
    deleteAllMeasurements,
    cancelMeasurement,
    saveMeasurement,
    removeMeasurement,
    isDistanceMeasuring: activeTool === 'measure-distance',
    isAreaMeasuring: activeTool === 'measure-area',
    isMeasuring: activeTool === 'measure-distance' || activeTool === 'measure-area',
  };
}
