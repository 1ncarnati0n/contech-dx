'use client';

import { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input } from '@/components/ui';
import { SaveStatusBar } from './SaveStatusBar';
import { ClipboardPaste } from 'lucide-react';
import type { Building, Floor, FloorTrade, TradeData } from '@/lib/types';
import { saveFloorTrade } from '@/lib/services/buildings';
import { setTradeValueByPath, getTradeValue } from '@/lib/utils/tradeDataHelpers';
import {
  TRADE_GROUPS,
  createSpecialFloorId,
  isSpecialFloorId,
  isDummyFloorId,
  isValidFloorId,
} from '@/lib/utils/floorIdUtils';
import { logger } from '@/lib/utils/logger';
import { toast } from 'sonner';

interface Props {
  building: Building;
  onUpdate: () => void;
}

export interface FloorTradeTableHandle {
  flushPendingSaves: () => Promise<void>;
  saveChanges: () => Promise<void>;
  hasUnsavedChanges: () => boolean;
}

export const FloorTradeTable = forwardRef<FloorTradeTableHandle, Props>(
  ({ building, onUpdate }, ref) => {
  const [floors, setFloors] = useState<Floor[]>(building.floors);
  const [trades, setTrades] = useState<Map<string, FloorTrade>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalTrades, setOriginalTrades] = useState<Map<string, FloorTrade>>(new Map());
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [recentlyPastedCells, setRecentlyPastedCells] = useState<Set<string>>(new Set());
  const isDraggingTextRef = useRef(false);
  const selectionStartRef = useRef<{ row: number; col: number } | null>(null);
  const pendingSavesRef = useRef<Map<string, FloorTrade>>(new Map()); // 저장 대기 중인 trade 객체들

  useEffect(() => {
    setFloors(building.floors);
    const tradesMap = new Map<string, FloorTrade>();
    building.floorTrades.forEach(trade => {
      const key = `${trade.floorId}-${trade.tradeGroup}`;
      tradesMap.set(key, trade);
    });
    setTrades(tradesMap);
    // 원본 데이터 저장 (취소 기능용)
    setOriginalTrades(new Map(tradesMap));
    setHasUnsavedChanges(false);
    // 층이 변경되면 선택 초기화
    setSelectedCells(new Set());
    setSelectionStart(null);
    selectionStartRef.current = null;
    setIsDragging(false);
    setIsDraggingText(false);
    isDraggingTextRef.current = false;
    // pendingSavesRef도 초기화
    pendingSavesRef.current = new Map();
  }, [building]);

  // 페이지 이탈 경고
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

  // 행 생성: 버림, 기초, 각 층, 소계
  const rows = useMemo(() => {
    const result: Array<{ type: 'group' | 'floor' | 'summary'; label: string; floor?: Floor; tradeGroup?: string }> = [];
    
    // 버림, 기초 행 추가
    TRADE_GROUPS.slice(0, 2).forEach(group => {
      result.push({ type: 'group', label: group, tradeGroup: group });
    });

    // 코어가 2개 이상이고 코어별 층수가 있으면 코어1의 최대 층수를 기준으로 표 작성
    const coreCount = building.meta.coreCount;
    const coreGroundFloors = building.meta.floorCount.coreGroundFloors;
    
    if (coreCount > 1 && coreGroundFloors && coreGroundFloors.length > 0) {
      // 코어1의 최대 층수 - 실제 층 데이터에서도 확인
      let core1MaxFloor = coreGroundFloors[0] || 0;
      
      // 실제 층 데이터에서 코어1의 최대 층수 확인
      const core1Floors = floors.filter(f => {
        const match = f.floorLabel.match(/코어1-(\d+)F/);
        if (match) {
          return true;
        }
        const rangeMatch = f.floorLabel.match(/코어1-(\d+)~(\d+)F 기준층/);
        if (rangeMatch) {
          return true;
        }
        return false;
      });
      
      core1Floors.forEach(floor => {
        // 개별 층 (예: "코어1-13F")
        const match = floor.floorLabel.match(/코어1-(\d+)F$/);
        if (match) {
          const floorNum = parseInt(match[1], 10);
          if (floorNum > core1MaxFloor) {
            core1MaxFloor = floorNum;
          }
        }
        // 범위 형식 (예: "코어1-2~14F 기준층")
        const rangeMatch = floor.floorLabel.match(/코어1-(\d+)~(\d+)F 기준층/);
        if (rangeMatch) {
          const end = parseInt(rangeMatch[2], 10);
          if (end > core1MaxFloor) {
            core1MaxFloor = end;
          }
        }
      });
      
      // 지하층 추가 (공통) - 중복 제거
      const basementFloors = floors.filter(f => f.levelType === '지하');
      const addedLabels = new Set<string>();
      basementFloors.forEach(floor => {
        // 코어 정보 제거 (예: "코어1-B1" -> "B1")
        let cleanLabel = floor.floorLabel.replace(/코어\d+-/, '');
        
        // 이미 추가된 cleanLabel이면 건너뛰기
        if (addedLabels.has(cleanLabel)) {
          return;
        }
        addedLabels.add(cleanLabel);
        
        result.push({ type: 'floor', label: cleanLabel, floor });
      });
      
      // 코어1의 지상층 기준으로 행 추가 (1F, 2F, ...)
      for (let i = 1; i <= core1MaxFloor; i++) {
        // 코어1의 해당 층 찾기
        let foundFloor = floors.find(f => {
          // 개별 층 (예: "코어1-1F", "코어1-14F")
          const match = f.floorLabel.match(/코어1-(\d+)F$/);
          if (match && parseInt(match[1], 10) === i) {
            return true;
          }
          // 범위 형식의 기준층 (예: "코어1-2~14F 기준층")
          const rangeMatch = f.floorLabel.match(/코어1-(\d+)~(\d+)F 기준층/);
          if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10);
            const end = parseInt(rangeMatch[2], 10);
            return i >= start && i <= end;
          }
          return false;
        });
        
        if (foundFloor) {
          // 범위 형식인 경우 개별 층으로 변환
          if (foundFloor.floorLabel.includes('~') && foundFloor.floorClass === '기준층') {
            result.push({
              type: 'floor',
              label: `${i}F`,
              floor: {
                ...foundFloor,
                id: `${foundFloor.id}-${i}F`,
                floorLabel: `${i}F`,
                floorNumber: i,
              }
            });
          } else {
            result.push({ type: 'floor', label: `${i}F`, floor: foundFloor });
          }
        } else {
          // 코어1에 해당 층이 없으면 더미 층 생성 (표시용)
          result.push({ 
            type: 'floor', 
            label: `${i}F`, 
            floor: {
              id: `dummy-${i}F`,
              buildingId: building.id,
              floorLabel: `${i}F`,
              floorNumber: i,
              levelType: '지상',
              floorClass: i === 1 ? '셋팅층' : (i === core1MaxFloor ? '최상층' : '기준층'),
              height: null,
            } as Floor
          });
        }
      }
      
      // 옥탑층 추가 (공통)
      const phFloors = floors.filter(f => f.floorClass === '옥탑층');
      phFloors.forEach(floor => {
        // PH1 -> 옥탑1, PH2 -> 옥탑2 형식으로 변환
        let label = floor.floorLabel.replace(/코어\d+-/, ''); // 코어 정보 제거
        const phMatch = label.match(/^PH(\d+)/i);
        if (phMatch) {
          label = `옥탑${phMatch[1]}`;
        }
        result.push({ type: 'floor', label, floor });
      });
    } else {
      // 코어가 1개이거나 코어별 층수가 없으면 전체 지상층 수로 처리
      let groundFloorCount = building.meta.floorCount.ground || 0;
      
      // 실제 층 데이터에서 최대 층수 확인
      const groundFloors = floors.filter(f => f.levelType === '지상');
      groundFloors.forEach(floor => {
        // 개별 층 (예: "13F")
        const match = floor.floorLabel.match(/^(\d+)F$/);
        if (match) {
          const floorNum = parseInt(match[1], 10);
          if (floorNum > groundFloorCount) {
            groundFloorCount = floorNum;
          }
        }
        // 범위 형식 (예: "2~14F 기준층")
        const rangeMatch = floor.floorLabel.match(/(\d+)~(\d+)F 기준층/);
        if (rangeMatch) {
          const end = parseInt(rangeMatch[2], 10);
          if (end > groundFloorCount) {
            groundFloorCount = end;
          }
        }
      });
      
      // 지하층 추가 - 중복 제거
      const basementFloors = floors.filter(f => f.levelType === '지하');
      const addedLabels = new Set<string>();
      basementFloors.forEach(floor => {
        // 코어 정보 제거 (예: "코어1-B1" -> "B1")
        let cleanLabel = floor.floorLabel.replace(/코어\d+-/, '');
        
        // 이미 추가된 cleanLabel이면 건너뛰기
        if (addedLabels.has(cleanLabel)) {
          return;
        }
        addedLabels.add(cleanLabel);
        
        result.push({ type: 'floor', label: cleanLabel, floor });
      });
      
      // 지상층 추가: 범위 형식의 기준층을 개별 층으로 확장
      for (let i = 1; i <= groundFloorCount; i++) {
        // 해당 층 찾기
        let foundFloor = floors.find(f => {
          // 개별 층 (예: "1F", "14F")
          if (f.floorLabel === `${i}F`) {
            return true;
          }
          // 범위 형식의 기준층 (예: "2~14F 기준층")
          const rangeMatch = f.floorLabel.match(/(\d+)~(\d+)F 기준층/);
          if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10);
            const end = parseInt(rangeMatch[2], 10);
            return i >= start && i <= end;
          }
          return false;
        });
        
        if (foundFloor) {
          // 범위 형식인 경우 개별 층으로 변환
          if (foundFloor.floorLabel.includes('~') && foundFloor.floorClass === '기준층') {
            result.push({
              type: 'floor',
              label: `${i}F`,
              floor: {
                ...foundFloor,
                id: `${foundFloor.id}-${i}F`,
                floorLabel: `${i}F`,
                floorNumber: i,
              }
            });
          } else {
            result.push({ type: 'floor', label: `${i}F`, floor: foundFloor });
          }
        } else {
          // 층이 없으면 더미 층 생성 (표시용)
          result.push({
            type: 'floor',
            label: `${i}F`,
            floor: {
              id: `dummy-${i}F`,
              buildingId: building.id,
              floorLabel: `${i}F`,
              floorNumber: i,
              levelType: '지상',
              floorClass: i === 1 ? '셋팅층' : (i === groundFloorCount ? '최상층' : '기준층'),
              height: null,
            } as Floor
          });
        }
      }
      
      // 옥탑층 추가
      const phFloors = floors.filter(f => f.floorClass === '옥탑층');
      phFloors.forEach(floor => {
        // PH1 -> 옥탑1, PH2 -> 옥탑2 형식으로 변환
        let label = floor.floorLabel.replace(/코어\d+-/, ''); // 코어 정보 제거
        const phMatch = label.match(/^PH(\d+)/i);
        if (phMatch) {
          label = `옥탑${phMatch[1]}`;
        }
        result.push({ type: 'floor', label, floor });
      });
    }

    // 소계 행
    result.push({ type: 'summary', label: '소계' });

    return result;
  }, [floors, building]);

  // 셀 선택 처리
  const handleCellSelect = (rowIndex: number, colIndex: number, isMultiSelect: boolean) => {
    // 형틀 열(colIndex 2), 해체/정리 열(colIndex 6)은 읽기 전용이므로 선택 불가
    if (colIndex === 2 || colIndex === 6) return;
    
    const cellKey = `${rowIndex}-${colIndex}`;
    
    if (isMultiSelect && selectionStart) {
      // 범위 선택
      const minRow = Math.min(selectionStart.row, rowIndex);
      const maxRow = Math.max(selectionStart.row, rowIndex);
      const minCol = Math.min(selectionStart.col, colIndex);
      const maxCol = Math.max(selectionStart.col, colIndex);
      
      const newSelection = new Set<string>();
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          // 형틀 열, 해체/정리 열은 제외
          if (c !== 2 && c !== 6) {
            newSelection.add(`${r}-${c}`);
          }
        }
      }
      setSelectedCells(newSelection);
    } else {
      // 단일 선택
      setSelectionStart({ row: rowIndex, col: colIndex });
      setSelectedCells(new Set([cellKey]));
    }
  };

  // 드래그 시작
  const handleDragStart = useCallback((rowIndex: number, colIndex: number) => {
    // 텍스트 선택 드래그 중이면 셀 선택 드래그 시작 안 함
    if (isDraggingTextRef.current) {
      return;
    }
    const start = { row: rowIndex, col: colIndex };
    setIsDragging(true);
    setSelectionStart(start);
    selectionStartRef.current = start;
    setSelectedCells(new Set([`${rowIndex}-${colIndex}`]));
  }, [isDraggingText]);

  // 드래그 중
  const handleDragMove = useCallback((rowIndex: number, colIndex: number) => {
    const start = selectionStartRef.current;
    if (!start) return;
    
    const minRow = Math.min(start.row, rowIndex);
    const maxRow = Math.max(start.row, rowIndex);
    const minCol = Math.min(start.col, colIndex);
    const maxCol = Math.max(start.col, colIndex);
    
    const newSelection = new Set<string>();
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        // 구분/층 컬럼은 제외 (데이터 컬럼만 선택)
        // 형틀 열(colIndex 2), 해체/정리 열(colIndex 6)은 읽기 전용이므로 제외
        if (c >= 2 && c !== 2 && c !== 6) {
          newSelection.add(`${r}-${c}`);
        }
      }
    }
    setSelectedCells(newSelection);
  }, []);

  // 드래그 종료
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    selectionStartRef.current = null;
  }, []);

  // 텍스트 선택 드래그 핸들러
  const handleTextDragStart = useCallback(() => {
    isDraggingTextRef.current = true;
    setIsDraggingText(true);
    // 셀 선택 드래그 중이면 중단
    if (isDragging) {
      handleDragEnd();
    }
  }, [isDragging, handleDragEnd]);
  
  const handleTextDragEnd = useCallback(() => {
    isDraggingTextRef.current = false;
    setIsDraggingText(false);
  }, []);

  // 마우스 이벤트 처리 (드래그 선택)
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !selectionStartRef.current) return;
      
      // input 필드 내부에서 드래그할 때는 텍스트 선택을 허용 (셀 선택 드래그 무시)
      const target = e.target as HTMLElement;
      
      // input 필드 내부이면 셀 선택 드래그를 중단하고 텍스트 선택 허용
      if (target.tagName === 'INPUT' || target.closest('input')) {
        handleDragEnd();
        return;
      }
      
      // input 필드가 활성화되어 있거나 포커스되어 있으면 셀 선택 드래그 중단
      const activeEl = document.activeElement;
      if (activeEl?.tagName === 'INPUT' && (activeEl as HTMLInputElement).selectionStart !== null) {
        // input 필드에서 텍스트 선택 중이면 셀 선택 드래그 중단
        handleDragEnd();
        return;
      }
      
      // 마우스 위치에서 셀 찾기
      const cell = target.closest('td');
      if (!cell) return;
      
      const input = cell.querySelector('input[data-row-index][data-col-index]');
      if (!input) return;
      
      // input의 data 속성에서 rowIndex와 colIndex 가져오기
      const rowIndex = input.getAttribute('data-row-index');
      const colIndex = input.getAttribute('data-col-index');
      
      if (rowIndex !== null && colIndex !== null) {
        const row = Number(rowIndex);
        const col = Number(colIndex);
        // 데이터 컬럼만 선택 (구분/층 컬럼 제외, 형틀 열, 해체/정리 열은 읽기 전용이므로 제외)
        if (col >= 2 && col !== 2 && col !== 6) {
          handleDragMove(row, col);
        }
      }
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Delete/Backspace 키로 선택된 셀들 지우기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 단일 셀 선택 + input 포커스 시에는 일반 편집 허용
      // 여러 셀 선택 시에는 블록 삭제 우선
      const isInputFocused = document.activeElement?.tagName === 'INPUT';
      if (isInputFocused && selectedCells.size <= 1) {
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCells.size > 0) {
        // input에 포커스가 있으면 blur 처리
        if (isInputFocused) {
          (document.activeElement as HTMLInputElement)?.blur();
        }
        e.preventDefault();
        // 선택된 셀들의 데이터 지우기
        selectedCells.forEach(cellKey => {
          const [rowIdx, colIdx] = cellKey.split('-').map(Number);
          if (rowIdx >= 0 && rowIdx < rows.length) {
            const rowInfo = rows[rowIdx];
            if (rowInfo && rowInfo.type !== 'summary') {
              const tradeGroup = rowInfo.tradeGroup || '아파트';
              const floorId = rowInfo.floor?.id || (rowInfo.type === 'group' ? createSpecialFloorId(building.id, tradeGroup) : '');
              if (floorId) {
                const fieldPath = getColumnFieldPath(colIdx);
                if (fieldPath) {
                  updateTrade(floorId, tradeGroup, fieldPath, null);
                }
              }
            }
          }
        });
        setSelectedCells(new Set());
        setSelectionStart(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCells, rows]);

  const getTrade = (floorId: string, tradeGroup: string): TradeData => {
    // 더미 층인 경우 코어1의 실제 층 찾기
    let actualFloorId = floorId;
    if (isDummyFloorId(floorId)) {
      const floorMatch = floorId.match(/dummy-(\d+)F/);
      if (floorMatch) {
        const floorNum = floorMatch[1];
        const core1Floor = floors.find(f => {
          const match = f.floorLabel.match(/코어1-(\d+)F/);
          return match && match[1] === floorNum;
        });
        if (core1Floor) {
          // 범위 형식 기준층인 경우 개별 층 ID 생성
          if (core1Floor.floorLabel.includes('~') && core1Floor.floorClass === '기준층') {
            actualFloorId = `${core1Floor.id}-${floorNum}F`;
          } else {
            actualFloorId = core1Floor.id;
          }
        }
      }
    } else {
      // 범위 형식 기준층의 개별 층 ID인지 확인 (예: "floor-123-2F")
      const individualMatch = floorId.match(/^(.+)-(\d+)F$/);
      if (individualMatch) {
        const baseFloorId = individualMatch[1];
        const floorNum = individualMatch[2];
        const baseFloor = floors.find(f => f.id === baseFloorId);
        if (baseFloor && baseFloor.floorLabel.includes('~') && baseFloor.floorClass === '기준층') {
          // 범위 형식 기준층의 개별 층이므로 그대로 사용
          actualFloorId = floorId;
        } else {
          // 개별 층 ID가 아니면 원본 사용
          actualFloorId = floorId;
        }
      }
    }
    
    const key = `${actualFloorId}-${tradeGroup}`;
    const trade = trades.get(key);
    return trade?.trades || {};
  };

  const updateTrade = (floorId: string, tradeGroup: string, field: string, value: number | null): boolean => {
    // floorId가 비어있으면 저장하지 않음
    if (!floorId || floorId.trim() === '') {
      logger.warn('updateTrade called with empty floorId:', { floorId, tradeGroup, field });
      return false;
    }

    // 더미 층인 경우 코어1의 실제 층 찾기
    let actualFloorId = floorId;
    if (isDummyFloorId(floorId)) {
      const floorMatch = floorId.match(/dummy-(\d+)F/);
      if (floorMatch) {
        const floorNum = floorMatch[1];
        const core1Floor = floors.find(f => {
          const match = f.floorLabel.match(/코어1-(\d+)F/);
          return match && match[1] === floorNum;
        });
        if (core1Floor) {
          // 범위 형식 기준층인 경우 개별 층 ID 생성
          if (core1Floor.floorLabel.includes('~') && core1Floor.floorClass === '기준층') {
            actualFloorId = `${core1Floor.id}-${floorNum}F`;
          } else {
            actualFloorId = core1Floor.id;
          }
        } else {
          // 코어1에 해당 층이 없으면 저장하지 않음
          return false;
        }
      }
    } else {
      // 범위 형식 기준층의 개별 층 ID인지 확인 (예: "floor-123-2F")
      const individualMatch = floorId.match(/^(.+)-(\d+)F$/);
      if (individualMatch) {
        const baseFloorId = individualMatch[1];
        const floorNum = individualMatch[2];
        const baseFloor = floors.find(f => f.id === baseFloorId);
        if (baseFloor && baseFloor.floorLabel.includes('~') && baseFloor.floorClass === '기준층') {
          // 범위 형식 기준층의 개별 층이므로 그대로 사용
          actualFloorId = floorId;
        }
        // 개별 층 ID가 아니면 원본 사용 (이미 actualFloorId = floorId)
      }
    }
    
    const key = `${actualFloorId}-${tradeGroup}`;
    const existing = trades.get(key);
    
    const newTrades: TradeData = { ...(existing?.trades || {}) };

    // 중첩된 필드 처리 (예: "gangForm.areaM2")
    // 타입 안전한 헬퍼 함수 사용
    setTradeValueByPath(newTrades, field, value);

    const updatedTrade: FloorTrade = {
      id: existing?.id || `temp-${Date.now()}`,
      floorId: actualFloorId,
      buildingId: building.id,
      tradeGroup,
      trades: newTrades,
    };

    // 범위 형식 기준층의 개별 층 ID인 경우, 범위의 모든 개별 층에 데이터 복사
    const individualMatch = actualFloorId.match(/^(.+)-(\d+)F$/);
    if (individualMatch) {
      const baseFloorId = individualMatch[1];
      const baseFloor = floors.find(f => f.id === baseFloorId);
      
      if (baseFloor && baseFloor.floorLabel.includes('~') && baseFloor.floorClass === '기준층') {
        // 범위 파싱 (예: "코어1-2~14F 기준층" 또는 "2~14F 기준층")
        let rangeMatch = baseFloor.floorLabel.match(/코어\d+-(\d+)~(\d+)F 기준층/);
        if (!rangeMatch) {
          rangeMatch = baseFloor.floorLabel.match(/(\d+)~(\d+)F 기준층/);
        }
        
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1], 10);
          const end = parseInt(rangeMatch[2], 10);
          
          // 범위의 모든 개별 층에 데이터 복사
          const tradesToSave: FloorTrade[] = [];
          
          for (let floorNum = start; floorNum <= end; floorNum++) {
            const individualFloorId = `${baseFloorId}-${floorNum}F`;
            const individualKey = `${individualFloorId}-${tradeGroup}`;
            
            // 이미 개별 층 데이터가 있는지 확인
            const existingIndividual = trades.get(individualKey);
            if (!existingIndividual) {
              // 개별 층 데이터가 없으면 범위 기준층 데이터를 복사
              const individualTrade: FloorTrade = {
                id: `temp-${Date.now()}-${floorNum}`,
                floorId: individualFloorId,
                buildingId: building.id,
                tradeGroup,
                trades: { ...newTrades },
              };
              
              const newTradesMap = new Map(trades.set(individualKey, individualTrade));
              setTrades(newTradesMap);
              tradesToSave.push(individualTrade);
            }
          }
          
          // 개별 층 데이터를 pendingSaves에 추가 (실제 저장은 saveChanges에서)
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

    // null 값이 아닐 때만 저장 대기 목록에 추가 (빈 셀은 저장하지 않음)
    if (value !== null) {
      setHasUnsavedChanges(true);
      if (!isDummyFloorId(updatedTrade.floorId)) {
        pendingSavesRef.current.set(key, updatedTrade);
      }
    }

    return true;
  };

  // 명시적 저장 함수
  const saveChanges = async (): Promise<void> => {
    if (pendingSavesRef.current.size === 0) {
      toast.info('저장할 변경사항이 없습니다.');
      return;
    }

    setIsSaving(true);
    try {
      // UUID 형식 검증 정규식
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
  };

  // 변경사항 취소 함수
  const discardChanges = () => {
    if (confirm('변경사항을 취소하시겠습니까?')) {
      setTrades(new Map(originalTrades));
      pendingSavesRef.current.clear();
      setHasUnsavedChanges(false);
    }
  };

  // 저장 완료를 보장하는 함수 (층 재생성 전 호출)
  const flushPendingSaves = async (): Promise<void> => {
    await saveChanges();
  };

  // useImperativeHandle로 함수 노출
  useImperativeHandle(ref, () => ({
    flushPendingSaves,
    saveChanges,
    hasUnsavedChanges: () => hasUnsavedChanges,
  }));

  // 형틀 합계 계산 함수
  const calculateFormworkTotal = (trade: TradeData): number => {
    const gangForm = trade.gangForm?.areaM2 || 0;
    const alForm = trade.alForm?.areaM2 || 0;
    const euroForm = trade.euroForm?.areaM2 || 0;
    return gangForm + alForm + euroForm;
  };

  // 소계 계산
  const calculateSummary = (field: string): number => {
    let sum = 0;
    trades.forEach(trade => {
      const [category, subField] = field.split('.');
      if (subField) {
        const value = getTradeValue(trade.trades, category, subField);
        if (value) {
          sum += value;
        }
      }
    });
    return sum;
  };

  // 컬럼 매핑: 컬럼 인덱스 → fieldPath
  const getColumnFieldPath = (colIndex: number): string | null => {
    // 0: 구분, 1: 층은 건너뛰기
    if (colIndex < 2) return null;
    
    const dataColIndex = colIndex - 2; // 데이터 컬럼 인덱스 (0부터 시작)
    
    // 형틀 (0) - 합계, 읽기 전용이므로 null 반환
    if (dataColIndex === 0) {
      return null;
    }
    // 갱폼 (1)
    if (dataColIndex === 1) {
      return 'gangForm.areaM2';
    }
    // 알폼 (2)
    if (dataColIndex === 2) {
      return 'alForm.areaM2';
    }
    // 유로폼 (3)
    if (dataColIndex === 3) {
      return 'euroForm.areaM2';
    }
    // 해체/정리 (4) - 유로폼 * 2로 자동 계산되므로 읽기 전용, null 반환
    if (dataColIndex === 4) {
      return null;
    }
    // 철근 (5)
    if (dataColIndex === 5) {
      return 'rebar.ton';
    }
    // 콘크리트 (6)
    if (dataColIndex === 6) {
      return 'concrete.volumeM3';
    }
    
    return null;
  };

  // 엑셀 붙여넣기 핸들러
  const handlePaste = (e: React.ClipboardEvent, startRowIndex: number, startColIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    const clipboardData = e.clipboardData.getData('text/plain');
    if (!clipboardData || !clipboardData.trim()) return;

    // 탭과 줄바꿈으로 파싱
    // 줄바꿈 문자 정규화 (CRLF -> LF, CR -> LF)
    const normalizedData = clipboardData.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 줄바꿈으로 분리 (trim 하기 전에 분리하여 각 행의 데이터 보존)
    const rawRows = normalizedData.split('\n');

    // 각 행을 처리하고 완전히 빈 행은 제거
    const validRows = rawRows
      .map(row => {
        // 각 행의 앞뒤 공백 제거
        const trimmedRow = row.trim();
        // 탭으로 분리하되, 빈 셀도 유지
        const cells = trimmedRow.split('\t');
      // 빈 문자열도 빈 셀로 인식하도록 처리
      return cells.map(cell => cell || '');
      })
      .filter(row => {
        // 완전히 빈 행 제거 (행 자체가 빈 문자열이거나, 모든 셀이 빈 문자열인 경우)
        return row.length > 0 && row.some(cell => cell.trim() !== '');
    });

    if (validRows.length === 0) return;

    try {
      let updateCount = 0;
      const pastedCellKeys = new Set<string>();

      // 각 셀의 데이터를 업데이트
      validRows.forEach((pastedRow, rowOffset) => {
        const actualRowIndex = startRowIndex + rowOffset;

        // 실제 테이블의 행 정보 가져오기 (rows는 useMemo로 정의된 컴포넌트 변수)
        if (actualRowIndex >= rows.length) return;

        const rowInfo = rows[actualRowIndex];
        if (!rowInfo || rowInfo.type === 'summary') return; // 소계 행은 건너뛰기

        const tradeGroup = rowInfo.tradeGroup || '아파트';
        const floorId = rowInfo.floor?.id || (rowInfo.type === 'group' ? createSpecialFloorId(building.id, tradeGroup) : '');

        if (!floorId) return;

        // 각 컬럼 처리 (colOffset은 0부터 시작하므로 첫 번째 셀도 포함)
        pastedRow.forEach((cellValue, colOffset) => {
          const actualColIndex = startColIndex + colOffset;
          const fieldPath = getColumnFieldPath(actualColIndex);
          // fieldPath가 null이면 구분/층 컬럼이므로 건너뛰기
          if (!fieldPath) {
            return;
          }

          // 빈 셀 체크 (공백, 탭, 빈 문자열 모두 빈 셀로 처리)
          const trimmedValue = (cellValue || '').trim();

          // 빈 셀인 경우 저장하지 않고 건너뜀
          if (!trimmedValue || trimmedValue === '') {
            return;
          }

          // 숫자로 변환 (천단위 구분자 제거, 공백 제거)
          const cleanedValue = trimmedValue.replace(/,/g, '').replace(/\s/g, '');
          const numValue = parseFloat(cleanedValue);

          // 유효한 숫자인 경우 업데이트, 그렇지 않으면 null (빈칸)
          if (!isNaN(numValue) && isFinite(numValue)) {
            // 첫 번째 셀 포함 모든 셀 처리 (colOffset === 0도 포함)
            if (updateTrade(floorId, tradeGroup, fieldPath, numValue)) {
              updateCount++;
              pastedCellKeys.add(`${actualRowIndex}-${actualColIndex}`);
            }
          } else {
            // 숫자가 아닌 경우 null로 설정 (빈칸)
            if (updateTrade(floorId, tradeGroup, fieldPath, null)) {
              updateCount++;
              pastedCellKeys.add(`${actualRowIndex}-${actualColIndex}`);
            }
          }
        });
      });

      if (updateCount > 0) {
        toast.success(`${updateCount}개의 셀이 업데이트되었습니다.`);
        // 붙여넣기된 셀 하이라이트 표시
        setRecentlyPastedCells(pastedCellKeys);
        // 1.5초 후 하이라이트 제거
        setTimeout(() => {
          setRecentlyPastedCells(new Set());
        }, 1500);
      }
    } catch (error) {
      toast.error('붙여넣기에 실패했습니다.');
      logger.error('Paste error:', error);
    }
  };

  if (floors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>층별 물량 입력</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            층 설정에서 층 정보를 입력해주세요.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {/* 산식 노트 - 헤더 위에 위치 */}
      <div className="mx-4 mt-4 mb-0 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs text-slate-600 dark:text-slate-400">
        <p className="font-medium mb-1">※ 산식 안내</p>
        <ul className="space-y-0.5 ml-3">
          <li>• 형틀 합계 = 갱폼(M²) + 알폼(M²) + 유로폼(M²)</li>
          <li>• 해체/정리 = 유로폼(M²) × 2</li>
        </ul>
      </div>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>층별 물량 입력</CardTitle>
          <SaveStatusBar
            hasUnsavedChanges={hasUnsavedChanges}
            isSaving={isSaving}
            onSave={saveChanges}
            onDiscard={discardChanges}
          />
        </div>
      </CardHeader>
      {/* 붙여넣기 안내 배너 */}
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300 border-b border-blue-100 dark:border-blue-800">
        <ClipboardPaste className="w-4 h-4 flex-shrink-0" />
        <span>Excel에서 복사한 데이터를 셀에 붙여넣기(Ctrl+V)할 수 있습니다. 여러 셀을 한 번에 붙여넣기 가능합니다.</span>
      </div>
      <CardContent className="p-0">
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse text-xs table-fixed min-w-full">
              {/* 헤더 1단계 */}
              <thead className="sticky top-0 z-10 bg-white dark:bg-slate-950">
                <tr className="border-b-2 border-slate-300 dark:border-slate-700">
                  <th rowSpan={2} className="px-1 py-1 text-center text-xs font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 w-16">
                    구분
                  </th>
                  <th rowSpan={2} className="px-1 py-1 text-center text-xs font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 w-16">
                    층
                  </th>
                  <th colSpan={4} className="px-1 py-1 text-center text-xs font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                    형틀
                  </th>
                  <th className="px-1 py-1 text-center text-xs font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                    해체/정리
                  </th>
                  <th className="px-1 py-1 text-center text-xs font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                    철근
                  </th>
                  <th className="px-1 py-1 text-center text-xs font-semibold leading-tight text-slate-900 dark:text-white bg-white dark:bg-slate-950">
                    콘크리트
                  </th>
                </tr>
                {/* 헤더 2단계 */}
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  {/* 형틀 합계 */}
                  <th className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16">
                    합계(M²)
                  </th>
                  {/* 갱폼 */}
                  <th className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-16">
                    갱폼(M²)
                  </th>
                  {/* 알폼 */}
                  <th className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-16">
                    알폼(M²)
                  </th>
                  {/* 유로폼 */}
                  <th className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-16">
                    유로폼(M²)
                  </th>
                  {/* 해체/정리 */}
                  <th className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-16">
                    M²
                  </th>
                  {/* 철근 */}
                  <th className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-16">
                    TON
                  </th>
                  {/* 콘크리트 */}
                  <th className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 w-16">
                    M³
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => {
                  if (row.type === 'summary') {
                    return (
                      <tr
                        key="summary"
                        className="bg-slate-100 dark:bg-slate-800 font-semibold border-t-2 border-slate-300 dark:border-slate-700"
                        style={{ height: '28px' }}
                      >
                        <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">소계</td>
                        <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">합계</td>
                        {/* 형틀 합계 */}
                        <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16">
                          {(() => {
                            const gangFormSum = calculateSummary('gangForm.areaM2');
                            const alFormSum = calculateSummary('alForm.areaM2');
                            const euroFormSum = calculateSummary('euroForm.areaM2');
                            const val = gangFormSum + alFormSum + euroFormSum;
                            return val === 0 ? '-' : val.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          })()}
                        </td>
                        {/* 갱폼 */}
                        <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">
                          {(() => {
                            const val = calculateSummary('gangForm.areaM2');
                            return val === 0 ? '-' : val.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          })()}
                        </td>
                        {/* 알폼 */}
                        <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">
                          {(() => {
                            const val = calculateSummary('alForm.areaM2');
                            return val === 0 ? '-' : val.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          })()}
                        </td>
                        {/* 유로폼 */}
                        <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">
                          {(() => {
                            const val = calculateSummary('euroForm.areaM2');
                            return val === 0 ? '-' : val.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          })()}
                        </td>
                        {/* 해체/정리 - 유로폼 소계 * 2로 자동 계산 */}
                        <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16">
                          {(() => {
                            const euroFormSum = calculateSummary('euroForm.areaM2');
                            const val = euroFormSum * 2;
                            return val === 0 ? '-' : val.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          })()}
                        </td>
                        {/* 철근 */}
                        <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">
                          {(() => {
                            const val = calculateSummary('rebar.ton');
                            return val === 0 ? '-' : val.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          })()}
                        </td>
                        {/* 콘크리트 */}
                        <td className="px-1 py-0.5 text-xs text-center w-16">
                          {(() => {
                            const val = calculateSummary('concrete.volumeM3');
                            return val === 0 ? '-' : val.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          })()}
                        </td>
                      </tr>
                    );
                  }

                  const tradeGroup = row.tradeGroup || '아파트';
                  const floorId = row.floor?.id || '';
                  
                  // 버림/기초는 특별 처리 (버림/기초는 층이 없으므로 특별한 floorId 사용)
                  if (row.type === 'group') {
                    const specialFloorId = createSpecialFloorId(building.id, tradeGroup);
                    const groupTrade = getTrade(specialFloorId, tradeGroup);

                    return (
                      <tr key={row.label} className="bg-slate-50 dark:bg-slate-900/50" style={{ height: '28px' }}>
                        <td className="px-1 py-0.5 text-xs text-center font-medium border-r border-slate-200 dark:border-slate-800 w-16">
                          {row.label}
                        </td>
                        <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">-</td>
                        {/* 형틀 합계 (읽기 전용) */}
                        <td className="relative px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16">
                          {/* 셀 주소 라벨 */}
                          {getCellAddress(2, rowIndex, rows) && (
                            <span
                              className="absolute top-0.5 left-0.5 pointer-events-none select-none z-10 text-[9px] font-mono leading-none text-slate-400/60 dark:text-slate-600/60"
                              aria-hidden="true"
                            >
                              {getCellAddress(2, rowIndex, rows)}
                            </span>
                          )}
                          {(() => {
                            const val = calculateFormworkTotal(groupTrade);
                            return val === 0 ? '-' : val.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          })()}
                        </td>
                        {/* 갱폼 */}
                        <TradeInputCell
                          value={groupTrade.gangForm?.areaM2 ?? null}
                          onChange={(v) => updateTrade(specialFloorId, tradeGroup, 'gangForm.areaM2', v)}
                          rowIndex={rowIndex}
                          colIndex={3}
                          rows={rows}
                          floorId={specialFloorId}
                          tradeGroup={tradeGroup}
                          fieldPath="gangForm.areaM2"
                          onPaste={handlePaste}
                          onSelect={handleCellSelect}
                          onDragStart={handleDragStart}
                          onDragMove={handleDragMove}
                          isDragging={isDragging}
                          onTextDragStart={handleTextDragStart}
                          onTextDragEnd={handleTextDragEnd}
                          isDraggingText={isDraggingText}
                          isDraggingTextRef={isDraggingTextRef}
                          isSelected={selectedCells.has(`${rowIndex}-3`)}
                          isRecentlyPasted={recentlyPastedCells.has(`${rowIndex}-3`)}
                          isLocked={false}
                        />
                        {/* 알폼 */}
                        <TradeInputCell
                          value={groupTrade.alForm?.areaM2 ?? null}
                          onChange={(v) => updateTrade(specialFloorId, tradeGroup, 'alForm.areaM2', v)}
                          rowIndex={rowIndex}
                          colIndex={4}
                          rows={rows}
                          floorId={specialFloorId}
                          tradeGroup={tradeGroup}
                          fieldPath="alForm.areaM2"
                          onPaste={handlePaste}
                          onSelect={handleCellSelect}
                          onDragStart={handleDragStart}
                          onDragMove={handleDragMove}
                          isDragging={isDragging}
                          onTextDragStart={handleTextDragStart}
                          onTextDragEnd={handleTextDragEnd}
                          isDraggingText={isDraggingText}
                          isDraggingTextRef={isDraggingTextRef}
                          isSelected={selectedCells.has(`${rowIndex}-4`)}
                          isRecentlyPasted={recentlyPastedCells.has(`${rowIndex}-4`)}
                          isLocked={false}
                        />
                        {/* 유로폼 */}
                        <TradeInputCell
                          value={groupTrade.euroForm?.areaM2 ?? null}
                          onChange={(v) => updateTrade(specialFloorId, tradeGroup, 'euroForm.areaM2', v)}
                          rowIndex={rowIndex}
                          colIndex={5}
                          rows={rows}
                          floorId={specialFloorId}
                          tradeGroup={tradeGroup}
                          fieldPath="euroForm.areaM2"
                          onPaste={handlePaste}
                          onSelect={handleCellSelect}
                          onDragStart={handleDragStart}
                          onDragMove={handleDragMove}
                          isDragging={isDragging}
                          onTextDragStart={handleTextDragStart}
                          onTextDragEnd={handleTextDragEnd}
                          isDraggingText={isDraggingText}
                          isDraggingTextRef={isDraggingTextRef}
                          isSelected={selectedCells.has(`${rowIndex}-5`)}
                          isRecentlyPasted={recentlyPastedCells.has(`${rowIndex}-5`)}
                          isLocked={false}
                        />
                        {/* 해체/정리 - 유로폼 * 2로 자동 계산 (읽기 전용) */}
                        <td className="relative px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16">
                          {/* 셀 주소 라벨 */}
                          {getCellAddress(6, rowIndex, rows) && (
                            <span
                              className="absolute top-0.5 left-0.5 pointer-events-none select-none z-10 text-[9px] font-mono leading-none text-slate-400/60 dark:text-slate-600/60"
                              aria-hidden="true"
                            >
                              {getCellAddress(6, rowIndex, rows)}
                            </span>
                          )}
                          {(() => {
                            const euroFormVal = groupTrade.euroForm?.areaM2 || 0;
                            const val = euroFormVal * 2;
                            return val === 0 ? '-' : val.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          })()}
                        </td>
                        {/* 철근 */}
                        <TradeInputCell
                          value={groupTrade.rebar?.ton ?? null}
                          onChange={(v) => updateTrade(specialFloorId, tradeGroup, 'rebar.ton', v)}
                          rowIndex={rowIndex}
                          colIndex={7}
                          rows={rows}
                          floorId={specialFloorId}
                          tradeGroup={tradeGroup}
                          fieldPath="rebar.ton"
                          onPaste={handlePaste}
                          onSelect={handleCellSelect}
                          onDragStart={handleDragStart}
                          onDragMove={handleDragMove}
                          isDragging={isDragging}
                          onTextDragStart={handleTextDragStart}
                          onTextDragEnd={handleTextDragEnd}
                          isDraggingText={isDraggingText}
                          isDraggingTextRef={isDraggingTextRef}
                          isSelected={selectedCells.has(`${rowIndex}-7`)}
                          isRecentlyPasted={recentlyPastedCells.has(`${rowIndex}-7`)}
                          isLocked={false}
                        />
                        {/* 콘크리트 */}
                        <TradeInputCell
                          value={groupTrade.concrete?.volumeM3 ?? null}
                          onChange={(v) => updateTrade(specialFloorId, tradeGroup, 'concrete.volumeM3', v)}
                          rowIndex={rowIndex}
                          colIndex={8}
                          rows={rows}
                          floorId={specialFloorId}
                          tradeGroup={tradeGroup}
                          fieldPath="concrete.volumeM3"
                          onPaste={handlePaste}
                          onSelect={handleCellSelect}
                          onDragStart={handleDragStart}
                          onDragMove={handleDragMove}
                          isDragging={isDragging}
                          onTextDragStart={handleTextDragStart}
                          onTextDragEnd={handleTextDragEnd}
                          isDraggingText={isDraggingText}
                          isDraggingTextRef={isDraggingTextRef}
                          isSelected={selectedCells.has(`${rowIndex}-8`)}
                          isRecentlyPasted={recentlyPastedCells.has(`${rowIndex}-8`)}
                          isLocked={false}
                        />
                      </tr>
                    );
                  }

                  // 일반 층 행
                  const floorTrade = getTrade(floorId, tradeGroup);
                  const floorClass = row.floor?.floorClass || '';

                  return (
                    <tr key={row.floor?.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50" style={{ height: '28px' }}>
                      <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">{floorClass}</td>
                      <td className="px-1 py-0.5 text-xs text-center font-medium border-r border-slate-200 dark:border-slate-800 w-16">
                        {row.label}
                      </td>
                      {/* 형틀 합계 (읽기 전용) */}
                      <td className="relative px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16">
                        {/* 셀 주소 라벨 */}
                        {getCellAddress(2, rowIndex, rows) && (
                          <span
                            className="absolute top-0.5 left-0.5 pointer-events-none select-none z-10 text-[9px] font-mono leading-none text-slate-400/60 dark:text-slate-600/60"
                            aria-hidden="true"
                          >
                            {getCellAddress(2, rowIndex, rows)}
                          </span>
                        )}
                        {(() => {
                          const val = calculateFormworkTotal(floorTrade);
                          return val === 0 ? '-' : val.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        })()}
                      </td>
                      {/* 갱폼 */}
                      <TradeInputCell
                        value={floorTrade.gangForm?.areaM2 ?? null}
                        onChange={(v) => updateTrade(floorId, tradeGroup, 'gangForm.areaM2', v)}
                        rowIndex={rowIndex}
                        colIndex={3}
                        rows={rows}
                        floorId={floorId}
                        tradeGroup={tradeGroup}
                        fieldPath="gangForm.areaM2"
                        onPaste={handlePaste}
                        onSelect={handleCellSelect}
                        onDragStart={handleDragStart}
                        onDragMove={handleDragMove}
                        isDragging={isDragging}
                        onTextDragStart={handleTextDragStart}
                        onTextDragEnd={handleTextDragEnd}
                        isDraggingText={isDraggingText}
                        isDraggingTextRef={isDraggingTextRef}
                        isSelected={selectedCells.has(`${rowIndex}-3`)}
                        isRecentlyPasted={recentlyPastedCells.has(`${rowIndex}-3`)}
                        isLocked={false}
                      />
                      {/* 알폼 */}
                      <TradeInputCell
                        value={floorTrade.alForm?.areaM2 ?? null}
                        onChange={(v) => updateTrade(floorId, tradeGroup, 'alForm.areaM2', v)}
                        rowIndex={rowIndex}
                        colIndex={4}
                        rows={rows}
                        floorId={floorId}
                        tradeGroup={tradeGroup}
                        fieldPath="alForm.areaM2"
                        onPaste={handlePaste}
                        onSelect={handleCellSelect}
                        onDragStart={handleDragStart}
                        onDragMove={handleDragMove}
                        isDragging={isDragging}
                        onTextDragStart={handleTextDragStart}
                        onTextDragEnd={handleTextDragEnd}
                        isDraggingText={isDraggingText}
                        isSelected={selectedCells.has(`${rowIndex}-4`)}
                        isRecentlyPasted={recentlyPastedCells.has(`${rowIndex}-4`)}
                        isLocked={false}
                      />
                      {/* 유로폼 */}
                      <TradeInputCell
                        value={floorTrade.euroForm?.areaM2 ?? null}
                        onChange={(v) => updateTrade(floorId, tradeGroup, 'euroForm.areaM2', v)}
                        rowIndex={rowIndex}
                        colIndex={5}
                        rows={rows}
                        floorId={floorId}
                        tradeGroup={tradeGroup}
                        fieldPath="euroForm.areaM2"
                        onPaste={handlePaste}
                        onSelect={handleCellSelect}
                        onDragStart={handleDragStart}
                        onDragMove={handleDragMove}
                        isDragging={isDragging}
                        onTextDragStart={handleTextDragStart}
                        onTextDragEnd={handleTextDragEnd}
                        isDraggingText={isDraggingText}
                        isSelected={selectedCells.has(`${rowIndex}-5`)}
                        isRecentlyPasted={recentlyPastedCells.has(`${rowIndex}-5`)}
                        isLocked={false}
                      />
                      {/* 해체/정리 - 유로폼 * 2로 자동 계산 (읽기 전용) */}
                      <td className="relative px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16">
                        {/* 셀 주소 라벨 */}
                        {getCellAddress(6, rowIndex, rows) && (
                          <span
                            className="absolute top-0.5 left-0.5 pointer-events-none select-none z-10 text-[9px] font-mono leading-none text-slate-400/60 dark:text-slate-600/60"
                            aria-hidden="true"
                          >
                            {getCellAddress(6, rowIndex, rows)}
                          </span>
                        )}
                        {(() => {
                          const euroFormVal = floorTrade.euroForm?.areaM2 || 0;
                          const val = euroFormVal * 2;
                          return val === 0 ? '-' : val.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        })()}
                      </td>
                      {/* 철근 */}
                      <TradeInputCell
                        value={floorTrade.rebar?.ton ?? null}
                        onChange={(v) => updateTrade(floorId, tradeGroup, 'rebar.ton', v)}
                        rowIndex={rowIndex}
                        colIndex={7}
                        rows={rows}
                        floorId={floorId}
                        tradeGroup={tradeGroup}
                        fieldPath="rebar.ton"
                        onPaste={handlePaste}
                        onSelect={handleCellSelect}
                        onDragStart={handleDragStart}
                        onDragMove={handleDragMove}
                        isDragging={isDragging}
                        onTextDragStart={handleTextDragStart}
                        onTextDragEnd={handleTextDragEnd}
                        isDraggingText={isDraggingText}
                        isSelected={selectedCells.has(`${rowIndex}-7`)}
                        isRecentlyPasted={recentlyPastedCells.has(`${rowIndex}-7`)}
                        isLocked={false}
                      />
                      {/* 콘크리트 */}
                      <TradeInputCell
                        value={floorTrade.concrete?.volumeM3 ?? null}
                        onChange={(v) => updateTrade(floorId, tradeGroup, 'concrete.volumeM3', v)}
                        rowIndex={rowIndex}
                        colIndex={8}
                        rows={rows}
                        floorId={floorId}
                        tradeGroup={tradeGroup}
                        fieldPath="concrete.volumeM3"
                        onPaste={handlePaste}
                        onSelect={handleCellSelect}
                        onDragStart={handleDragStart}
                        onDragMove={handleDragMove}
                        isDragging={isDragging}
                        onTextDragStart={handleTextDragStart}
                        onTextDragEnd={handleTextDragEnd}
                        isDraggingText={isDraggingText}
                        isSelected={selectedCells.has(`${rowIndex}-8`)}
                        isRecentlyPasted={recentlyPastedCells.has(`${rowIndex}-8`)}
                        isLocked={false}
                      />
                    </tr>
                  );
                })}
              </tbody>
            </table>
        </div>
      </CardContent>
    </Card>
  );
  }
);

// 수식 계산 함수 (사칙연산 지원)
function calculateFormula(formula: string): number | null {
  try {
    // = 제거
    let expression = formula.trim();
    if (expression.startsWith('=')) {
      expression = expression.substring(1).trim();
    }
    
    if (!expression) return null;
    
    // 안전한 수식 계산 (숫자, +, -, *, /, 공백만 허용)
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
    if (sanitized !== expression) return null;
    
    // Function 생성자를 사용하여 계산 (안전한 범위 내에서)
    // eslint-disable-next-line no-new-func
    const result = new Function('return ' + sanitized)();
    return typeof result === 'number' && !isNaN(result) && isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

/**
 * 열 인덱스를 공정모듈 열 문자로 변환
 * quantity-reference.ts의 열 매핑과 일치 (+ 유로폼은 U열로 독립 매핑)
 * B=갱폼, C=알폼, D=형틀 합계, U=유로폼, E=해체/정리, F=철근, G=콘크리트
 */
function getColumnLetter(colIndex: number): string | null {
  const mapping: Record<number, string> = {
    2: 'D', // 형틀 합계
    3: 'B', // 갱폼
    4: 'C', // 알폼
    5: 'U', // 유로폼 (공정모듈에서 직접 참조 안 함, 독립 표시용)
    6: 'E', // 해체/정리
    7: 'F', // 철근
    8: 'G', // 콘크리트
  };
  return mapping[colIndex] || null;
}

/**
 * 층 라벨에서 숫자 추출 (예: "1F" → 1, "15F" → 15, "B1" → null)
 */
function parseFloorNumber(label: string): number | null {
  const match = label.match(/^(\d+)F?$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * 행 인덱스를 공정모듈 행 번호로 변환
 * quantity-reference.ts의 행 매핑과 일치
 * row 6=버림, row 7=기초, row 8=B2, row 9=B1, row 11=1층, row 12=2층,
 * row 13-25=3-15층, row 26=옥탑1층, row 27=옥탑2층, row 28=옥탑3층
 */
function getExcelRowNumber(rowIndex: number, rows: Array<{
  type: 'group' | 'floor' | 'summary';
  label: string;
  floor?: {
    id: string;
    levelType?: string;
    floorClass?: string;
    floorNumber?: number;
  };
}>): number {
  const row = rows[rowIndex];
  if (!row || row.type === 'summary') return -1;

  // 버림/기초 (고정)
  if (row.type === 'group') {
    if (row.label === '버림') return 6;
    if (row.label === '기초') return 7;
  }

  // 일반 층
  if (row.type === 'floor' && row.floor) {
    const floor = row.floor;

    // 지하층: B2=8, B1=9
    if (floor.levelType === '지하') {
      const basementFloors = rows
        .filter(r => r.type === 'floor' && r.floor?.levelType === '지하')
        .reverse(); // B2, B1 순서 (깊은 층부터)
      const bIndex = basementFloors.findIndex(r => r.floor?.id === floor.id);
      return bIndex >= 0 ? 8 + bIndex : -1;
    }

    // 옥탑층: PH1=26, PH2=27, PH3=28 (지상층보다 먼저 체크!)
    if (floor.floorClass === '옥탑층' || floor.floorClass === 'PH층') {
      const phFloors = rows
        .filter(r => r.type === 'floor' && (r.floor?.floorClass === '옥탑층' || r.floor?.floorClass === 'PH층'));
      const phIndex = phFloors.findIndex(r => r.floor?.id === floor.id);
      return phIndex >= 0 ? 26 + phIndex : -1;
    }

    // 지상층: 1F=11, 2F=12, 3F=13, ...
    if (floor.levelType === '지상') {
      const floorNum = parseFloorNumber(row.label);
      return floorNum ? 10 + floorNum : -1;
    }
  }

  return -1;
}

/**
 * 열/행 인덱스를 공정모듈 호환 셀 주소로 변환
 * @param colIndex - 열 인덱스 (0-8)
 * @param rowIndex - 행 인덱스 (0부터 시작)
 * @param rows - rows 배열 (행 정보)
 * @returns 공정모듈 셀 주소 (예: "D6", "B11", "F7") 또는 null
 */
function getCellAddress(
  colIndex: number,
  rowIndex: number,
  rows: Array<{
    type: 'group' | 'floor' | 'summary';
    label: string;
    floor?: {
      id: string;
      levelType?: string;
      floorClass?: string;
      floorNumber?: number;
    };
  }>
): string | null {
  const columnLetter = getColumnLetter(colIndex);
  if (!columnLetter) return null;

  const rowNumber = getExcelRowNumber(rowIndex, rows);
  if (rowNumber < 0) return null;

  return `${columnLetter}${rowNumber}`;
}

// 헬퍼 컴포넌트: 입력 셀
function TradeInputCell({
  value,
  onChange,
  rowIndex,
  colIndex,
  rows,
  floorId,
  tradeGroup,
  fieldPath,
  onPaste,
  onSelect,
  onDragStart,
  onDragMove,
  isDragging,
  onTextDragStart,
  onTextDragEnd,
  isDraggingText,
  isDraggingTextRef,
  isSelected,
  isRecentlyPasted,
  isLocked
}: {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  rowIndex?: number;
  colIndex?: number;
  rows?: Array<{
    type: 'group' | 'floor' | 'summary';
    label: string;
    floor?: {
      id: string;
      levelType?: string;
      floorClass?: string;
      floorNumber?: number;
    };
  }>;
  floorId?: string;
  tradeGroup?: string;
  fieldPath?: string;
  onPaste?: (e: React.ClipboardEvent, startRow: number, startCol: number) => void;
  onSelect?: (rowIndex: number, colIndex: number, isMultiSelect: boolean) => void;
  onDragStart?: (rowIndex: number, colIndex: number) => void;
  onDragMove?: (rowIndex: number, colIndex: number) => void;
  isDragging?: boolean;
  onTextDragStart?: () => void;
  onTextDragEnd?: () => void;
  isDraggingText?: boolean;
  isDraggingTextRef?: React.MutableRefObject<boolean>;
  isSelected?: boolean;
  isRecentlyPasted?: boolean;
  isLocked?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const [isPasting, setIsPasting] = useState(false);
  
  // 수식 저장 키 생성
  const formulaKey = floorId && fieldPath ? `formula-${floorId}-${tradeGroup}-${fieldPath}` : null;
  
  // localStorage에서 수식 불러오기
  const getStoredFormula = (): string | null => {
    if (!formulaKey) return null;
    try {
      return localStorage.getItem(formulaKey);
    } catch {
      return null;
    }
  };
  
  // localStorage에 수식 저장
  const setStoredFormula = (formula: string | null) => {
    if (!formulaKey) return;
    try {
      if (formula) {
        localStorage.setItem(formulaKey, formula);
      } else {
        localStorage.removeItem(formulaKey);
      }
    } catch {
      // localStorage 오류 무시
    }
  };
  
  const [formula, setFormula] = useState<string | null>(getStoredFormula());

  // 포맷팅된 값 생성 (천단위 구분자 포함, 소수점 2~4자리)
  const formatValue = (num: number | null | undefined): string => {
    // null, undefined, 0 모두 "-"로 표시 (초기값 통일)
    if (num === null || num === undefined || num === 0) return '-';
    // 최소 2자리, 최대 4자리까지 표시 (건설 물량 정밀도 반영)
    return num.toLocaleString('ko-KR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    });
  };

  // 숫자만 추출 (천단위 구분자 제거, 빈칸은 null 반환)
  const parseValue = (str: string): number | null => {
    const cleaned = str.replace(/,/g, '').replace(/\s/g, '');
    if (!cleaned) return null;
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  // 포커스를 받았을 때
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // 수식이 있으면 수식을 표시, 없으면 값 표시
    if (formula) {
      setDisplayValue(formula);
    } else if (value === null || value === undefined) {
      setDisplayValue('');
    } else {
      setDisplayValue(value.toString());
    }
  };

  // 포커스를 잃었을 때
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // 붙여넣기 중이면 handleBlur에서 값을 저장하지 않음 (먼저 체크)
    if (isPasting) {
      setIsFocused(false);
      return;
    }
    
    setIsFocused(false);
    
    const inputValue = e.target.value.trim();
    
    // 빈 값인 경우
    // 붙여넣기 직후에는 input 필드의 DOM 값이 아직 업데이트되지 않았을 수 있으므로,
    // value prop을 확인하여 값이 있으면 그것을 사용
    if (!inputValue) {
      // value prop에 값이 있으면 (붙여넣기로 업데이트된 경우) blur 이벤트 무시
      if (value !== null && value !== undefined && value !== 0) {
        // displayValue만 업데이트하고 onChange는 호출하지 않음
        setDisplayValue(formatValue(value));
        return;
      }
      onChange(null);
      setDisplayValue('');
      setFormula(null);
      setStoredFormula(null);
      return;
    }
    
    // 수식인 경우 (=로 시작)
    if (inputValue.startsWith('=')) {
      const calculatedValue = calculateFormula(inputValue);
      if (calculatedValue !== null) {
        setFormula(inputValue);
        setStoredFormula(inputValue);
        onChange(calculatedValue);
        setDisplayValue(formatValue(calculatedValue));
      } else {
        // 수식 계산 실패 시 일반 숫자로 처리
        const parsedValue = parseValue(inputValue);
        onChange(parsedValue);
        setDisplayValue(formatValue(parsedValue));
        setFormula(null);
        setStoredFormula(null);
      }
    } else {
      // 일반 숫자인 경우
      const parsedValue = parseValue(inputValue);
      onChange(parsedValue);
      setDisplayValue(formatValue(parsedValue));
      setFormula(null);
      setStoredFormula(null);
    }
  };

  // 입력 중
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    // 실시간으로 숫자 변환하여 부모에 전달 (선택적)
    // onChange(parseValue(inputValue));
  };

  // value가 변경되었을 때 displayValue 업데이트
  // 포커스가 없을 때 또는 붙여넣기 중일 때 업데이트
  useEffect(() => {
    // 포커스가 없을 때는 항상 업데이트
    // 포커스가 있을 때는 붙여넣기 중일 때만 업데이트 (사용자 직접 입력 중에는 업데이트하지 않음)
    if (!isFocused || isPasting) {
      // 수식이 있으면 계산된 결과를 표시
      if (formula) {
        const calculatedValue = calculateFormula(formula);
        if (calculatedValue !== null) {
          setDisplayValue(formatValue(calculatedValue));
        } else {
          setDisplayValue(formatValue(value));
        }
      } else {
        setDisplayValue(formatValue(value));
      }
    }
  }, [value, isFocused, formula, isPasting]);
  
  // 컴포넌트 마운트 시 저장된 수식 불러오기
  useEffect(() => {
    const storedFormula = getStoredFormula();
    if (storedFormula) {
      setFormula(storedFormula);
      const calculatedValue = calculateFormula(storedFormula);
      if (calculatedValue !== null && value !== calculatedValue) {
        // 저장된 값과 계산된 값이 다르면 업데이트
        onChange(calculatedValue);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePaste = (e: React.ClipboardEvent) => {
    if (onPaste && rowIndex !== undefined && colIndex !== undefined) {
      // 기본 붙여넣기 동작 완전히 차단 (클립보드 데이터 읽기 전에)
      e.preventDefault();
      e.stopPropagation();
      
      // 클립보드 데이터 읽기 (preventDefault 후에도 읽을 수 있음)
      const clipboardData = e.clipboardData.getData('text/plain');
      
      // 클립보드에 데이터가 없는 경우 기본 동작 허용
      if (!clipboardData || !clipboardData.trim()) {
        return;
      }
      
      // 붙여넣기 중 플래그 설정
      setIsPasting(true);
      
      // 입력 필드의 선택 영역만 지움 (값은 지우지 않음 - blur 이벤트에서 빈 값으로 저장되는 것을 방지)
      const input = e.target as HTMLInputElement;
      if (input && input.setSelectionRange) {
        input.setSelectionRange(0, 0);
      }
      
      // SyntheticEvent를 생성하여 클립보드 데이터 전달
      const syntheticEvent = {
        ...e,
        preventDefault: () => {},
        stopPropagation: () => {},
        clipboardData: {
          getData: (format: string) => {
            if (format === 'text/plain') {
              return clipboardData;
            }
            return '';
          }
        } as DataTransfer
      } as React.ClipboardEvent;
      
      // 즉시 부모의 handlePaste 호출 (첫 번째 셀 포함 모든 셀 처리)
      onPaste(syntheticEvent, rowIndex, colIndex);
      
      // 붙여넣기 완료 후 플래그 해제
      // useEffect에서 value prop 변경 시 displayValue가 자동으로 업데이트됨
      requestAnimationFrame(() => {
        setTimeout(() => {
          setIsPasting(false);
        }, 100);
      });
    }
  };

  // Delete/Backspace 키로 셀 지우기 및 Ctrl+V/Cmd+V 처리
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ctrl+V 또는 Cmd+V (붙여넣기)
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      // 기본 붙여넣기 동작을 막고, 클립보드 데이터를 직접 가져와서 처리
      e.preventDefault();
      e.stopPropagation();
      
      if (onPaste && rowIndex !== undefined && colIndex !== undefined) {
        // 클립보드 데이터 가져오기
        navigator.clipboard.readText().then((clipboardText) => {
          if (clipboardText.trim()) {
            // 붙여넣기 중 플래그 설정
            setIsPasting(true);
            
            // 입력 필드의 값을 지워서 기본 붙여넣기 동작 방지
            const input = e.target as HTMLInputElement;
            if (input) {
              setDisplayValue('');
              input.value = '';
            }
            
            // 클립보드 이벤트를 시뮬레이션하여 부모의 handlePaste 호출
            const syntheticEvent = {
              clipboardData: {
                getData: (type: string) => type === 'text/plain' ? clipboardText : '',
              },
              preventDefault: () => {},
              stopPropagation: () => {},
            } as React.ClipboardEvent;
            
            onPaste(syntheticEvent, rowIndex, colIndex);
            
            // 붙여넣기 완료 후 플래그 해제
            setTimeout(() => {
              setIsPasting(false);
            }, 100);
          }
        }).catch(() => {
          // 클립보드 읽기 실패 시 무시
        });
      }
      return;
    }
    
    // Delete/Backspace 키 처리
    if ((e.key === 'Delete' || e.key === 'Backspace') && isFocused) {
      const input = e.target as HTMLInputElement;
      // 전체 선택되어 있거나 값이 비어있을 때
      if (input.selectionStart === 0 && input.selectionEnd === input.value.length) {
        e.preventDefault();
        onChange(null);
        setDisplayValue('');
      }
    }
  };

  // 셀 클릭 시 선택
  const handleMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
    // input 필드 내부 이벤트가 부모로 전파되지 않도록 함
    // 단, 기본 텍스트 선택 동작은 허용해야 하므로 preventDefault는 호출하지 않음
    e.stopPropagation();
    
    // 텍스트 선택 드래그 시작 (전역 상태로 관리)
    if (onTextDragStart) {
      onTextDragStart();
    }
    
    // 텍스트 선택이 완료되면 플래그 해제
    const handleTextSelectionEnd = () => {
      if (onTextDragEnd) {
        onTextDragEnd();
      }
      window.removeEventListener('mouseup', handleTextSelectionEnd);
    };
    window.addEventListener('mouseup', handleTextSelectionEnd, { once: true });
    
    if (rowIndex !== undefined && colIndex !== undefined) {
      const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;

      // Shift/Ctrl 없이 클릭하면 드래그 시작
      if (!isMultiSelect && onDragStart) {
        onDragStart(rowIndex, colIndex);
      }

      if (onSelect) {
        onSelect(rowIndex, colIndex, isMultiSelect);
      }
    }
  };

  // input 필드에서 마우스 이동 (드래그 중이면 셀 선택 업데이트)
  const handleInputMouseMove = (e: React.MouseEvent<HTMLInputElement>) => {
    // 드래그 중이면 셀 선택 업데이트
    if (isDragging && onDragMove && rowIndex !== undefined && colIndex !== undefined) {
      onDragMove(rowIndex, colIndex);
    }
    // 텍스트 선택 중이 아닐 때만 stopPropagation (드래그 중에는 셀 선택 이벤트 전파 허용)
    e.stopPropagation();
  };

  // td 요소에서 마우스 다운 (셀 선택 드래그 시작)
  const handleCellMouseDown = (e: React.MouseEvent<HTMLTableCellElement>) => {
    // input 필드 내부가 아닐 때만 셀 선택 드래그 시작
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.closest('input')) {
      return; // input 필드 내부이면 텍스트 선택 허용
    }
    
    if (rowIndex !== undefined && colIndex !== undefined && onDragStart) {
      const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
      if (!isMultiSelect) {
        onDragStart(rowIndex, colIndex);
      }
      
      if (onSelect) {
        onSelect(rowIndex, colIndex, isMultiSelect);
      }
    }
  };

  // 셀 배경색 클래스 결정
  const getCellBgClass = () => {
    if (isRecentlyPasted) {
      return 'bg-green-100 dark:bg-green-900/50 animate-pulse';
    }
    if (isSelected) {
      return 'bg-blue-100 dark:bg-blue-900/50';
    }
    return '';
  };

  return (
    <td
      className={`relative px-0.5 py-0 border-r border-slate-200 dark:border-slate-800 w-16 transition-colors duration-150 ${getCellBgClass()}`}
      onMouseDown={handleCellMouseDown}
    >
      {/* 셀 주소 라벨 - 공정모듈 호환 (예: D6, B11, F7) */}
      {rowIndex !== undefined && colIndex !== undefined && rows && getCellAddress(colIndex, rowIndex, rows) && (
        <span
          className="absolute top-0.5 left-0.5 pointer-events-none select-none z-10 text-[9px] font-mono leading-none text-slate-400/60 dark:text-slate-600/60 transition-opacity duration-150"
          aria-hidden="true"
        >
          {getCellAddress(colIndex, rowIndex, rows)}
        </span>
      )}

      <Input
        type="text"
        inputMode="decimal"
        value={isFocused ? displayValue : formatValue(value)}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onMouseDown={(e) => {
          // input 필드 내부에서의 이벤트는 부모로 전파되지 않도록 함
          e.stopPropagation();
          handleMouseDown(e);
        }}
        onMouseMove={handleInputMouseMove}
        data-row-index={rowIndex}
        data-col-index={colIndex}
        style={{ userSelect: 'text' }}
        className="w-full h-6 text-xs px-1 py-0.5 border-0 rounded-none text-center bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-blue-500/50 focus-visible:ring-1 focus-visible:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
      />
    </td>
  );
}


