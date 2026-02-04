'use client';

import * as React from 'react';
import { useEffect, useCallback, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  Upload,
  Loader2,
  Box,
  RotateCcw,
  Maximize2,
  Minimize2,
  MousePointer2,
  PanelLeft,
  PanelRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Context & Hooks
import { IfcViewerProvider, useIfcViewerContext } from './context/IfcViewerContext';
import { useIfcViewer } from './hooks/useIfcViewer';
import { useIfcLoader } from './hooks/useIfcLoader';
import { useIfcViewerStore } from './stores/useIfcViewerStore';

// Components
import { ViewControls } from './components/toolbar/ViewControls';
import { RenderingControls } from './components/toolbar/RenderingControls';
import { ClippingControls } from './components/toolbar/ClippingControls';
import { MeasurementToolbar } from './components/toolbar/MeasurementToolbar';
import { LeftPanel } from './components/panels/LeftPanel';
import { RightPanel } from './components/panels/RightPanel';

// ============================================
// 내부 컴포넌트
// ============================================

function IfcViewerContent() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted ? resolvedTheme === 'dark' : false;

  // Context
  const {
    containerRef,
    fileInputRef,
    resetCamera,
    fitToModel,
  } = useIfcViewerContext();

  // Zustand store
  const {
    loadingState,
    setLoadingState,
    stats,
    isReady,
    isDragging,
    setIsDragging,
    showLeftPanel,
    toggleLeftPanel,
    showRightPanel,
    toggleRightPanel,
    selectedElements,
    setIsDarkMode,
  } = useIfcViewerStore();

  // 테마 동기화
  useEffect(() => {
    if (mounted) {
      setIsDarkMode(isDarkMode);
    }
  }, [isDarkMode, mounted, setIsDarkMode]);

  // 뷰어 초기화
  useIfcViewer({ isDarkMode });

  // 파일 로딩 (자동 로드 제거됨)
  const { loadIfcFromFile, loadIfcFromUrl } = useIfcLoader();

  // 파일 드롭 핸들러
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith('.ifc')) {
      loadIfcFromFile(file);
    }
  }, [loadIfcFromFile, setIsDragging]);

  // 파일 선택 핸들러
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadIfcFromFile(file);
    }
  }, [loadIfcFromFile]);

  // 패널이 열렸을 때 전체 컨테이너가 스크롤되도록 함
  const hasPanel = loadingState.phase === 'complete' && (showLeftPanel || showRightPanel);

  return (
    <div className={`relative flex flex-col ${hasPanel ? 'overflow-auto' : 'h-full'}`}>
      {/* 3D Container - 패널 유무와 관계없이 고정 높이 유지 */}
      <div className={`relative flex flex-col ${hasPanel ? 'h-[calc(100vh-280px)] min-h-[400px]' : 'h-full'}`}>
        <div
          ref={containerRef}
          className={`relative flex-1 bg-zinc-100 dark:bg-slate-900 rounded-lg overflow-hidden border-2 transition-colors ${
            isDragging ? 'border-primary border-dashed' : 'border-zinc-300 dark:border-transparent'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {/* 업로드 프롬프트 */}
          {loadingState.phase === 'idle' && !stats && isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-slate-900/90 z-10">
              <div
                className={`flex flex-col items-center gap-6 text-center p-12 rounded-2xl border-2 border-dashed transition-all cursor-pointer max-w-md mx-4 ${
                  isDragging
                    ? 'border-primary bg-primary/10 scale-105'
                    : 'border-zinc-300 dark:border-slate-600 hover:border-zinc-400 dark:hover:border-slate-500 hover:bg-zinc-200/50 dark:hover:bg-slate-800/50'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className={`p-6 rounded-full transition-colors ${
                  isDragging ? 'bg-primary/20' : 'bg-zinc-200 dark:bg-slate-800'
                }`}>
                  <Box className={`h-12 w-12 ${isDragging ? 'text-primary' : 'text-zinc-500 dark:text-slate-400'}`} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">IFC 모델 뷰어</h3>
                  <p className="text-zinc-600 dark:text-slate-400 mb-6">
                    IFC 파일을 드래그하여 놓거나<br />
                    아래 버튼을 클릭하여 파일을 선택하세요
                  </p>
                  <div className="flex gap-3">
                    <Button
                      size="lg"
                      className="gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      <Upload className="h-5 w-5" />
                      파일 열기
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadIfcFromUrl('/APT_2x3.ifc', 'APT_2x3');
                      }}
                    >
                      <Box className="h-5 w-5" />
                      샘플 열기
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-slate-500">
                  <span className="px-2 py-1 rounded bg-zinc-200 dark:bg-slate-800">.ifc</span>
                </div>
              </div>
            </div>
          )}

          {/* 로딩 상태 */}
          {(loadingState.phase === 'initializing' || loadingState.phase === 'loading' || loadingState.phase === 'processing') && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-20">
              <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">{loadingState.message}</p>
                  <div className="w-48 h-2 bg-zinc-300 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${loadingState.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 에러 상태 */}
          {loadingState.phase === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-slate-900/90 z-20">
              <div className="flex flex-col items-center gap-4 text-center p-8 max-w-md">
                <div className="p-4 rounded-full bg-destructive/10">
                  <Box className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="font-medium mb-1 text-destructive">로드 실패</h3>
                  <p className="text-sm text-zinc-600 dark:text-slate-400 mb-4">
                    {loadingState.message}
                  </p>
                  <Button variant="outline" onClick={() => setLoadingState({ phase: 'idle', progress: 0, message: '' })}>
                    다시 시도
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 좌측 컨트롤 */}
          {loadingState.phase === 'complete' && (
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
              <ViewControls />
              <RenderingControls />
              <ClippingControls />
              <MeasurementToolbar />
            </div>
          )}

          {/* 하단 컨트롤 */}
          {loadingState.phase === 'complete' && (
            <div className="absolute bottom-4 left-4 flex gap-2 z-10">
              <Button variant="secondary" size="icon" onClick={resetCamera} title="뷰 리셋">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="icon" onClick={fitToModel} title="전체 보기">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* 상단 우측 컨트롤 */}
          {loadingState.phase === 'complete' && (
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <Button
                variant="secondary"
                size="icon"
                onClick={toggleLeftPanel}
                title={showLeftPanel ? '트리 패널 숨기기' : '트리 패널 보이기'}
              >
                <PanelLeft className={`h-4 w-4 ${showLeftPanel ? 'text-primary' : ''}`} />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                다른 파일
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={toggleRightPanel}
                title={showRightPanel ? '속성 패널 숨기기' : '속성 패널 보이기'}
              >
                <PanelRight className={`h-4 w-4 ${showRightPanel ? 'text-primary' : ''}`} />
              </Button>
            </div>
          )}

          {/* 선택 힌트 */}
          {loadingState.phase === 'complete' && selectedElements.length === 0 && (
            <div className="absolute bottom-4 right-4 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-zinc-600 dark:text-slate-400 border border-zinc-300 dark:border-slate-600">
              <MousePointer2 className="h-3 w-3 inline-block mr-1" />
              클릭하여 선택 • Ctrl+클릭으로 다중 선택
            </div>
          )}
        </div>

        {/* 통계 정보 */}
        {stats && loadingState.phase === 'complete' && (
          <div className="mt-2 px-2 py-1.5 bg-muted/50 rounded text-xs text-muted-foreground flex gap-4">
            <span>모델: {stats.meshCount.toLocaleString()}개</span>
            <span>파일: {stats.fileSize}</span>
            <span>로드: {stats.loadTime}ms</span>
            {selectedElements.length > 0 && (
              <span className="text-primary">선택: {selectedElements.length}개</span>
            )}
          </div>
        )}
      </div>

      {/* 하단 패널 컨테이너 - 뷰어 외부에 배치하여 크기 영향 없음 */}
      {loadingState.phase === 'complete' && (showLeftPanel || showRightPanel) && (
        <div className="flex gap-2 h-64 shrink-0 mt-2">
          {showLeftPanel && <LeftPanel className="flex-1" />}
          {showRightPanel && <RightPanel className="flex-1" />}
        </div>
      )}

      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ifc"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

// ============================================
// 메인 컴포넌트 (Provider 포함)
// ============================================

interface IfcViewerProps {
  className?: string;
}

export function IfcViewer({ className }: IfcViewerProps) {
  return (
    <IfcViewerProvider>
      <div className={className}>
        <IfcViewerContent />
      </div>
    </IfcViewerProvider>
  );
}
