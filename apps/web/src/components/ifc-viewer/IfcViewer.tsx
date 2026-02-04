'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import {
  Upload,
  Loader2,
  Box,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Eye,
  Grid3X3,
  Maximize2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface IfcViewerProps {
  className?: string;
}

interface LoadingState {
  phase: 'idle' | 'initializing' | 'loading' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
}

interface ViewerStats {
  meshCount: number;
  fileSize: string;
  loadTime: number;
}

type ViewOrientation = 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right';
type ProjectionMode = 'Perspective' | 'Orthographic';

export function IfcViewer({ className }: IfcViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const componentsRef = useRef<any>(null);
  const worldRef = useRef<any>(null);
  const ifcLoaderRef = useRef<any>(null);
  const fragmentsRef = useRef<any>(null);
  const highlighterRef = useRef<any>(null);
  const boundingBoxerRef = useRef<any>(null);
  const threeRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  // Theme synchronization
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted ? resolvedTheme === 'dark' : true;

  const [loadingState, setLoadingState] = useState<LoadingState>({
    phase: 'idle',
    progress: 0,
    message: '',
  });
  const [stats, setStats] = useState<ViewerStats | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [projectionMode, setProjectionMode] = useState<ProjectionMode>('Perspective');

  // Initialize viewer
  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return;
    isInitializedRef.current = true;

    const init = async () => {
      try {
        setLoadingState({ phase: 'initializing', progress: 10, message: '뷰어 초기화 중...' });

        // Dynamic imports
        const OBC = await import('@thatopen/components');
        const OBF = await import('@thatopen/components-front');
        const THREE = await import('three');
        threeRef.current = THREE;

        // Create components
        const components = new OBC.Components();
        componentsRef.current = components;

        // Create world with OrthoPerspectiveCamera for view presets
        const worlds = components.get(OBC.Worlds);
        const world = worlds.create<
          typeof OBC.SimpleScene.prototype,
          typeof OBC.OrthoPerspectiveCamera.prototype,
          typeof OBF.PostproductionRenderer.prototype
        >();
        worldRef.current = world;

        // Setup scene, renderer, camera in correct order
        world.scene = new OBC.SimpleScene(components);
        world.renderer = new OBF.PostproductionRenderer(components, containerRef.current!);
        world.camera = new OBC.OrthoPerspectiveCamera(components);

        // Initialize components
        components.init();

        // Setup scene after init
        world.scene.setup();
        world.scene.three.background = new THREE.Color(0x1e293b);

        // Setup grids
        const grids = components.get(OBC.Grids);
        grids.create(world);

        // Enable postproduction
        world.renderer.postproduction.enabled = true;

        setLoadingState({ phase: 'initializing', progress: 30, message: 'IFC 로더 설정 중...' });

        // Setup fragments manager FIRST (required before IFC loader)
        const fragments = components.get(OBC.FragmentsManager);
        fragmentsRef.current = fragments;

        // Initialize fragments with local worker URL (to avoid CORS issues)
        const workerUrl = '/wasm/worker.mjs';
        fragments.init(workerUrl);

        // Handle camera rest event to update fragments
        world.camera.controls.addEventListener('rest', () => {
          fragments.core.update(true);
        });

        // Handle new fragments loaded
        fragments.list.onItemSet.add(async ({ value: model }: { value: any }) => {
          model.useCamera(world.camera.three);
          world.scene.three.add(model.object);
          await fragments.core.update(true);

          // Setup BoundingBoxer after model loads
          const boxer = components.get(OBC.BoundingBoxer);
          boxer.addFromModels();
          boundingBoxerRef.current = boxer;
        });

        // Setup IFC loader AFTER fragments with explicit WASM configuration
        const ifcLoader = components.get(OBC.IfcLoader);
        await ifcLoader.setup({
          autoSetWasm: false,
          wasm: {
            path: 'https://unpkg.com/web-ifc@0.0.74/',
            absolute: true,
          },
        });
        ifcLoaderRef.current = ifcLoader;

        setLoadingState({ phase: 'initializing', progress: 60, message: '선택 기능 설정 중...' });

        // Setup Raycasters for selection
        components.get(OBC.Raycasters).get(world);

        // Setup Highlighter for object selection
        const highlighter = components.get(OBF.Highlighter);
        highlighter.setup({
          world,
          selectMaterialDefinition: {
            color: new THREE.Color('#f59e0b'),
            opacity: 0.8,
            transparent: true,
            renderedFaces: 0,
          },
        });
        highlighter.multiple = 'ctrlKey'; // Enable multi-select with Ctrl key
        highlighterRef.current = highlighter;

        // Selection events removed - properties panel disabled

        // Setup resize observer
        const resizeObserver = new ResizeObserver(() => {
          if (world.renderer) {
            world.renderer.resize();
          }
        });
        resizeObserver.observe(containerRef.current!);

        setIsReady(true);
        setLoadingState({ phase: 'idle', progress: 0, message: '' });

      } catch (error) {
        console.error('Viewer initialization failed:', error);
        setLoadingState({
          phase: 'error',
          progress: 0,
          message: error instanceof Error ? error.message : '뷰어 초기화 실패',
        });
      }
    };

    init();

    return () => {
      if (componentsRef.current) {
        componentsRef.current.dispose();
      }
    };
  }, []);

  // Sync Three.js scene background with theme
  useEffect(() => {
    if (!worldRef.current?.scene?.three || !threeRef.current || !mounted) return;

    const bgColor = isDarkMode ? 0x1e293b : 0xf4f4f5; // slate-800 : zinc-100
    worldRef.current.scene.three.background = new threeRef.current.Color(bgColor);
  }, [isDarkMode, mounted]);

  // Load IFC from URL (for auto-loading)
  const loadIfcFromUrl = useCallback(async (url: string, fileName: string) => {
    if (!ifcLoaderRef.current || !worldRef.current || !fragmentsRef.current || !isReady) {
      return;
    }

    const startTime = performance.now();

    try {
      setLoadingState({ phase: 'loading', progress: 10, message: '기본 모델 불러오는 중...' });

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const data = new Uint8Array(buffer);
      const fileSizeMB = (buffer.byteLength / (1024 * 1024)).toFixed(2);

      setLoadingState({ phase: 'processing', progress: 30, message: 'IFC 처리 중...' });

      await ifcLoaderRef.current.load(data, true, fileName);

      setLoadingState({ phase: 'processing', progress: 80, message: '렌더링 중...' });

      await new Promise(resolve => setTimeout(resolve, 500));
      await fragmentsRef.current.core.update(true);

      if (worldRef.current?.camera) {
        await worldRef.current.camera.fitToItems();
      }

      const loadTime = Math.round(performance.now() - startTime);

      setStats({
        meshCount: fragmentsRef.current.list.size || 0,
        fileSize: `${fileSizeMB} MB`,
        loadTime,
      });

      setLoadingState({ phase: 'complete', progress: 100, message: '로딩 완료' });

    } catch (error) {
      console.warn('Auto-load failed:', error);
      // Silently fail and show upload prompt
      setLoadingState({ phase: 'idle', progress: 0, message: '' });
    }
  }, [isReady]);

  // Auto-load default IFC file when ready
  useEffect(() => {
    if (!isReady || stats) return;

    loadIfcFromUrl('/APT_2x3.ifc', 'APT_2x3');
  }, [isReady, stats, loadIfcFromUrl]);

  // Load IFC file
  const loadIfcFile = useCallback(async (file: File) => {
    if (!ifcLoaderRef.current || !worldRef.current || !fragmentsRef.current || !isReady) {
      setLoadingState({
        phase: 'error',
        progress: 0,
        message: '뷰어가 아직 초기화되지 않았습니다.',
      });
      return;
    }

    const startTime = performance.now();

    try {
      setLoadingState({ phase: 'loading', progress: 10, message: '파일 읽는 중...' });

      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      const fileSizeMB = (buffer.byteLength / (1024 * 1024)).toFixed(2);
      const fileName = file.name.replace('.ifc', '');

      setLoadingState({ phase: 'processing', progress: 30, message: 'IFC 처리 중...' });

      // Load IFC with parameters: (data, coordinate to origin, model name)
      await ifcLoaderRef.current.load(data, true, fileName);

      setLoadingState({ phase: 'processing', progress: 80, message: '렌더링 중...' });

      // Wait for model to be added to scene via fragments.list.onItemSet handler
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update fragments
      await fragmentsRef.current.core.update(true);

      // Fit camera to model
      if (worldRef.current?.camera) {
        await worldRef.current.camera.fitToItems();
      }

      const loadTime = Math.round(performance.now() - startTime);

      setStats({
        meshCount: fragmentsRef.current.list.size || 0,
        fileSize: `${fileSizeMB} MB`,
        loadTime,
      });

      setLoadingState({ phase: 'complete', progress: 100, message: '로딩 완료' });

    } catch (error) {
      console.error('IFC 로드 실패:', error);
      setLoadingState({
        phase: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'IFC 로드 실패',
      });
    }
  }, [isReady]);

  // View orientation handler
  const handleViewOrientation = useCallback(async (orientation: ViewOrientation) => {
    if (!worldRef.current?.camera || !boundingBoxerRef.current) return;

    try {
      const camera = worldRef.current.camera;
      if (!camera.hasCameraControls()) return;

      const { position, target } = await boundingBoxerRef.current.getCameraOrientation(orientation);
      await camera.controls.setLookAt(
        position.x,
        position.y,
        position.z,
        target.x,
        target.y,
        target.z,
        true
      );
    } catch (error) {
      console.warn('View orientation failed:', error);
    }
  }, []);

  // Projection mode toggle
  const handleProjectionToggle = useCallback(async () => {
    if (!worldRef.current?.camera) return;

    try {
      const camera = worldRef.current.camera;
      const newMode: ProjectionMode = projectionMode === 'Perspective' ? 'Orthographic' : 'Perspective';
      await camera.projection.set(newMode);
      setProjectionMode(newMode);
    } catch (error) {
      console.warn('Projection toggle failed:', error);
    }
  }, [projectionMode]);

  // File drop handler
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith('.ifc')) {
      loadIfcFile(file);
    }
  }, [loadIfcFile]);

  // File select handler
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadIfcFile(file);
    }
  }, [loadIfcFile]);

  // Camera controls
  const handleReset = useCallback(() => {
    if (worldRef.current?.camera?.controls) {
      worldRef.current.camera.controls.reset(true);
    }
  }, []);

  const handleFitToModel = useCallback(async () => {
    if (worldRef.current?.camera) {
      await worldRef.current.camera.fitToItems();
    }
  }, []);

  // Selection handlers removed - properties panel disabled

  return (
    <div className={`relative flex h-full ${className}`}>
      {/* 3D Container */}
      <div className="relative flex-1 flex flex-col">
        <div
          ref={containerRef}
          className={`relative flex-1 bg-zinc-100 dark:bg-slate-900 rounded-lg overflow-hidden border-2 transition-colors ${
            isDragging ? 'border-primary border-dashed' : 'border-zinc-300 dark:border-transparent'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {/* Upload prompt (shown when idle and no model loaded) */}
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
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-slate-500">
                  <span className="px-2 py-1 rounded bg-zinc-200 dark:bg-slate-800">.ifc</span>
                </div>
              </div>
            </div>
          )}

          {/* Loading/Initializing state */}
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

          {/* Error state */}
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

          {/* View Controls - Top Left */}
          {loadingState.phase === 'complete' && (
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
              {/* View Presets */}
              <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg p-1 flex flex-col gap-1 border border-zinc-300 dark:border-slate-600">
                <div className="text-xs text-zinc-600 dark:text-slate-400 px-2 py-1 font-medium">뷰</div>
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-slate-700"
                    onClick={() => handleViewOrientation('top')}
                    title="위에서 보기"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-slate-700"
                    onClick={() => handleViewOrientation('front')}
                    title="앞에서 보기"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-slate-700"
                    onClick={() => handleViewOrientation('right')}
                    title="오른쪽에서 보기"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-slate-700"
                    onClick={() => handleViewOrientation('bottom')}
                    title="아래에서 보기"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-slate-700"
                    onClick={() => handleViewOrientation('back')}
                    title="뒤에서 보기"
                  >
                    <ArrowDown className="h-4 w-4 rotate-180" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-slate-700"
                    onClick={() => handleViewOrientation('left')}
                    title="왼쪽에서 보기"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Projection Toggle */}
              <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg p-1 border border-zinc-300 dark:border-slate-600">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`w-full justify-start gap-2 text-xs ${
                    projectionMode === 'Orthographic' ? 'text-primary' : 'text-zinc-600 dark:text-slate-300'
                  }`}
                  onClick={handleProjectionToggle}
                  title="투영 모드 전환"
                >
                  <Grid3X3 className="h-4 w-4" />
                  {projectionMode === 'Perspective' ? '원근' : '정사영'}
                </Button>
              </div>
            </div>
          )}

          {/* Bottom Controls */}
          {loadingState.phase === 'complete' && (
            <div className="absolute bottom-4 left-4 flex gap-2 z-10">
              <Button variant="secondary" size="icon" onClick={handleReset} title="뷰 리셋">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="icon" onClick={handleFitToModel} title="전체 보기">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Load new file button */}
          {loadingState.phase === 'complete' && (
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                다른 파일
              </Button>
            </div>
          )}

        </div>

        {/* Stats info */}
        {stats && loadingState.phase === 'complete' && (
          <div className="mt-2 px-2 py-1.5 bg-muted/50 rounded text-xs text-muted-foreground flex gap-4">
            <span>모델: {stats.meshCount.toLocaleString()}개</span>
            <span>파일: {stats.fileSize}</span>
            <span>로드: {stats.loadTime}ms</span>
          </div>
        )}
      </div>

      {/* Hidden file input */}
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
