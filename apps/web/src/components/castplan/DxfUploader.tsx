'use client';

import { logger } from '@/lib/utils/logger';
import { useRef, useState, useCallback } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui';
import { loadDxfFromFile } from '@/lib/utils/dxf-parser';
import type { ParsedDxfData, DxfParseProgress, DxfStatistics } from '@/lib/types';

interface DxfUploaderProps {
  onDxfLoaded: (data: ParsedDxfData, fileName: string) => void;
  currentFileName: string | null;
  onClear: () => void;
}

interface LoadingState {
  phase: DxfParseProgress['phase'];
  progress: number;
  message: string;
}

export function DxfUploader({ onDxfLoaded, currentFileName, onClear }: DxfUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [statistics, setStatistics] = useState<DxfStatistics | null>(null);

  const handleProgress = useCallback((progress: DxfParseProgress) => {
    setLoadingState({
      phase: progress.phase,
      progress: progress.progress,
      message: progress.message,
    });

    if (progress.statistics) {
      setStatistics(progress.statistics);
    }
  }, []);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.dxf')) {
        setError('DXF 파일만 업로드할 수 있습니다.');
        return;
      }

      setIsLoading(true);
      setError(null);
      setStatistics(null);
      setLoadingState({
        phase: 'reading',
        progress: 0,
        message: '파일 준비 중...',
      });

      try {
        const dxfData = await loadDxfFromFile(file, {
          onProgress: handleProgress,
          resolveBlocks: true,
          simplifySplines: true,
          splineSegments: 32,
        });
        onDxfLoaded(dxfData, file.name);

        // 통계 저장
        if (dxfData.statistics) {
          setStatistics(dxfData.statistics);
        }
      } catch (err) {
        logger.error('DXF 파싱 오류:', err);
        setError(
          err instanceof Error
            ? `DXF 파싱 오류: ${err.message}`
            : 'DXF 파일을 파싱할 수 없습니다. 파일 형식을 확인해주세요.'
        );
      } finally {
        setIsLoading(false);
        setLoadingState(null);
      }
    },
    [onDxfLoaded, handleProgress]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 파일이 이미 로드된 경우
  if (currentFileName) {
    return (
      <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  {currentFileName}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  DXF 파일 로드 완료
                  {statistics && (
                    <span className="ml-2">
                      · {statistics.parsedEntities.toLocaleString()}개 엔티티
                      {statistics.skippedEntities > 0 && (
                        <span className="text-yellow-600 dark:text-yellow-400">
                          {' '}({statistics.skippedEntities.toLocaleString()}개 미지원)
                        </span>
                      )}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-green-600 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* 엔티티 통계 요약 */}
          {statistics && Object.keys(statistics.entityCounts).length > 0 && (
            <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
              <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">
                엔티티 구성
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(statistics.entityCounts)
                  .filter(([key]) => !key.startsWith('SKIPPED:'))
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([type, count]) => (
                    <span
                      key={type}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200"
                    >
                      {type}: {count.toLocaleString()}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".dxf"
        onChange={handleInputChange}
        className="hidden"
      />

      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${isDragOver
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-primary-400'
          }
          ${isLoading ? 'cursor-wait' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={isLoading ? undefined : handleDrop}
        onClick={isLoading ? undefined : handleButtonClick}
      >
        {isLoading && loadingState ? (
          <div className="flex flex-col items-center gap-3">
            {/* 진행률 표시 */}
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-slate-200 dark:text-slate-700"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - loadingState.progress / 100)}`}
                  className="text-primary-500 transition-all duration-300"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                  {loadingState.progress}%
                </span>
              </div>
            </div>

            {/* 상태 메시지 */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {loadingState.message}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {getPhaseDescription(loadingState.phase)}
              </p>
            </div>

            {/* 진행률 바 */}
            <div className="w-full max-w-xs h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all duration-300 ease-out"
                style={{ width: `${loadingState.progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                DXF 파일을 드래그하거나 클릭하여 업로드
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AutoCAD DXF 형식 지원 (대용량 파일 처리 가능)
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <p className="text-xs text-red-500 dark:text-red-500 mt-1">
              DXF 파일이 손상되었거나 지원하지 않는 형식일 수 있습니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 파싱 단계 설명 반환
 */
function getPhaseDescription(phase: DxfParseProgress['phase']): string {
  switch (phase) {
    case 'reading':
      return '파일을 읽고 있습니다...';
    case 'parsing':
      return 'DXF 구조를 분석하고 있습니다...';
    case 'processing':
      return '엔티티를 처리하고 있습니다...';
    case 'complete':
      return '완료!';
    case 'error':
      return '오류가 발생했습니다';
    default:
      return '처리 중...';
  }
}
