'use client';

import { useState, useEffect, useMemo } from 'react';
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@/components/ui';
import type { UnitRateItem } from '@/lib/types';
import { getUnitRates, saveUnitRates, updateUnitRateItem, deleteUnitRateItem } from '@/lib/services/unitRates';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

interface Props {
  projectId: string;
}

const TRADE_OPTIONS = [
  '전체',
  '형틀',
  '갱폼',
  '알폼',
  '해체정리',
  '철근',
  '타설',
];

export function PlannedUnitRatePage({ projectId }: Props) {
  const [items, setItems] = useState<UnitRateItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);

  // 초기 데이터 로드
  useEffect(() => {
    loadItems();
  }, [projectId]);

  const loadItems = async () => {
    try {
      setIsLoading(true);
      const data = await getUnitRates(projectId, 'planned');
      
      // 데이터가 없으면 기본 템플릿 데이터 생성 (공종, 구분, 규격, 단위만 미리 채움)
      if (data.length === 0) {
        const sampleData: UnitRateItem[] = [
          {
            id: '1',
            trade: '형틀',
            category: '거푸집 설치-합판',
            spec: '',
            unit: 'M2',
            quantity: 0,
            materialUnit: 0,
            materialAmount: 0,
            laborUnit: 0,
            laborAmount: 0,
          },
          {
            id: '2',
            trade: '형틀',
            category: '거푸집 설치-유로폼',
            spec: '',
            unit: 'M2',
            quantity: 0,
            materialUnit: 0,
            materialAmount: 0,
            laborUnit: 0,
            laborAmount: 0,
          },
          {
            id: '3',
            trade: '형틀',
            category: '지수판설치',
            spec: 'PVC,기초(바닥용)',
            unit: 'M',
            quantity: 0,
            materialUnit: 0,
            materialAmount: 0,
            laborUnit: 0,
            laborAmount: 0,
          },
          {
            id: '4',
            trade: '형틀',
            category: '지수판설치',
            spec: 'PVC, 옹벽/슬라브(B1,B2)',
            unit: 'M',
            quantity: 0,
            materialUnit: 0,
            materialAmount: 0,
            laborUnit: 0,
            laborAmount: 0,
          },
          {
            id: '5',
            trade: '형틀',
            category: '끓어치기-기초',
            spec: '리브라스, 다막아',
            unit: 'M',
            quantity: 0,
            materialUnit: 0,
            materialAmount: 0,
            laborUnit: 0,
            laborAmount: 0,
          },
          {
            id: '6',
            trade: '형틀',
            category: '끓어치기-옹벽, 보, 슬라브',
            spec: '리브라스, 다막아',
            unit: 'M',
            quantity: 0,
            materialUnit: 0,
            materialAmount: 0,
            laborUnit: 0,
            laborAmount: 0,
          },
          {
            id: '7',
            trade: '형틀',
            category: '끓어치기-무근',
            spec: '버림, 누름',
            unit: 'M',
            quantity: 0,
            materialUnit: 0,
            materialAmount: 0,
            laborUnit: 0,
            laborAmount: 0,
          },
          {
            id: '8',
            trade: '갱폼',
            category: '갱폼설치 및 해체(기준층)',
            spec: '',
            unit: 'M2',
            quantity: 0,
            materialUnit: 0,
            materialAmount: 0,
            laborUnit: 0,
            laborAmount: 0,
          },
          {
            id: '9',
            trade: '갱폼',
            category: '갱폼설치 및 해체(셋팅층)',
            spec: '셋팅층, 조립',
            unit: 'M2',
            quantity: 0,
            materialUnit: 0,
            materialAmount: 0,
            laborUnit: 0,
            laborAmount: 0,
          },
          {
            id: '10',
            trade: '갱폼',
            category: '갱폼설치 및 해체(마감층)',
            spec: '',
            unit: 'M2',
            quantity: 0,
            materialUnit: 0,
            materialAmount: 0,
            laborUnit: 0,
            laborAmount: 0,
          },
          {
            id: '11',
            trade: '알폼',
            category: 'A/L폼설치 및 해체(기준층)',
            spec: '',
            unit: 'M2',
            quantity: 0,
            materialUnit: 0,
            materialAmount: 0,
            laborUnit: 0,
            laborAmount: 0,
          },
          {
            id: '12',
            trade: '알폼',
            category: 'A/L폼설치 및 해체(셋팅층)',
            spec: '',
            unit: 'M2',
            quantity: 0,
            materialUnit: 0,
            materialAmount: 0,
            laborUnit: 0,
            laborAmount: 0,
          },
          {
            id: '13',
            trade: '알폼',
            category: 'A/L폼설치 및 해체(마감층)',
            spec: '',
            unit: 'M2',
            quantity: 0,
            materialUnit: 0,
            materialAmount: 0,
            laborUnit: 0,
            laborAmount: 0,
          },
          {
            id: '14',
            trade: '해체정리',
            category: '거푸집 해체, 정리-합판, 유로폼',
            spec: '거푸집해체/반출용쌓기/1차청소(삽)',
            unit: 'M2',
            quantity: 0,
            materialUnit: 0,
            materialAmount: 0,
            laborUnit: 0,
            laborAmount: 0,
          },
          {
            id: '15',
            trade: '철근',
            category: '커플러',
            spec: '22mm',
            unit: '개',
            quantity: 0,
            materialUnit: 0,
            materialAmount: 0,
            laborUnit: 0,
            laborAmount: 0,
          },
          {
            id: '16',
            trade: '철근',
            category: '철근 조립',
            spec: '',
            unit: 'TON',
            quantity: 0,
            materialUnit: 0,
            materialAmount: 0,
            laborUnit: 0,
            laborAmount: 0,
          },
          {
            id: '17',
            trade: '타설',
            category: '철근콘크리트타설-철근',
            spec: '',
            unit: 'M3',
            quantity: 0,
            materialUnit: 0,
            materialAmount: 0,
            laborUnit: 0,
            laborAmount: 0,
          },
          {
            id: '18',
            trade: '타설',
            category: '철근콘크리트타설-무근',
            spec: '',
            unit: 'M3',
            quantity: 0,
            materialUnit: 0,
            materialAmount: 0,
            laborUnit: 0,
            laborAmount: 0,
          },
          {
            id: '19',
            trade: '타설',
            category: 'C급 콘크리트 치기(레미콘별도)',
            spec: '25-18-8',
            unit: 'M3',
            quantity: 0,
            materialUnit: 0,
            materialAmount: 0,
            laborUnit: 0,
            laborAmount: 0,
          },
        ];
        
        await saveUnitRates(projectId, 'planned', sampleData);
        setItems(sampleData);
      } else {
        setItems(data);
      }
    } catch (error) {
      console.error('Failed to load unit rates:', error);
      toast.error('단가 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveUnitRates(projectId, 'planned', items);
      toast.success('단가 정보가 저장되었습니다.');
    } catch (error) {
      console.error('Failed to save unit rates:', error);
      toast.error('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };


  const handleDelete = async (itemId: string) => {
    if (!window.confirm('정말 이 행을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteUnitRateItem(projectId, 'planned', itemId);
      setItems(items.filter(item => item.id !== itemId));
      toast.success('행이 삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete row:', error);
      toast.error('삭제에 실패했습니다.');
    }
  };

  const handleCellUpdate = async (
    itemId: string,
    field: keyof Omit<UnitRateItem, 'id' | 'materialAmount' | 'laborAmount'>,
    value: number | null
  ) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // 먼저 로컬 상태 업데이트 (즉시 반영)
    // null은 0으로 변환 (타입 호환성, 표시는 formatValue에서 0을 빈칸으로 처리)
    const updatedItem = { ...item, [field]: value ?? 0 };
    
    // 수량이나 단가가 변경되면 금액 자동 계산 (null은 0으로 처리)
    if (field === 'quantity' || field === 'materialUnit') {
      const quantity = field === 'quantity' ? (value ?? 0) : (updatedItem.quantity ?? 0);
      const materialUnit = field === 'materialUnit' ? (value ?? 0) : (updatedItem.materialUnit ?? 0);
      updatedItem.materialAmount = quantity * materialUnit;
    }

    if (field === 'quantity' || field === 'laborUnit') {
      const quantity = field === 'quantity' ? (value ?? 0) : (updatedItem.quantity ?? 0);
      const laborUnit = field === 'laborUnit' ? (value ?? 0) : (updatedItem.laborUnit ?? 0);
      updatedItem.laborAmount = quantity * laborUnit;
    }

    // 로컬 상태 즉시 업데이트
    setItems(items.map(i => (i.id === itemId ? updatedItem : i)));

    // 서버에 저장 (debounce 없이 즉시 저장)
    try {
      const updates: Partial<UnitRateItem> = {
        [field]: value ?? 0,
        materialAmount: updatedItem.materialAmount,
        laborAmount: updatedItem.laborAmount,
      };
      await updateUnitRateItem(projectId, 'planned', itemId, updates);
    } catch (error) {
      console.error('Failed to update cell:', error);
      // 실패 시 이전 상태로 복구
      setItems(items);
      toast.error('업데이트에 실패했습니다.');
    }
  };

  // 컬럼 매핑: 컬럼 인덱스 → fieldName
  const getColumnField = (colIndex: number): 'quantity' | 'materialUnit' | 'laborUnit' | null => {
    // 0: 공종, 1: 구분, 2: 규격, 3: 단위는 건너뛰기
    // 4: 수량, 5: 재료비단가, 6: 재료비금액(읽기전용), 7: 노무비단가, 8: 노무비금액(읽기전용)
    if (colIndex === 4) return 'quantity';
    if (colIndex === 5) return 'materialUnit';
    if (colIndex === 7) return 'laborUnit';
    return null;
  };

  // 엑셀 붙여넣기 핸들러
  const handlePaste = async (e: React.ClipboardEvent, startRowIndex: number, startColIndex: number) => {
    e.preventDefault();
    
    const clipboardData = e.clipboardData.getData('text/plain');
    if (!clipboardData.trim()) return;

    // 탭과 줄바꿈으로 파싱
    const pastedRows = clipboardData.split('\n').map(row => {
      // 각 행을 탭으로 분리하되, 빈 셀도 유지
      const cells = row.split('\t');
      // 빈 문자열도 빈 셀로 인식하도록 처리
      return cells.map(cell => cell || '');
    });
    
    // 완전히 빈 행만 제거 (모든 셀이 빈 경우)
    const validRows = pastedRows.filter(row => row.some(cell => cell.trim() || cell === ''));
    
    if (validRows.length === 0) return;

    try {
      // 아이템별로 업데이트를 그룹화 (같은 아이템의 여러 필드를 한 번에 업데이트)
      const itemUpdates = new Map<string, { quantity?: number | null; materialUnit?: number | null; laborUnit?: number | null }>();
      
      // 각 셀의 데이터를 수집
      validRows.forEach((pastedRow, rowOffset) => {
        const actualRowIndex = startRowIndex + rowOffset;
        
        if (actualRowIndex >= items.length) return;
        
        const item = items[actualRowIndex];
        if (!item) return;
        
        // 각 컬럼 처리 (첫 번째 셀부터 시작)
        // colOffset은 붙여넣은 데이터의 컬럼 오프셋 (0부터 시작)
        pastedRow.forEach((cellValue, colOffset) => {
          const actualColIndex = startColIndex + colOffset;
          const field = getColumnField(actualColIndex);
          
          // 입력 가능한 컬럼이 아니면 건너뛰기
          // (예: 공종, 구분, 규격, 단위, 재료비금액, 노무비금액 컬럼)
          if (!field) {
            return;
          }
          
          // 빈 셀 체크 (공백, 탭, 빈 문자열 모두 빈 셀로 처리)
          const trimmedValue = (cellValue || '').trim();
          
          let numValue: number | null = null;
          
          // 빈 셀이 아닌 경우 숫자로 변환
          if (trimmedValue) {
            // 숫자로 변환 (천단위 구분자 제거)
            const cleanedValue = trimmedValue.replace(/,/g, '').replace(/\s/g, '');
            const parsed = parseFloat(cleanedValue);
            if (!isNaN(parsed)) {
              numValue = parsed;
            }
            // 숫자가 아닌 경우 null (빈칸 처리)
          }
          // 빈 셀인 경우 null 유지
          
          // 아이템별로 업데이트 그룹화 (빈 셀도 null로 포함하여 명시적으로 업데이트)
          if (!itemUpdates.has(item.id)) {
            itemUpdates.set(item.id, {});
          }
          const updates = itemUpdates.get(item.id)!;
          // undefined가 아닌 경우에만 업데이트 (빈 셀도 null로 명시적으로 설정)
          updates[field] = numValue;
        });
      });
      
      // 로컬 상태 먼저 업데이트 (배치)
      const updatedItems = items.map(item => {
        const updates = itemUpdates.get(item.id);
        if (!updates) return item;
        
        const updatedItem = { ...item };
        
        // 각 필드 업데이트 (null은 0으로 변환하여 저장)
        if (updates.quantity !== undefined) {
          updatedItem.quantity = updates.quantity ?? 0;
        }
        if (updates.materialUnit !== undefined) {
          updatedItem.materialUnit = updates.materialUnit ?? 0;
        }
        if (updates.laborUnit !== undefined) {
          updatedItem.laborUnit = updates.laborUnit ?? 0;
        }
        
        // 금액 자동 계산 (null은 0으로 처리)
        const qty = updatedItem.quantity ?? 0;
        const matUnit = updatedItem.materialUnit ?? 0;
        const labUnit = updatedItem.laborUnit ?? 0;
        updatedItem.materialAmount = qty * matUnit;
        updatedItem.laborAmount = qty * labUnit;
        
        return updatedItem;
      });
      
      // 로컬 상태 업데이트
      setItems(updatedItems);
      
      // 서버에 저장 (배치)
      const savePromises = Array.from(itemUpdates.entries()).map(([itemId, updates]) => {
        const item = updatedItems.find(i => i.id === itemId);
        if (!item) return Promise.resolve();
        
        const serverUpdates: Partial<UnitRateItem> = {
          materialAmount: item.materialAmount,
          laborAmount: item.laborAmount,
        };
        
        if (updates.quantity !== undefined) {
          serverUpdates.quantity = updates.quantity ?? 0;
        }
        if (updates.materialUnit !== undefined) {
          serverUpdates.materialUnit = updates.materialUnit ?? 0;
        }
        if (updates.laborUnit !== undefined) {
          serverUpdates.laborUnit = updates.laborUnit ?? 0;
        }
        
        return updateUnitRateItem(projectId, 'planned', itemId, serverUpdates);
      });
      
      await Promise.all(savePromises);
      
      toast.success(`${validRows.length}행의 데이터가 붙여넣기되었습니다.`);
    } catch (error) {
      toast.error('붙여넣기에 실패했습니다.');
      console.error('Paste error:', error);
      // 실패 시 이전 상태로 복구
      setItems(items);
    }
  };

  // 셀 선택 핸들러
  const handleCellSelect = (rowIndex: number, colIndex: number, isMultiSelect: boolean) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    
    if (isMultiSelect) {
      setSelectedCells(prev => {
        const newSet = new Set(prev);
        if (newSet.has(cellKey)) {
          newSet.delete(cellKey);
        } else {
          newSet.add(cellKey);
        }
        return newSet;
      });
    } else {
      setSelectedCells(new Set([cellKey]));
      setSelectionStart({ row: rowIndex, col: colIndex });
    }
  };

  // 공종별 합계 계산
  const tradeSummary = useMemo(() => {
    const summary: Record<string, { materialTotal: number; laborTotal: number }> = {};
    
    items.forEach(item => {
      if (!summary[item.trade]) {
        summary[item.trade] = { materialTotal: 0, laborTotal: 0 };
      }
      summary[item.trade].materialTotal += item.materialAmount || 0;
      summary[item.trade].laborTotal += item.laborAmount || 0;
    });

    return summary;
  }, [items]);

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined || num === 0) return '';
    // 소수점이 있는 경우 소수점도 표시
    if (num % 1 !== 0) {
      return num.toLocaleString('ko-KR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      });
    }
    return num.toLocaleString('ko-KR');
  };

  return (
    <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>단가 입력</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 테이블 */}
          <div className="overflow-x-auto">
            <div className="min-w-[1400px]">
              <table className="w-full border-collapse text-[9px] table-fixed">
                <thead className="sticky top-0 z-10 bg-white dark:bg-slate-950">
                  <tr className="border-b-2 border-slate-300 dark:border-slate-700">
                    <th className="px-0.5 py-0.5 text-center text-[9px] font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 w-16 sticky left-0 z-20">
                      공종
                    </th>
                    <th className="px-0.5 py-0.5 text-center text-[9px] font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 w-32">
                      구분
                    </th>
                    <th className="px-0.5 py-0.5 text-center text-[9px] font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 w-24">
                      규격
                    </th>
                    <th className="px-0.5 py-0.5 text-center text-[9px] font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 w-16">
                      단위
                    </th>
                    <th className="px-0.5 py-0.5 text-center text-[9px] font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 w-20">
                      수량
                    </th>
                    <th className="px-0.5 py-0.5 text-center text-[9px] font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 w-20">
                      재료비단가
                    </th>
                    <th className="px-0.5 py-0.5 text-center text-[9px] font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 w-24">
                      재료비 금액
                    </th>
                    <th className="px-0.5 py-0.5 text-center text-[9px] font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 w-20">
                      노무비단가
                    </th>
                    <th className="px-0.5 py-0.5 text-center text-[9px] font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 w-24">
                      노무비 금액
                    </th>
                  </tr>
                </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-500 dark:text-slate-400">
                      로딩 중...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-500 dark:text-slate-400">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  items.map((item, rowIndex) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                    >
                      <td className="px-0.5 py-0.5 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 sticky left-0 z-10">
                        <div className="w-full px-1 py-0.5 text-[9px] leading-tight text-slate-900 dark:text-white">
                          {item.trade}
                        </div>
                      </td>
                      <td className="px-0.5 py-0.5 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                        <div className="w-full px-1 py-0.5 text-[9px] leading-tight text-slate-900 dark:text-white">
                          {item.category}
                        </div>
                      </td>
                      <td className="px-0.5 py-0.5 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                        <div className="w-full px-1 py-0.5 text-[9px] leading-tight text-slate-900 dark:text-white">
                          {item.spec || '-'}
                        </div>
                      </td>
                      <td className="px-0.5 py-0.5 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                        <div className="w-full px-1 py-0.5 text-[9px] leading-tight text-center text-slate-900 dark:text-white">
                          {item.unit}
                        </div>
                      </td>
                      <UnitRateInputCell
                        value={item.quantity}
                        onChange={(val) => handleCellUpdate(item.id, 'quantity', val)}
                        rowIndex={rowIndex}
                        colIndex={4}
                        onPaste={handlePaste}
                        onSelect={handleCellSelect}
                        isSelected={selectedCells.has(`${rowIndex}-4`)}
                      />
                      <UnitRateInputCell
                        value={item.materialUnit}
                        onChange={(val) => handleCellUpdate(item.id, 'materialUnit', val)}
                        rowIndex={rowIndex}
                        colIndex={5}
                        onPaste={handlePaste}
                        onSelect={handleCellSelect}
                        isSelected={selectedCells.has(`${rowIndex}-5`)}
                      />
                      <td className="px-0.5 py-0.5 text-right text-[9px] leading-tight text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 font-medium border-r border-slate-200 dark:border-slate-800">
                        {formatNumber(item.materialAmount)}
                      </td>
                      <UnitRateInputCell
                        value={item.laborUnit}
                        onChange={(val) => handleCellUpdate(item.id, 'laborUnit', val)}
                        rowIndex={rowIndex}
                        colIndex={7}
                        onPaste={handlePaste}
                        onSelect={handleCellSelect}
                        isSelected={selectedCells.has(`${rowIndex}-7`)}
                      />
                      <td className="px-0.5 py-0.5 text-right text-[9px] leading-tight text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 font-medium border-r border-slate-200 dark:border-slate-800">
                        {formatNumber(item.laborAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}

// 입력 셀 컴포넌트 (물량 입력 표와 동일한 방식)
function UnitRateInputCell({ 
  value, 
  onChange,
  rowIndex,
  colIndex,
  onPaste,
  onSelect,
  isSelected
}: { 
  value: number | null | undefined; 
  onChange: (value: number | null) => void;
  rowIndex: number;
  colIndex: number;
  onPaste?: (e: React.ClipboardEvent, startRow: number, startCol: number) => void;
  onSelect?: (rowIndex: number, colIndex: number, isMultiSelect: boolean) => void;
  isSelected?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState('');

  // 포맷팅된 값 생성 (천단위 구분자 포함)
  const formatValue = (num: number | null | undefined): string => {
    if (num === null || num === undefined || num === 0) return '';
    // 소수점이 있는 경우 소수점도 표시
    if (num % 1 !== 0) {
      return num.toLocaleString('ko-KR', { 
        minimumFractionDigits: 0,
        maximumFractionDigits: 2 
      });
    }
    return num.toLocaleString('ko-KR');
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
    // 천단위 구분자 제거하여 편집 가능하게
    // 0이거나 null/undefined이면 빈 문자열로 표시
    if (value === null || value === undefined || value === 0) {
      setDisplayValue('');
    } else {
      setDisplayValue(value.toString());
    }
  };

  // 포커스를 잃었을 때
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    // 입력된 값을 숫자로 변환 (빈칸은 null)
    const parsedValue = parseValue(e.target.value);
    // null인 경우 null 전달 (빈칸 처리)
    onChange(parsedValue);
    // 포맷팅된 값으로 표시
    setDisplayValue(formatValue(parsedValue));
  };

  // 입력 중
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
  };

  // value가 변경되었을 때 displayValue 업데이트 (포커스가 없을 때만)
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatValue(value));
    }
  }, [value, isFocused]);

  const handlePaste = (e: React.ClipboardEvent) => {
    if (onPaste) {
      e.preventDefault();
      onPaste(e, rowIndex, colIndex);
    }
  };

  // Delete/Backspace 키로 셀 지우기
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    if (onSelect) {
      const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
      onSelect(rowIndex, colIndex, isMultiSelect);
    }
  };

  return (
    <td className={`px-0.5 py-0 border-r border-slate-200 dark:border-slate-800 ${isSelected ? 'bg-blue-100 dark:bg-blue-900' : ''}`}>
      <Input
        type="text"
        inputMode="decimal"
        value={isFocused ? displayValue : formatValue(value)}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
        className="w-full h-5 text-[9px] p-0.5 border-0 rounded-none text-right focus:ring-0 focus-visible:ring-0"
      />
    </td>
  );
}

