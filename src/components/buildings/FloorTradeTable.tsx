'use client';

import { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input } from '@/components/ui';
import type { Building, Floor, FloorTrade, TradeData } from '@/lib/types';
import { saveFloorTrade } from '@/lib/services/buildings';
import { toast } from 'sonner';

interface Props {
  building: Building;
  onUpdate: () => void;
}

const TRADE_GROUPS = ['버림', '기초', '아파트'];

export interface FloorTradeTableHandle {
  flushPendingSaves: () => Promise<void>;
}

export const FloorTradeTable = forwardRef<FloorTradeTableHandle, Props>(
  ({ building, onUpdate }, ref) => {
  const [floors, setFloors] = useState<Floor[]>(building.floors);
  const [trades, setTrades] = useState<Map<string, FloorTrade>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const isDraggingTextRef = useRef(false);
  const selectionStartRef = useRef<{ row: number; col: number } | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSavesRef = useRef<Map<string, FloorTrade>>(new Map()); // 저장 대기 중인 trade 객체들

  useEffect(() => {
    setFloors(building.floors);
    const tradesMap = new Map<string, FloorTrade>();
    building.floorTrades.forEach(trade => {
      const key = `${trade.floorId}-${trade.tradeGroup}`;
      tradesMap.set(key, trade);
    });
    setTrades(tradesMap);
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
      // 코어1의 최대 층수
      const core1MaxFloor = coreGroundFloors[0] || 0;
      
      // 지하층 추가 (공통)
      const basementFloors = floors.filter(f => f.levelType === '지하');
      basementFloors.forEach(floor => {
        result.push({ type: 'floor', label: floor.floorLabel, floor });
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
        result.push({ type: 'floor', label: floor.floorLabel, floor });
      });
    } else {
      // 코어가 1개이거나 코어별 층수가 없으면 전체 지상층 수로 처리
      const groundFloorCount = building.meta.floorCount.ground || 0;
      
      // 지하층 추가
      const basementFloors = floors.filter(f => f.levelType === '지하');
      basementFloors.forEach(floor => {
        result.push({ type: 'floor', label: floor.floorLabel, floor });
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
        result.push({ type: 'floor', label: floor.floorLabel, floor });
      });
    }

    // 소계 행
    result.push({ type: 'summary', label: '소계' });

    return result;
  }, [floors, building]);

  // 셀 선택 처리
  const handleCellSelect = (rowIndex: number, colIndex: number, isMultiSelect: boolean) => {
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
          newSelection.add(`${r}-${c}`);
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorTradeTable.tsx:handleDragStart',message:'Drag start',data:{rowIndex,colIndex,isDraggingText},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
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
        if (c >= 2) {
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorTradeTable.tsx:handleTextDragStart',message:'Text drag start',data:{isDragging},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    isDraggingTextRef.current = true;
    setIsDraggingText(true);
    // 셀 선택 드래그 중이면 중단
    if (isDragging) {
      handleDragEnd();
    }
  }, [isDragging, handleDragEnd]);
  
  const handleTextDragEnd = useCallback(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorTradeTable.tsx:handleTextDragEnd',message:'Text drag end',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorTradeTable.tsx:handleMouseMove',message:'Mouse move during drag',data:{targetTag:target.tagName,isInput:target.tagName==='INPUT'||!!target.closest('input'),activeElement:document.activeElement?.tagName},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      // input 필드 내부이면 셀 선택 드래그를 중단하고 텍스트 선택 허용
      if (target.tagName === 'INPUT' || target.closest('input')) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorTradeTable.tsx:handleMouseMove:endDrag',message:'Ending drag - input field',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        handleDragEnd();
        return;
      }
      
      // input 필드가 활성화되어 있거나 포커스되어 있으면 셀 선택 드래그 중단
      const activeEl = document.activeElement;
      if (activeEl?.tagName === 'INPUT' && (activeEl as HTMLInputElement).selectionStart !== null) {
        // input 필드에서 텍스트 선택 중이면 셀 선택 드래그 중단
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorTradeTable.tsx:handleMouseMove:endDrag:activeInput',message:'Ending drag - active input with selection',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
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
        // 데이터 컬럼만 선택 (구분/층 컬럼 제외)
        if (col >= 2) {
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
      // 입력 필드에 포커스가 있으면 무시
      if (document.activeElement?.tagName === 'INPUT') {
        return;
      }
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCells.size > 0) {
        e.preventDefault();
        // 선택된 셀들의 데이터 지우기
        selectedCells.forEach(cellKey => {
          const [rowIdx, colIdx] = cellKey.split('-').map(Number);
          if (rowIdx >= 0 && rowIdx < rows.length) {
            const rowInfo = rows[rowIdx];
            if (rowInfo && rowInfo.type !== 'summary') {
              const tradeGroup = rowInfo.tradeGroup || '아파트';
              const floorId = rowInfo.floor?.id || (rowInfo.type === 'group' ? `group-${tradeGroup}` : '');
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
    if (floorId.startsWith('dummy-')) {
      const floorMatch = floorId.match(/dummy-(\d+)F/);
      if (floorMatch) {
        const floorNum = floorMatch[1];
        const core1Floor = floors.find(f => {
          const match = f.floorLabel.match(/코어1-(\d+)F/);
          return match && match[1] === floorNum;
        });
        if (core1Floor) {
          actualFloorId = core1Floor.id;
        }
      }
    }
    
    const key = `${actualFloorId}-${tradeGroup}`;
    const trade = trades.get(key);
    return trade?.trades || {};
  };

  const updateTrade = (floorId: string, tradeGroup: string, field: string, value: number | null): boolean => {
    // 더미 층인 경우 코어1의 실제 층 찾기
    let actualFloorId = floorId;
    if (floorId.startsWith('dummy-')) {
      const floorMatch = floorId.match(/dummy-(\d+)F/);
      if (floorMatch) {
        const floorNum = floorMatch[1];
        const core1Floor = floors.find(f => {
          const match = f.floorLabel.match(/코어1-(\d+)F/);
          return match && match[1] === floorNum;
        });
        if (core1Floor) {
          actualFloorId = core1Floor.id;
        } else {
          // 코어1에 해당 층이 없으면 저장하지 않음
          return false;
        }
      }
    }
    
    const key = `${actualFloorId}-${tradeGroup}`;
    const existing = trades.get(key);
    
    const newTrades = { ...(existing?.trades || {}) };
    
    // 중첩된 필드 처리 (예: "gangForm.areaM2")
    const [category, subField] = field.split('.');
    if (subField) {
      if (!newTrades[category as keyof TradeData]) {
        newTrades[category as keyof TradeData] = {} as any;
      }
      // null인 경우 해당 필드 삭제 (빈칸 처리)
      if (value === null) {
        delete (newTrades[category as keyof TradeData] as any)[subField];
      } else {
        (newTrades[category as keyof TradeData] as any)[subField] = value;
      }
    } else {
      // null인 경우 해당 필드 삭제 (빈칸 처리)
      if (value === null) {
        delete (newTrades as any)[field];
      } else {
        (newTrades as any)[field] = value;
      }
    }

    const updatedTrade: FloorTrade = {
      id: existing?.id || `temp-${Date.now()}`,
      floorId: actualFloorId,
      buildingId: building.id,
      tradeGroup,
      trades: newTrades,
    };

    const newTradesMap = new Map(trades.set(key, updatedTrade));
    setTrades(newTradesMap);
    
    // 자동 저장 (디바운싱 적용)
    autoSave(key, updatedTrade);
    
    return true;
  };

  // 저장 완료를 보장하는 함수 (층 재생성 전 호출)
  const flushPendingSaves = async (): Promise<void> => {
    // 더미 층 ID는 저장하지 않음
    if (!(pendingSavesRef.current instanceof Map) || pendingSavesRef.current.size === 0) {
      return;
    }

    // 기존 타이머 취소
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // 저장 대기 중인 모든 trade를 즉시 저장
    const savesToProcess = new Map(pendingSavesRef.current);
    pendingSavesRef.current.clear();

    if (savesToProcess.size === 0) return;

    setIsSaving(true);
    try {
      const tradesToSave = Array.from(savesToProcess.values()).filter(
        trade => !trade.floorId.startsWith('dummy-')
      );

      if (tradesToSave.length > 0) {
        const promises = tradesToSave.map(trade =>
          saveFloorTrade(building.id, building.projectId, {
            floorId: trade.floorId,
            tradeGroup: trade.tradeGroup,
            trades: trade.trades,
          })
        );
        await Promise.all(promises);
        await onUpdate(); // 저장 후 업데이트
      }
    } catch (error) {
      console.error('Flush save failed:', error);
      throw error; // 에러를 상위로 전달
    } finally {
      setIsSaving(false);
    }
  };

  // useImperativeHandle로 함수 노출
  useImperativeHandle(ref, () => ({
    flushPendingSaves,
  }));

  // 자동 저장 함수 (디바운싱 적용)
  const autoSave = (tradeKey: string, trade: FloorTrade) => {
    // 더미 층 ID는 저장하지 않음 (실제 층만 저장)
    if (trade.floorId.startsWith('dummy-')) {
      return;
    }

    // pendingSavesRef가 Map인지 확인하고, 아니면 초기화
    if (!(pendingSavesRef.current instanceof Map)) {
      pendingSavesRef.current = new Map();
    }

    // 저장 대기 목록에 추가 (trade 객체를 직접 저장)
    pendingSavesRef.current.set(tradeKey, trade);

    // 기존 타이머 취소
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 500ms 후 저장 (디바운싱)
    saveTimeoutRef.current = setTimeout(async () => {
      const savesToProcess = new Map(pendingSavesRef.current);
      pendingSavesRef.current.clear();

      if (savesToProcess.size === 0) return;

    setIsSaving(true);
    try {
        // 저장할 trade 객체들을 배열로 변환
        const tradesToSave = Array.from(savesToProcess.values()).filter(
          trade => !trade.floorId.startsWith('dummy-')
        );

        // 저장 실행
        if (tradesToSave.length > 0) {
          const promises = tradesToSave.map(trade =>
            saveFloorTrade(building.id, building.projectId, {
              floorId: trade.floorId,
              tradeGroup: trade.tradeGroup,
              trades: trade.trades,
            })
          );
      await Promise.all(promises);
      onUpdate();
        }
    } catch (error) {
        console.error('Auto-save failed:', error);
        toast.error('자동 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
    }, 500);
  };

  // 소계 계산
  const calculateSummary = (field: string): number => {
    let sum = 0;
    trades.forEach(trade => {
      const [category, subField] = field.split('.');
      if (subField) {
        const categoryData = trade.trades[category as keyof TradeData] as any;
        if (categoryData && categoryData[subField]) {
          sum += categoryData[subField] || 0;
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
    
    // 갱폼 (0)
    if (dataColIndex === 0) {
      return 'gangForm.areaM2';
    }
    // 알폼 (1)
    if (dataColIndex === 1) {
      return 'alForm.areaM2';
    }
    // 형틀 (2)
    if (dataColIndex === 2) {
      return 'formwork.areaM2';
    }
    // 해체/정리 (3)
    if (dataColIndex === 3) {
      return 'stripClean.areaM2';
    }
    // 철근 (4)
    if (dataColIndex === 4) {
      return 'rebar.ton';
    }
    // 콘크리트 (5)
    if (dataColIndex === 5) {
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
      
      // 각 셀의 데이터를 업데이트
      validRows.forEach((pastedRow, rowOffset) => {
        const actualRowIndex = startRowIndex + rowOffset;
        
        // 실제 테이블의 행 정보 가져오기 (rows는 useMemo로 정의된 컴포넌트 변수)
        if (actualRowIndex >= rows.length) return;
        
        const rowInfo = rows[actualRowIndex];
        if (!rowInfo || rowInfo.type === 'summary') return; // 소계 행은 건너뛰기
        
        const tradeGroup = rowInfo.tradeGroup || '아파트';
        const floorId = rowInfo.floor?.id || (rowInfo.type === 'group' ? `group-${tradeGroup}` : '');
        
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
          
          // 빈 셀인 경우 null로 설정 (빈칸 처리)
          if (!trimmedValue || trimmedValue === '') {
            if (updateTrade(floorId, tradeGroup, fieldPath, null)) {
              updateCount++;
            }
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
            }
          } else {
            // 숫자가 아닌 경우 null로 설정 (빈칸)
            if (updateTrade(floorId, tradeGroup, fieldPath, null)) {
              updateCount++;
            }
          }
        });
      });
      
      if (updateCount > 0) {
        toast.success(`${updateCount}개의 셀이 업데이트되었습니다.`);
      }
    } catch (error) {
      toast.error('붙여넣기에 실패했습니다.');
      console.error('Paste error:', error);
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>층별 물량 입력</CardTitle>
          {isSaving && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              저장 중...
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse text-[10.8px] table-fixed min-w-full">
              {/* 헤더 1단계 */}
              <thead className="sticky top-0 z-10 bg-white dark:bg-slate-950">
                <tr className="border-b-2 border-slate-300 dark:border-slate-700">
                  <th rowSpan={2} className="px-0.5 py-0.5 text-center text-[10.8px] font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 w-16">
                    구분
                  </th>
                  <th rowSpan={2} className="px-0.5 py-0.5 text-center text-[10.8px] font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 w-16">
                    층
                  </th>
                  <th className="px-0.5 py-0.5 text-center text-[10.8px] font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                    갱폼
                  </th>
                  <th className="px-0.5 py-0.5 text-center text-[10.8px] font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                    알폼
                  </th>
                  <th className="px-0.5 py-0.5 text-center text-[10.8px] font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                    형틀
                  </th>
                  <th className="px-0.5 py-0.5 text-center text-[10.8px] font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                    해체/정리
                  </th>
                  <th className="px-0.5 py-0.5 text-center text-[10.8px] font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                    철근
                  </th>
                  <th className="px-0.5 py-0.5 text-center text-[10.8px] font-semibold leading-tight text-slate-900 dark:text-white bg-white dark:bg-slate-950">
                    콘크리트
                  </th>
                </tr>
                {/* 헤더 2단계 */}
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  {/* 갱폼 */}
                  <th className="px-0.5 py-0.5 text-[10.8px] font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-14">
                    M²
                  </th>
                  {/* 알폼 */}
                  <th className="px-0.5 py-0.5 text-[10.8px] font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-14">
                    M²
                  </th>
                  {/* 형틀 */}
                  <th className="px-0.5 py-0.5 text-[10.8px] font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-14">
                    M²
                  </th>
                  {/* 해체/정리 */}
                  <th className="px-0.5 py-0.5 text-[10.8px] font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-14">
                    M²
                  </th>
                  {/* 철근 */}
                  <th className="px-0.5 py-0.5 text-[10.8px] font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-14">
                    TON
                  </th>
                  {/* 콘크리트 */}
                  <th className="px-0.5 py-0.5 text-[10.8px] font-medium leading-tight text-center text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 w-14">
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
                      >
                        <td className="px-0.5 py-0 text-[10.8px] text-center border-r border-slate-200 dark:border-slate-800 w-16">소계</td>
                        <td className="px-0.5 py-0 text-[10.8px] text-center border-r border-slate-200 dark:border-slate-800 w-16">합계</td>
                        {/* 갱폼 */}
                        <td className="px-0.5 py-0 text-[10.8px] text-center border-r border-slate-200 dark:border-slate-800 w-14">
                          {(() => {
                            const val = calculateSummary('gangForm.areaM2');
                            return val === 0 ? '' : val.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                          })()}
                        </td>
                        {/* 알폼 */}
                        <td className="px-0.5 py-0 text-[10.8px] text-center border-r border-slate-200 dark:border-slate-800 w-14">
                          {(() => {
                            const val = calculateSummary('alForm.areaM2');
                            return val === 0 ? '' : val.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                          })()}
                        </td>
                        {/* 형틀 */}
                        <td className="px-0.5 py-0 text-[10.8px] text-center border-r border-slate-200 dark:border-slate-800 w-14">
                          {(() => {
                            const val = calculateSummary('formwork.areaM2');
                            return val === 0 ? '' : val.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                          })()}
                        </td>
                        {/* 해체/정리 */}
                        <td className="px-0.5 py-0 text-[10.8px] text-center border-r border-slate-200 dark:border-slate-800 w-14">
                          {(() => {
                            const val = calculateSummary('stripClean.areaM2');
                            return val === 0 ? '' : val.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                          })()}
                        </td>
                        {/* 철근 */}
                        <td className="px-0.5 py-0 text-[10.8px] text-center border-r border-slate-200 dark:border-slate-800 w-14">
                          {(() => {
                            const val = calculateSummary('rebar.ton');
                            return val === 0 ? '' : val.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                          })()}
                        </td>
                        {/* 콘크리트 */}
                        <td className="px-0.5 py-0 text-[10.8px] text-center w-14">
                          {(() => {
                            const val = calculateSummary('concrete.volumeM3');
                            return val === 0 ? '' : val.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                          })()}
                        </td>
                      </tr>
                    );
                  }

                  const tradeGroup = row.tradeGroup || '아파트';
                  const floorId = row.floor?.id || '';
                  
                  // 버림/기초는 특별 처리 (버림/기초는 층이 없으므로 특별한 floorId 사용)
                  if (row.type === 'group') {
                    const specialFloorId = `group-${tradeGroup}`;
                    const groupTrade = getTrade(specialFloorId, tradeGroup);
                    
                    return (
                      <tr key={row.label} className="bg-slate-50 dark:bg-slate-900/50">
                        <td className="px-0.5 py-0 text-[10.8px] text-center font-medium border-r border-slate-200 dark:border-slate-800 w-16">
                          {row.label}
                        </td>
                        <td className="px-0.5 py-0 text-[10.8px] text-center border-r border-slate-200 dark:border-slate-800 w-16">-</td>
                        {/* 갱폼 */}
                        <TradeInputCell
                          value={groupTrade.gangForm?.areaM2 ?? null}
                          onChange={(v) => updateTrade(specialFloorId, tradeGroup, 'gangForm.areaM2', v)}
                          rowIndex={rowIndex}
                          colIndex={2}
                          floorId={specialFloorId}
                          tradeGroup={tradeGroup}
                          fieldPath="gangForm.areaM2"
                          onPaste={handlePaste}
                          onSelect={handleCellSelect}
                          onDragStart={handleDragStart}
                          onTextDragStart={handleTextDragStart}
                          onTextDragEnd={handleTextDragEnd}
                          isDraggingText={isDraggingText}
                          isDraggingTextRef={isDraggingTextRef}
                          isSelected={selectedCells.has(`${rowIndex}-2`)}
                        />
                        {/* 알폼 */}
                        <TradeInputCell
                          value={groupTrade.alForm?.areaM2 ?? null}
                          onChange={(v) => updateTrade(specialFloorId, tradeGroup, 'alForm.areaM2', v)}
                          rowIndex={rowIndex}
                          colIndex={3}
                          floorId={specialFloorId}
                          tradeGroup={tradeGroup}
                          fieldPath="alForm.areaM2"
                          onPaste={handlePaste}
                          onSelect={handleCellSelect}
                          onDragStart={handleDragStart}
                          onTextDragStart={handleTextDragStart}
                          onTextDragEnd={handleTextDragEnd}
                          isDraggingText={isDraggingText}
                          isDraggingTextRef={isDraggingTextRef}
                          isSelected={selectedCells.has(`${rowIndex}-3`)}
                        />
                        {/* 형틀 */}
                        <TradeInputCell
                          value={groupTrade.formwork?.areaM2 ?? null}
                          onChange={(v) => updateTrade(specialFloorId, tradeGroup, 'formwork.areaM2', v)}
                          rowIndex={rowIndex}
                          colIndex={4}
                          floorId={specialFloorId}
                          tradeGroup={tradeGroup}
                          fieldPath="formwork.areaM2"
                          onPaste={handlePaste}
                          onSelect={handleCellSelect}
                          onDragStart={handleDragStart}
                          onTextDragStart={handleTextDragStart}
                          onTextDragEnd={handleTextDragEnd}
                          isDraggingText={isDraggingText}
                          isDraggingTextRef={isDraggingTextRef}
                          isSelected={selectedCells.has(`${rowIndex}-4`)}
                        />
                        {/* 해체/정리 */}
                        <TradeInputCell
                          value={groupTrade.stripClean?.areaM2 ?? null}
                          onChange={(v) => updateTrade(specialFloorId, tradeGroup, 'stripClean.areaM2', v)}
                          rowIndex={rowIndex}
                          colIndex={5}
                          floorId={specialFloorId}
                          tradeGroup={tradeGroup}
                          fieldPath="stripClean.areaM2"
                          onPaste={handlePaste}
                          onSelect={handleCellSelect}
                          onDragStart={handleDragStart}
                          onTextDragStart={handleTextDragStart}
                          onTextDragEnd={handleTextDragEnd}
                          isDraggingText={isDraggingText}
                          isDraggingTextRef={isDraggingTextRef}
                          isSelected={selectedCells.has(`${rowIndex}-5`)}
                        />
                        {/* 철근 */}
                        <TradeInputCell
                          value={groupTrade.rebar?.ton ?? null}
                          onChange={(v) => updateTrade(specialFloorId, tradeGroup, 'rebar.ton', v)}
                          rowIndex={rowIndex}
                          colIndex={6}
                          floorId={specialFloorId}
                          tradeGroup={tradeGroup}
                          fieldPath="rebar.ton"
                          onPaste={handlePaste}
                          onSelect={handleCellSelect}
                          onDragStart={handleDragStart}
                          onTextDragStart={handleTextDragStart}
                          onTextDragEnd={handleTextDragEnd}
                          isDraggingText={isDraggingText}
                          isDraggingTextRef={isDraggingTextRef}
                          isSelected={selectedCells.has(`${rowIndex}-6`)}
                        />
                        {/* 콘크리트 */}
                        <TradeInputCell
                          value={groupTrade.concrete?.volumeM3 ?? null}
                          onChange={(v) => updateTrade(specialFloorId, tradeGroup, 'concrete.volumeM3', v)}
                          rowIndex={rowIndex}
                          colIndex={7}
                          floorId={specialFloorId}
                          tradeGroup={tradeGroup}
                          fieldPath="concrete.volumeM3"
                          onPaste={handlePaste}
                          onSelect={handleCellSelect}
                          onDragStart={handleDragStart}
                          onTextDragStart={handleTextDragStart}
                          onTextDragEnd={handleTextDragEnd}
                          isDraggingText={isDraggingText}
                          isDraggingTextRef={isDraggingTextRef}
                          isSelected={selectedCells.has(`${rowIndex}-7`)}
                        />
                      </tr>
                    );
                  }

                  // 일반 층 행
                  const floorTrade = getTrade(floorId, tradeGroup);
                  const floorClass = row.floor?.floorClass || '';
                  
                  return (
                    <tr key={row.floor?.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="px-0.5 py-0 text-[10.8px] text-center border-r border-slate-200 dark:border-slate-800 w-16">{floorClass}</td>
                      <td className="px-0.5 py-0 text-[10.8px] text-center font-medium border-r border-slate-200 dark:border-slate-800 w-16">
                        {row.label}
                      </td>
                      {/* 갱폼 */}
                      <TradeInputCell
                        value={floorTrade.gangForm?.areaM2 ?? null}
                        onChange={(v) => updateTrade(floorId, tradeGroup, 'gangForm.areaM2', v)}
                        rowIndex={rowIndex}
                        colIndex={2}
                        floorId={floorId}
                        tradeGroup={tradeGroup}
                        fieldPath="gangForm.areaM2"
                        onPaste={handlePaste}
                        onSelect={handleCellSelect}
                        onDragStart={handleDragStart}
                          onTextDragStart={handleTextDragStart}
                          onTextDragEnd={handleTextDragEnd}
                          isDraggingText={isDraggingText}
                          isDraggingTextRef={isDraggingTextRef}
                          isSelected={selectedCells.has(`${rowIndex}-2`)}
                        />
                      {/* 알폼 */}
                      <TradeInputCell
                          value={floorTrade.alForm?.areaM2 ?? null}
                        onChange={(v) => updateTrade(floorId, tradeGroup, 'alForm.areaM2', v)}
                        rowIndex={rowIndex}
                        colIndex={3}
                        floorId={floorId}
                        tradeGroup={tradeGroup}
                        fieldPath="alForm.areaM2"
                        onPaste={handlePaste}
                        onSelect={handleCellSelect}
                        onDragStart={handleDragStart}
                        onTextDragStart={handleTextDragStart}
                        onTextDragEnd={handleTextDragEnd}
                        isDraggingText={isDraggingText}
                        isSelected={selectedCells.has(`${rowIndex}-3`)}
                      />
                      {/* 형틀 */}
                      <TradeInputCell
                          value={floorTrade.formwork?.areaM2 ?? null}
                        onChange={(v) => updateTrade(floorId, tradeGroup, 'formwork.areaM2', v)}
                        rowIndex={rowIndex}
                        colIndex={4}
                        floorId={floorId}
                        tradeGroup={tradeGroup}
                        fieldPath="formwork.areaM2"
                        onPaste={handlePaste}
                        onSelect={handleCellSelect}
                        onDragStart={handleDragStart}
                        onTextDragStart={handleTextDragStart}
                        onTextDragEnd={handleTextDragEnd}
                        isDraggingText={isDraggingText}
                        isSelected={selectedCells.has(`${rowIndex}-4`)}
                      />
                      {/* 해체/정리 */}
                      <TradeInputCell
                        value={floorTrade.stripClean?.areaM2 ?? null}
                        onChange={(v) => updateTrade(floorId, tradeGroup, 'stripClean.areaM2', v)}
                        rowIndex={rowIndex}
                        colIndex={5}
                        floorId={floorId}
                        tradeGroup={tradeGroup}
                        fieldPath="stripClean.areaM2"
                        onPaste={handlePaste}
                        onSelect={handleCellSelect}
                        onDragStart={handleDragStart}
                        onTextDragStart={handleTextDragStart}
                        onTextDragEnd={handleTextDragEnd}
                        isDraggingText={isDraggingText}
                        isSelected={selectedCells.has(`${rowIndex}-5`)}
                      />
                      {/* 철근 */}
                      <TradeInputCell
                          value={floorTrade.rebar?.ton ?? null}
                        onChange={(v) => updateTrade(floorId, tradeGroup, 'rebar.ton', v)}
                        rowIndex={rowIndex}
                        colIndex={6}
                        floorId={floorId}
                        tradeGroup={tradeGroup}
                        fieldPath="rebar.ton"
                        onPaste={handlePaste}
                        onSelect={handleCellSelect}
                        onDragStart={handleDragStart}
                        onTextDragStart={handleTextDragStart}
                        onTextDragEnd={handleTextDragEnd}
                        isDraggingText={isDraggingText}
                        isSelected={selectedCells.has(`${rowIndex}-6`)}
                      />
                      {/* 콘크리트 */}
                      <TradeInputCell
                          value={floorTrade.concrete?.volumeM3 ?? null}
                        onChange={(v) => updateTrade(floorId, tradeGroup, 'concrete.volumeM3', v)}
                        rowIndex={rowIndex}
                        colIndex={7}
                        floorId={floorId}
                        tradeGroup={tradeGroup}
                        fieldPath="concrete.volumeM3"
                        onPaste={handlePaste}
                        onSelect={handleCellSelect}
                        onDragStart={handleDragStart}
                        onTextDragStart={handleTextDragStart}
                        onTextDragEnd={handleTextDragEnd}
                        isDraggingText={isDraggingText}
                        isSelected={selectedCells.has(`${rowIndex}-7`)}
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

// 헬퍼 컴포넌트: 입력 셀
function TradeInputCell({ 
  value, 
  onChange,
  rowIndex,
  colIndex,
  floorId,
  tradeGroup,
  fieldPath,
  onPaste,
  onSelect,
  onDragStart,
  onTextDragStart,
  onTextDragEnd,
  isDraggingText,
  isDraggingTextRef,
  isSelected
}: { 
  value: number | null | undefined; 
  onChange: (value: number | null) => void;
  rowIndex?: number;
  colIndex?: number;
  floorId?: string;
  tradeGroup?: string;
  fieldPath?: string;
  onPaste?: (e: React.ClipboardEvent, startRow: number, startCol: number) => void;
  onSelect?: (rowIndex: number, colIndex: number, isMultiSelect: boolean) => void;
  onDragStart?: (rowIndex: number, colIndex: number) => void;
  onTextDragStart?: () => void;
  onTextDragEnd?: () => void;
  isDraggingText?: boolean;
  isDraggingTextRef?: React.MutableRefObject<boolean>;
  isSelected?: boolean;
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

  // 포맷팅된 값 생성 (천단위 구분자 포함, 소수점 2자리 고정)
  const formatValue = (num: number | null | undefined): string => {
    if (num === null || num === undefined || num === 0) return '';
    // 모든 값을 소수점 2자리까지 표시 (한 자리면 뒤에 0 추가)
      return num.toLocaleString('ko-KR', { 
      minimumFractionDigits: 2,
        maximumFractionDigits: 2 
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorTradeTable.tsx:TradeInputCell:handleMouseDown',message:'Input mouseDown',data:{rowIndex,colIndex,targetTag:(e.target as HTMLElement).tagName,button:e.button},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // input 필드 내부 이벤트가 부모로 전파되지 않도록 함
    // 단, 기본 텍스트 선택 동작은 허용해야 하므로 preventDefault는 호출하지 않음
    e.stopPropagation();
    
    // 텍스트 선택 드래그 시작 (전역 상태로 관리)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorTradeTable.tsx:TradeInputCell:handleMouseDown:beforeTextDragStart',message:'Before onTextDragStart',data:{rowIndex,colIndex,hasOnTextDragStart:!!onTextDragStart},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    if (onTextDragStart) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorTradeTable.tsx:TradeInputCell:handleMouseDown:callingTextDragStart',message:'Calling onTextDragStart',data:{rowIndex,colIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      onTextDragStart();
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorTradeTable.tsx:TradeInputCell:handleMouseDown:noTextDragStart',message:'onTextDragStart not provided',data:{rowIndex,colIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
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
      
      // input 필드 내부에서 드래그할 때는 텍스트 선택을 허용
      // input 필드의 가장자리나 셀 외부에서 드래그할 때만 셀 선택 드래그 시작
      // 여기서는 input 필드 내부이므로 셀 선택 드래그를 시작하지 않음
      
      if (onSelect) {
        onSelect(rowIndex, colIndex, isMultiSelect);
      }
    }
  };

  // input 필드에서 마우스 이동 (텍스트 선택 허용)
  const handleInputMouseMove = (e: React.MouseEvent<HTMLInputElement>) => {
    // #region agent log
    const draggingTextValue = isDraggingTextRef?.current ?? isDraggingText ?? false;
    fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorTradeTable.tsx:TradeInputCell:handleInputMouseMove',message:'Input mouseMove',data:{rowIndex,colIndex,buttons:e.buttons,isDraggingText,isDraggingTextRefValue:isDraggingTextRef?.current,draggingTextValue,hasRef:!!isDraggingTextRef},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    // input 필드 내부에서 마우스 이동 시 기본 동작(텍스트 선택) 허용
    e.stopPropagation();
  };

  // td 요소에서 마우스 다운 (셀 선택 드래그 시작)
  const handleCellMouseDown = (e: React.MouseEvent<HTMLTableCellElement>) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorTradeTable.tsx:TradeInputCell:handleCellMouseDown',message:'Cell mouseDown',data:{rowIndex,colIndex,targetTag:(e.target as HTMLElement).tagName,isInput:(e.target as HTMLElement).tagName==='INPUT'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // input 필드 내부가 아닐 때만 셀 선택 드래그 시작
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.closest('input')) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorTradeTable.tsx:TradeInputCell:handleCellMouseDown:skipped',message:'Cell mouseDown skipped - input field',data:{rowIndex,colIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return; // input 필드 내부이면 텍스트 선택 허용
    }
    
    if (rowIndex !== undefined && colIndex !== undefined && onDragStart) {
      const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
      if (!isMultiSelect) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorTradeTable.tsx:TradeInputCell:handleCellMouseDown:dragStart',message:'Cell drag start',data:{rowIndex,colIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        onDragStart(rowIndex, colIndex);
      }
      
      if (onSelect) {
        onSelect(rowIndex, colIndex, isMultiSelect);
      }
    }
  };

  return (
    <td 
      className={`px-0.5 py-0 border-r border-slate-200 dark:border-slate-800 ${isSelected ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
      onMouseDown={handleCellMouseDown}
    >
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
        className="w-full h-5 text-[10.8px] p-0.5 border-0 rounded-none text-center focus:ring-0 focus-visible:ring-0"
      />
    </td>
  );
}


