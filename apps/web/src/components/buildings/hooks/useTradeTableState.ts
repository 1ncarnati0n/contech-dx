'use client';

import { useState, useEffect, useRef } from 'react';
import type { Building, Floor, FloorTrade } from '@/lib/types';

/**
 * Shared state management for trade table components.
 *
 * Extracts the identical state declarations and building sync effect
 * from FloorTradeTable and DetailedFloorTradeTable.
 */
export function useTradeTableState(building: Building) {
  const [floors, setFloors] = useState<Floor[]>(building.floors);
  const [trades, setTrades] = useState<Map<string, FloorTrade>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalTrades, setOriginalTrades] = useState<Map<string, FloorTrade>>(new Map());
  const pendingSavesRef = useRef<Map<string, FloorTrade>>(new Map());

  // Sync state when building changes
  useEffect(() => {
    setFloors(building.floors);
    const tradesMap = new Map<string, FloorTrade>();
    building.floorTrades.forEach(trade => {
      const key = `${trade.floorId}-${trade.tradeGroup}`;
      tradesMap.set(key, trade);
    });
    setTrades(tradesMap);
    setOriginalTrades(new Map(tradesMap));
    setHasUnsavedChanges(false);
    pendingSavesRef.current = new Map();
  }, [building]);

  // Page unload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '저장하지 않은 변경사항이 있습니다.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return {
    floors,
    setFloors,
    trades,
    setTrades,
    isSaving,
    setIsSaving,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    originalTrades,
    setOriginalTrades,
    pendingSavesRef,
  };
}
