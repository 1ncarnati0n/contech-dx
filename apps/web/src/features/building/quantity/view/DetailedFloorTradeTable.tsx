'use client';

import { forwardRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui';
import { SaveStatusBar } from '../../shared/view/SaveStatusBar';
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog';
import { TradeInputCell } from './TradeInputCell';
import { ClipboardPaste, Construction } from 'lucide-react';
import type { Building, TradeData } from '@/shared/types';
import { useDetailedFloorTradeTableLogic, type DetailedFloorTradeTableHandle } from '../service/useDetailedFloorTradeTableLogic';

interface Props {
  building: Building;
  onUpdate: () => void;
}

export { type DetailedFloorTradeTableHandle as FloorTradeTableHandle };

export const DetailedFloorTradeTable = forwardRef<DetailedFloorTradeTableHandle, Props>(
  ({ building, onUpdate }, ref) => {
  const {
    floors, isSaving, hasUnsavedChanges,
    showDiscardConfirm, setShowDiscardConfirm, rows,
    getTrade, updateTrade, saveChanges, discardChanges,
    selectedCells, isDragging, isDraggingTextRef, recentlyPastedCells,
    handleCellSelect, handleDragStart, handleDragMove, handleTextDragStart, handleTextDragEnd,
    handlePaste, getFormworkTotal, getRebarTotal, getConcreteTotal,
    getQuantityInputRebar, getQuantityInputConcrete, getSummary, fv, tc,
  } = useDetailedFloorTradeTableLogic({ building, onUpdate, ref: ref as React.RefObject<DetailedFloorTradeTableHandle | null> });

  if (floors.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>층별 물량 입력</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 dark:text-slate-400">층 설정에서 층 정보를 입력해주세요.</p>
        </CardContent>
      </Card>
    );
  }

  const renderTradeInputCells = (rowIndex: number, floorId: string, tradeGroup: string, trade: TradeData) => {
    const cellProps = (colIndex: number, value: number | null | undefined, fieldPath: string) => ({
      value,
      onChange: (v: number | null) => updateTrade(floorId, tradeGroup, fieldPath, v),
      rowIndex,
      colIndex,
      floorId,
      tradeGroup,
      fieldPath,
      onPaste: handlePaste,
      onSelect: handleCellSelect,
      onDragStart: handleDragStart,
      onDragMove: handleDragMove,
      isDragging,
      onTextDragStart: handleTextDragStart,
      onTextDragEnd: handleTextDragEnd,
      isDraggingTextRef,
      isSelected: selectedCells.has(`${rowIndex}-${colIndex}`),
      isRecentlyPasted: recentlyPastedCells.has(`${rowIndex}-${colIndex}`),
    });

    const rebarInput = getQuantityInputRebar(floorId, tradeGroup);
    const concreteInput = getQuantityInputConcrete(floorId, tradeGroup);

    return (
      <>
        {/* 형틀 합계 (읽기전용) */}
        <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16">
          {fv(getFormworkTotal(trade))}
        </td>
        <TradeInputCell {...cellProps(3, trade.gangForm?.areaM2 ?? null, 'gangForm.areaM2')} />
        <TradeInputCell {...cellProps(4, trade.alForm?.areaM2 ?? null, 'alForm.areaM2')} />
        <TradeInputCell {...cellProps(5, trade.euroForm?.areaM2 ?? null, 'euroForm.areaM2')} />
        {/* 해체/정리 (읽기전용) */}
        <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16">
          {fv(getFormworkTotal(trade) * 2)}
        </td>
        {/* 철근 합계 (읽기전용 - 물량입력 값) */}
        <td className={`px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16 ${tc(rebarInput, getRebarTotal(trade))}`}>
          {fv(rebarInput)}
        </td>
        <TradeInputCell {...cellProps(8, trade.rebar?.wall ?? null, 'rebar.wall')} />
        <TradeInputCell {...cellProps(9, trade.rebar?.beamSlab ?? null, 'rebar.beamSlab')} />
        {/* 콘크리트 합계 (읽기전용 - 물량입력 값) */}
        <td className={`px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16 ${tc(concreteInput, getConcreteTotal(trade))}`}>
          {fv(concreteInput)}
        </td>
        <TradeInputCell {...cellProps(11, trade.concrete?.wall ?? null, 'concrete.wall')} />
        <TradeInputCell {...cellProps(12, trade.concrete?.beamSlab ?? null, 'concrete.beamSlab')} />
      </>
    );
  };

  return (
    <Card>
      <div className="mx-4 mt-4 mb-0 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs text-slate-600 dark:text-slate-400">
        <p className="font-medium mb-1">※ 산식 안내</p>
        <ul className="space-y-0.5 ml-3">
          <li>• 형틀 합계 = 갱폼(M²) + 알폼(M²) + 유로폼(M²)</li>
          <li>• 해체/정리 = 형틀합계(M²) × 2</li>
          <li>• 철근 합계 = 각 층 철근(TON)의 합계</li>
          <li>• 콘크리트 합계 = 각 층 콘크리트(M³)의 합계</li>
        </ul>
      </div>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>층별 물량 입력</CardTitle>
          <SaveStatusBar hasUnsavedChanges={hasUnsavedChanges} isSaving={isSaving} onSave={saveChanges} onDiscard={() => setShowDiscardConfirm(true)} />
        </div>
      </CardHeader>
      <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-b border-amber-100 dark:border-amber-800">
        <Construction className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-medium">🚧 이 기능은 현재 준비 중입니다. 곧 업데이트될 예정입니다.</span>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300 border-b border-blue-100 dark:border-blue-800">
        <ClipboardPaste className="w-4 h-4 flex-shrink-0" />
        <span>Excel에서 복사한 데이터를 셀에 붙여넣기(Ctrl+V)할 수 있습니다. 여러 셀을 한 번에 붙여넣기 가능합니다.</span>
      </div>
      <CardContent className="p-0">
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse text-xs table-fixed min-w-full">
            <caption className="sr-only">상세 물량 입력 테이블 - 형틀, 해체/정리, 철근(벽/보슬래브), 콘크리트(벽/보슬래브)</caption>
            <thead className="sticky top-0 z-10 bg-white dark:bg-slate-950">
              <tr className="border-b-2 border-slate-300 dark:border-slate-700">
                <th scope="col" rowSpan={2} className="px-1 py-1 text-center text-xs font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 w-16">구분</th>
                <th scope="col" rowSpan={2} className="px-1 py-1 text-center text-xs font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 w-16">층</th>
                <th scope="colgroup" colSpan={4} className="px-1 py-1 text-center text-xs font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">형틀</th>
                <th scope="col" className="px-1 py-1 text-center text-xs font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">해체/정리</th>
                <th scope="colgroup" colSpan={3} className="px-1 py-1 text-center text-xs font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">철근</th>
                <th scope="colgroup" colSpan={3} className="px-1 py-1 text-center text-xs font-semibold leading-tight text-slate-900 dark:text-white bg-white dark:bg-slate-950">콘크리트</th>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <th scope="col" className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16">합계(M²)</th>
                <th scope="col" className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-16">갱폼(M²)</th>
                <th scope="col" className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-16">알폼(M²)</th>
                <th scope="col" className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-16">유로폼(M²)</th>
                <th scope="col" className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-16">M²</th>
                <th scope="col" className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16">합계(TON)</th>
                <th scope="col" className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-16">벽(TON)</th>
                <th scope="col" className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-16">보/슬(TON)</th>
                <th scope="col" className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16">합계(M³)</th>
                <th scope="col" className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-16">벽(M³)</th>
                <th scope="col" className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 w-16">보/슬(M³)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => {
                if (row.type === 'summary') {
                  const gangFormSum = getSummary('gangForm.areaM2');
                  const alFormSum = getSummary('alForm.areaM2');
                  const euroFormSum = getSummary('euroForm.areaM2');
                  const rebarWallSum = getSummary('rebar.wall');
                  const rebarBeamSlabSum = getSummary('rebar.beamSlab');
                  const concreteWallSum = getSummary('concrete.wall');
                  const concreteBeamSlabSum = getSummary('concrete.beamSlab');
                  const concreteVolumeSum = getSummary('concrete.volumeM3');

                  return (
                    <tr key="summary" className="bg-slate-100 dark:bg-slate-800 font-semibold border-t-2 border-slate-300 dark:border-slate-700" style={{ height: '28px' }}>
                      <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">소계</td>
                      <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">합계</td>
                      <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16">{fv(gangFormSum + alFormSum + euroFormSum)}</td>
                      <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">{fv(gangFormSum)}</td>
                      <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">{fv(alFormSum)}</td>
                      <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">{fv(euroFormSum)}</td>
                      <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16">{fv((gangFormSum + alFormSum + euroFormSum) * 2)}</td>
                      <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16">{fv(rebarWallSum + rebarBeamSlabSum)}</td>
                      <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">{fv(rebarWallSum)}</td>
                      <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">{fv(rebarBeamSlabSum)}</td>
                      <td className={`px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16 ${tc(concreteVolumeSum, concreteWallSum + concreteBeamSlabSum)}`}>{fv(concreteVolumeSum)}</td>
                      <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">{fv(concreteWallSum)}</td>
                      <td className="px-1 py-0.5 text-xs text-center w-16">{fv(concreteBeamSlabSum)}</td>
                    </tr>
                  );
                }

                const tradeGroup = row.tradeGroup || '아파트';
                const floorId = row.floor?.id || '';

                if (row.type === 'group') {
                  const specialFloorId = `${building.id}-special-${tradeGroup}`;
                  const groupTrade = getTrade(specialFloorId, tradeGroup);
                  return (
                    <tr key={row.label} className="bg-slate-50 dark:bg-slate-900/50" style={{ height: '28px' }}>
                      <td className="px-1 py-0.5 text-xs text-center font-medium border-r border-slate-200 dark:border-slate-800 w-16">{row.label}</td>
                      <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">-</td>
                      {renderTradeInputCells(rowIndex, specialFloorId, tradeGroup, groupTrade)}
                    </tr>
                  );
                }

                const floorTrade = getTrade(floorId, tradeGroup);
                const floorClass = row.floor?.floorClass || '';
                return (
                  <tr key={row.floor?.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50" style={{ height: '28px' }}>
                    <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">{floorClass}</td>
                    <td className="px-1 py-0.5 text-xs text-center font-medium border-r border-slate-200 dark:border-slate-800 w-16">{row.label}</td>
                    {renderTradeInputCells(rowIndex, floorId, tradeGroup, floorTrade)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
      <ConfirmDialog
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
        title="변경사항 취소"
        description="저장하지 않은 변경사항이 모두 사라집니다. 정말 취소하시겠습니까?"
        variant="warning"
        confirmText="취소하기"
        cancelText="돌아가기"
        onConfirm={() => {
          discardChanges();
          setShowDiscardConfirm(false);
        }}
      />
    </Card>
  );
  }
);

DetailedFloorTradeTable.displayName = 'DetailedFloorTradeTable';
