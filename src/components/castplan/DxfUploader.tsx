'use client';

import { useRef, useState, useCallback } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui';
import { loadDxfFromFile } from '@/lib/utils/dxf-parser';
import type { ParsedDxfData } from '@/lib/types';

interface DxfUploaderProps {
  onDxfLoaded: (data: ParsedDxfData, fileName: string) => void;
  currentFileName: string | null;
  onClear: () => void;
}

export function DxfUploader({ onDxfLoaded, currentFileName, onClear }: DxfUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.dxf')) {
        setError('DXF 파일만 업로드할 수 있습니다.');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const dxfData = await loadDxfFromFile(file);
        onDxfLoaded(dxfData, file.name);
      } catch (err) {
        console.error('DXF 파싱 오류:', err);
        setError('DXF 파일을 파싱할 수 없습니다. 파일 형식을 확인해주세요.');
      } finally {
        setIsLoading(false);
      }
    },
    [onDxfLoaded]
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
              <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  {currentFileName}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  DXF 파일 로드됨
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
          ${isLoading ? 'opacity-50 cursor-wait' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleButtonClick}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              DXF 파일 로딩 중...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                DXF 파일을 드래그하거나 클릭하여 업로드
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                .dxf 형식만 지원됩니다
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
