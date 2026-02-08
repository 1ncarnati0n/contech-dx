'use client';

import { useCallback } from 'react';
import type { Building, Floor, FloorTrade, TradeData } from '@/lib/types';
import { saveFloorTrade } from '@/lib/services/buildings';
import { setTradeValueByPath } from '@/lib/utils/tradeDataHelpers';
import { isDummyFloorId, isValidFloorId } from '@/lib/utils/floorIdUtils';
import { logger } from '@/lib/utils/logger';
import { toast } from 'sonner';

interface UseTradeOperationsOptions {
  building: Building;
  floors: Floor[];
  trades: Map<string, FloorTrade>;
  originalTrades: Map<string, FloorTrade>;
  setTrades: React.Dispatch<React.SetStateAction<Map<string, FloorTrade>>>;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setOriginalTrades: React.Dispatch<React.SetStateAction<Map<string, FloorTrade>>>;
  pendingSavesRef: React.MutableRefObject<Map<string, FloorTrade>>;
  onUpdate: () => void;
}

/**
 * Resolves a floor ID to an actual floor ID, handling dummy floors and
 * range-format standard floors (e.g., "2~14F 기준층").
 */
function resolveFloorId(floorId: string, floors: Floor[]): string | null {
  if (isDummyFloorId(floorId)) {
    const floorMatch = floorId.match(/dummy-(\d+)F/);
    if (floorMatch) {
      const floorNum = floorMatch[1];
      const core1Floor = floors.find(f => {
        const match = f.floorLabel.match(/코어1-(\d+)F/);
        return match && match[1] === floorNum;
      });
      if (core1Floor) {
        if (core1Floor.floorLabel.includes('~') && core1Floor.floorClass === '기준층') {
          return `${core1Floor.id}-${floorNum}F`;
        }
        return core1Floor.id;
      }
      return null; // No matching core1 floor
    }
  } else {
    const individualMatch = floorId.match(/^(.+)-(\d+)F$/);
    if (individualMatch) {
      const baseFloorId = individualMatch[1];
      const baseFloor = floors.find(f => f.id === baseFloorId);
      if (baseFloor && baseFloor.floorLabel.includes('~') && baseFloor.floorClass === '기준층') {
        return floorId; // Range standard floor individual — use as-is
      }
    }
  }
  return floorId;
}

/**
 * Shared trade CRUD operations for trade tables.
 *
 * Extracts getTrade, updateTrade, saveChanges, discardChanges logic that
 * is identical between FloorTradeTable and DetailedFloorTradeTable.
 */
export function useTradeOperations({
  building,
  floors,
  trades,
  originalTrades,
  setTrades,
  setHasUnsavedChanges,
  setIsSaving,
  setOriginalTrades,
  pendingSavesRef,
  onUpdate,
}: UseTradeOperationsOptions) {

  const getTrade = useCallback((floorId: string, tradeGroup: string): TradeData => {
    const actualFloorId = resolveFloorId(floorId, floors);
    if (!actualFloorId) return {};

    const key = `${actualFloorId}-${tradeGroup}`;
    const trade = trades.get(key);
    return trade?.trades || {};
  }, [floors, trades]);

  const updateTrade = useCallback((floorId: string, tradeGroup: string, field: string, value: number | null): boolean => {
    if (!floorId || floorId.trim() === '') {
      logger.warn('updateTrade called with empty floorId:', { floorId, tradeGroup, field });
      return false;
    }

    const actualFloorId = resolveFloorId(floorId, floors);
    if (!actualFloorId) return false;

    const key = `${actualFloorId}-${tradeGroup}`;
    const existing = trades.get(key);

    const newTrades: TradeData = { ...(existing?.trades || {}) };
    setTradeValueByPath(newTrades, field, value);

    const updatedTrade: FloorTrade = {
      id: existing?.id || `temp-${Date.now()}`,
      floorId: actualFloorId,
      buildingId: building.id,
      tradeGroup,
      trades: newTrades,
    };

    // Copy data to all individual floors in a range standard floor
    const individualMatch = actualFloorId.match(/^(.+)-(\d+)F$/);
    if (individualMatch) {
      const baseFloorId = individualMatch[1];
      const baseFloor = floors.find(f => f.id === baseFloorId);

      if (baseFloor && baseFloor.floorLabel.includes('~') && baseFloor.floorClass === '기준층') {
        let rangeMatch = baseFloor.floorLabel.match(/코어\d+-(\d+)~(\d+)F 기준층/);
        if (!rangeMatch) {
          rangeMatch = baseFloor.floorLabel.match(/(\d+)~(\d+)F 기준층/);
        }

        if (rangeMatch) {
          const start = parseInt(rangeMatch[1], 10);
          const end = parseInt(rangeMatch[2], 10);

          const tradesToSave: FloorTrade[] = [];

          for (let floorNum = start; floorNum <= end; floorNum++) {
            const individualFloorId = `${baseFloorId}-${floorNum}F`;
            const individualKey = `${individualFloorId}-${tradeGroup}`;

            const existingIndividual = trades.get(individualKey);
            if (!existingIndividual) {
              const individualTrade: FloorTrade = {
                id: `temp-${Date.now()}-${floorNum}`,
                floorId: individualFloorId,
                buildingId: building.id,
                tradeGroup,
                trades: { ...newTrades },
              };

              trades.set(individualKey, individualTrade);
              tradesToSave.push(individualTrade);
            }
          }

          if (tradesToSave.length > 0) {
            tradesToSave.forEach(trade => {
              if (!isDummyFloorId(trade.floorId)) {
                const tradeKey = `${trade.floorId}-${trade.tradeGroup}`;
                pendingSavesRef.current.set(tradeKey, trade);
              }
            });
          }
        }
      }
    }

    const newTradesMap = new Map(trades.set(key, updatedTrade));
    setTrades(newTradesMap);

    if (value !== null) {
      setHasUnsavedChanges(true);
      if (!isDummyFloorId(updatedTrade.floorId)) {
        pendingSavesRef.current.set(key, updatedTrade);
      }
    }

    return true;
  }, [building.id, floors, trades, setTrades, setHasUnsavedChanges, pendingSavesRef]);

  const saveChanges = useCallback(async (): Promise<void> => {
    if (pendingSavesRef.current.size === 0) {
      toast.info('저장할 변경사항이 없습니다.');
      return;
    }

    setIsSaving(true);
    try {
      const tradesToSave = Array.from(pendingSavesRef.current.values())
        .filter(trade => !isDummyFloorId(trade.floorId))
        .filter(trade => isValidFloorId(trade.floorId));

      if (tradesToSave.length > 0) {
        const promises = tradesToSave.map(trade =>
          saveFloorTrade(building.id, building.projectId, {
            floorId: trade.floorId,
            tradeGroup: trade.tradeGroup,
            trades: trade.trades,
          })
        );
        await Promise.all(promises);

        pendingSavesRef.current.clear();
        setOriginalTrades(new Map(trades));
        setHasUnsavedChanges(false);
        toast.success(`${tradesToSave.length}개 항목 저장 완료`);
        await onUpdate();
      }
    } catch (error) {
      logger.error('Save failed:', error);
      toast.error('저장 실패. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  }, [building.id, building.projectId, trades, setIsSaving, setOriginalTrades, setHasUnsavedChanges, pendingSavesRef, onUpdate]);

  const discardChanges = useCallback(() => {
    setTrades(new Map(originalTrades));
    pendingSavesRef.current.clear();
    setHasUnsavedChanges(false);
  }, [originalTrades, setTrades, setHasUnsavedChanges, pendingSavesRef]);

  const flushPendingSaves = useCallback(async (): Promise<void> => {
    await saveChanges();
  }, [saveChanges]);

  return {
    getTrade,
    updateTrade,
    saveChanges,
    discardChanges,
    flushPendingSaves,
  };
}
