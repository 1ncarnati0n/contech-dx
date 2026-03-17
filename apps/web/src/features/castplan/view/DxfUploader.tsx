'use client';

import { Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button, Card, CardContent } from '@/shared/components/ui';
import { useDxfUploader } from '@/features/castplan/service/useDxfUploader';
import { getPhaseDescription } from '@/features/castplan/service/castplan-helpers';
import type { ParsedDxfData, DxfStatistics } from '@/shared/types';

interface DxfUploaderProps {
  onDxfLoaded: (data: ParsedDxfData, fileName: string) => void;
  currentFileName: string | null;
  onClear: () => void;
}

export function DxfUploader({ onDxfLoaded, currentFileName, onClear }: DxfUploaderProps) {
  const {
    fileInputRef,
    isLoading,
    loadingState,
    error,
    isDragOver,
    statistics,
    handleInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleButtonClick,
  } = useDxfUploader({ onDxfLoaded });

  if (currentFileName) {
    return (
      <LoadedFileView
        currentFileName={currentFileName}
        statistics={statistics}
        onClear={onClear}
      />
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
          <LoadingProgress loadingState={loadingState} />
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
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
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

function LoadedFileView({
  currentFileName,
  statistics,
  onClear,
}: {
  currentFileName: string;
  statistics: DxfStatistics | null;
  onClear: () => void;
}) {
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

function LoadingProgress({ loadingState }: { loadingState: { phase: string; progress: number; message: string } }) {
  return (
    <div className="flex flex-col items-center gap-3">
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

      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {loadingState.message}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {getPhaseDescription(loadingState.phase as 'reading' | 'parsing' | 'processing' | 'complete' | 'error')}
        </p>
      </div>

      <div className="w-full max-w-xs h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 transition-all duration-300 ease-out"
          style={{ width: `${loadingState.progress}%` }}
        />
      </div>
    </div>
  );
}
