import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { CoreStructure, GridData } from '../types';
import { buildGridData } from './buildGridData';
import { MAX_CORES } from '../constants';

/** 기본 코어 구조 생성 */
function createDefaultCore(id: number): CoreStructure {
  return {
    id,
    unitsLeft: 1,
    unitsRight: 1,
    groundFloors: 15,
    basementFloors: 2,
    rooftopFloors: 1,
    piloti: null,
    scaffolding: null,
  };
}

/** CoreStructure 배열에서 세대 배치 규칙 검증 */
function validateUnits(core: CoreStructure): CoreStructure {
  return core;
}

interface UseStructureDiagramOptions {
  initialCores?: CoreStructure[];
  hasHighCeilingEquipmentRoom?: boolean;
  onChange?: (cores: CoreStructure[]) => void;
}

export function useStructureDiagram({ initialCores, hasHighCeilingEquipmentRoom, onChange }: UseStructureDiagramOptions) {
  const [cores, setCores] = useState<CoreStructure[]>(
    initialCores ?? [createDefaultCore(1)]
  );
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // cores 변경 시 onChange 콜백 호출
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onChangeRef.current?.(cores);
  }, [cores]);

  // 외부에서 initialCores가 변경되면 동기화
  const prevInitialCoresRef = useRef(initialCores);
  useEffect(() => {
    if (
      initialCores &&
      initialCores !== prevInitialCoresRef.current &&
      JSON.stringify(initialCores) !== JSON.stringify(cores)
    ) {
      prevInitialCoresRef.current = initialCores;
      setCores(initialCores);
    }
  }, [initialCores]); // eslint-disable-line react-hooks/exhaustive-deps

  /** 그리드 데이터 (cores 변경 시 자동 재계산) */
  const gridData: GridData = useMemo(
    () => buildGridData(cores, { hasHighCeilingEquipmentRoom }),
    [cores, hasHighCeilingEquipmentRoom],
  );

  /** 코어 개수 변경 */
  const setCoreCount = useCallback((count: number) => {
    const clamped = Math.max(1, Math.min(MAX_CORES, count));
    setCores(prev => {
      if (clamped === prev.length) return prev;
      if (clamped > prev.length) {
        const newCores = [...prev];
        for (let i = prev.length + 1; i <= clamped; i++) {
          newCores.push(createDefaultCore(i));
        }
        return newCores;
      }
      return prev.slice(0, clamped);
    });
  }, []);

  /** 특정 코어 업데이트 */
  const updateCore = useCallback((coreId: number, updates: Partial<CoreStructure>) => {
    setCores(prev => prev.map(c => {
      if (c.id !== coreId) return c;
      const updated = { ...c, ...updates };
      return validateUnits(updated);
    }));
  }, []);

  /** 필로티 토글 */
  const togglePiloti = useCallback((coreId: number, floor: number, unitIndex: number) => {
    setCores(prev => prev.map(c => {
      if (c.id !== coreId) return c;

      if (!c.piloti) {
        return { ...c, piloti: { floor, excludeUnits: [unitIndex] } };
      }

      const excludeUnits = c.piloti.excludeUnits.includes(unitIndex)
        ? c.piloti.excludeUnits.filter(u => u !== unitIndex)
        : [...c.piloti.excludeUnits, unitIndex];

      if (excludeUnits.length === 0) {
        return { ...c, piloti: null };
      }

      return {
        ...c,
        piloti: { floor: c.piloti.floor, excludeUnits },
      };
    }));
  }, []);

  /** 전체 코어 배열 교체 (외부 데이터 로드용) */
  const loadCores = useCallback((newCores: CoreStructure[]) => {
    setCores(newCores);
  }, []);

  return {
    cores,
    gridData,
    setCoreCount,
    updateCore,
    togglePiloti,
    loadCores,
  };
}
