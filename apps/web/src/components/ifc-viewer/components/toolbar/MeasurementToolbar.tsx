'use client';

import { Ruler, Square, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useMeasurements } from '../../hooks/useMeasurements';

/**
 * 측정 툴바 컴포넌트
 *
 * 거리, 면적 측정 도구를 제공합니다.
 */
export function MeasurementToolbar() {
  const {
    isDistanceMeasuring,
    isAreaMeasuring,
    isMeasuring,
    startDistanceMeasurement,
    startAreaMeasurement,
    stopMeasurement,
    deleteLastMeasurement,
    deleteAllMeasurements,
  } = useMeasurements();

  return (
    <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg p-1 border border-zinc-300 dark:border-slate-600 flex flex-col gap-1">
      <div className="text-xs text-zinc-600 dark:text-slate-400 px-2 py-1 font-medium">측정</div>

      {/* 거리 측정 */}
      <Button
        variant="ghost"
        size="sm"
        className={`w-full justify-start gap-2 text-xs ${
          isDistanceMeasuring ? 'text-primary bg-primary/10' : 'text-zinc-600 dark:text-slate-300'
        }`}
        onClick={isDistanceMeasuring ? stopMeasurement : startDistanceMeasurement}
        title="거리 측정 (클릭으로 점 추가, ESC로 취소)"
      >
        <Ruler className="h-4 w-4" />
        거리
        {isDistanceMeasuring && <span className="ml-auto text-[10px] opacity-70">활성</span>}
      </Button>

      {/* 면적 측정 */}
      <Button
        variant="ghost"
        size="sm"
        className={`w-full justify-start gap-2 text-xs ${
          isAreaMeasuring ? 'text-primary bg-primary/10' : 'text-zinc-600 dark:text-slate-300'
        }`}
        onClick={isAreaMeasuring ? stopMeasurement : startAreaMeasurement}
        title="면적 측정 (클릭으로 점 추가, ESC로 취소)"
      >
        <Square className="h-4 w-4" />
        면적
        {isAreaMeasuring && <span className="ml-auto text-[10px] opacity-70">활성</span>}
      </Button>

      {/* 측정 중일 때 추가 컨트롤 */}
      {isMeasuring && (
        <div className="border-t border-zinc-200 dark:border-slate-600 pt-1 mt-1 space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs text-zinc-600 dark:text-slate-300"
            onClick={deleteLastMeasurement}
            title="마지막 측정 삭제"
          >
            <X className="h-4 w-4" />
            마지막 삭제
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs text-destructive"
            onClick={deleteAllMeasurements}
            title="모든 측정 삭제"
          >
            <Trash2 className="h-4 w-4" />
            모두 삭제
          </Button>
        </div>
      )}

      {/* 힌트 */}
      {isMeasuring && (
        <div className="text-[10px] text-zinc-500 dark:text-slate-500 px-2 py-1 border-t border-zinc-200 dark:border-slate-600 mt-1">
          클릭: 점 추가 | ESC: 취소
        </div>
      )}
    </div>
  );
}
