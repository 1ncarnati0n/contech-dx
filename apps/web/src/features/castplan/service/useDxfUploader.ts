import { logger } from '@/shared/utils/logger';
import { useRef, useState, useCallback } from 'react';
import { loadDxfFromFile } from '@/features/castplan/service/dxf-parser';
import type { ParsedDxfData, DxfParseProgress, DxfStatistics } from '@/shared/types';

export interface LoadingState {
  phase: DxfParseProgress['phase'];
  progress: number;
  message: string;
}

interface UseDxfUploaderParams {
  onDxfLoaded: (data: ParsedDxfData, fileName: string) => void;
}

export function useDxfUploader({ onDxfLoaded }: UseDxfUploaderParams) {
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

  return {
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
  };
}
