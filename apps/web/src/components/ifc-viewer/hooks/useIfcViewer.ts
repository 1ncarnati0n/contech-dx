'use client';

import { useEffect } from 'react';
import { useIfcViewerContext } from '../context/IfcViewerContext';
import { useIfcViewerStore } from '../stores/useIfcViewerStore';
import type { FragmentItemData, SelectedElement } from '../types';

interface UseIfcViewerOptions {
  isDarkMode?: boolean;
}

/**
 * IFC 뷰어 초기화 훅
 *
 * @thatopen/components 라이브러리를 사용하여 3D 뷰어를 초기화합니다.
 * - 씬, 카메라, 렌더러 설정
 * - IFC 로더 설정
 * - 선택 기능(Highlighter) 설정
 */
export function useIfcViewer(options: UseIfcViewerOptions = {}) {
  const { isDarkMode = true } = options;

  const {
    containerRef,
    componentsRef,
    worldRef,
    threeRef,
    ifcLoaderRef,
    fragmentsRef,
    highlighterRef,
    boundingBoxerRef,
    isInitializedRef,
  } = useIfcViewerContext();

  const {
    setLoadingState,
    setIsReady,
    setSelectedElements,
  } = useIfcViewerStore();

  // 뷰어 초기화
  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return;

    // 🔑 컨테이너 참조를 async 작업 전에 캡처 (race condition 방지)
    const container = containerRef.current;
    isInitializedRef.current = true;

    const init = async () => {
      try {
        setLoadingState({ phase: 'initializing', progress: 10, message: '뷰어 초기화 중...' });

        // Dynamic imports
        const OBC = await import('@thatopen/components');
        const OBF = await import('@thatopen/components-front');
        const THREE = await import('three');

        // async import 후 컨테이너가 여전히 유효한지 확인
        if (!container.isConnected) {
          console.warn('Container disconnected during initialization');
          isInitializedRef.current = false;
          return;
        }

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
        world.renderer = new OBF.PostproductionRenderer(components, container);
        world.camera = new OBC.OrthoPerspectiveCamera(components);

        // Initialize components
        components.init();

        // Setup scene after init
        world.scene.setup();
        const bgColor = isDarkMode ? 0x1e293b : 0xf4f4f5;
        world.scene.three.background = new THREE.Color(bgColor);

        // Setup grids
        const grids = components.get(OBC.Grids);
        grids.create(world);

        // Enable postproduction
        world.renderer.postproduction.enabled = true;

        setLoadingState({ phase: 'initializing', progress: 30, message: 'IFC 로더 설정 중...' });

        // Setup fragments manager FIRST (required before IFC loader)
        const fragments = components.get(OBC.FragmentsManager);
        fragmentsRef.current = fragments;

        // Initialize fragments with local worker URL
        const workerUrl = '/wasm/worker.mjs';
        fragments.init(workerUrl);

        // Handle camera rest event to update fragments
        world.camera.controls.addEventListener('rest', () => {
          fragments.core.update(true);
        });

        // Handle new fragments loaded
        fragments.list.onItemSet.add(async ({ value: model }) => {
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

        // Handle selection events
        highlighter.events.select.onHighlight.add(async (modelIdMap: Record<string, Set<number>>) => {
          const promises: Promise<FragmentItemData[]>[] = [];
          for (const [modelId, localIds] of Object.entries(modelIdMap)) {
            const model = fragments.list.get(modelId);
            if (!model) continue;
            promises.push(model.getItemsData([...localIds]));
          }
          const allData = (await Promise.all(promises)).flat();

          const elements: SelectedElement[] = allData.map((item: FragmentItemData, index: number) => ({
            id: item.localId ?? index,
            type: item.type ?? 'Unknown',
            name: item.name ?? `Element ${index + 1}`,
            properties: item.attributes ?? {},
          }));

          setSelectedElements(elements);
        });

        highlighter.events.select.onClear.add(() => {
          setSelectedElements([]);
        });

        // Setup resize observer
        const resizeObserver = new ResizeObserver(() => {
          if (world.renderer) {
            world.renderer.resize();
          }
        });
        resizeObserver.observe(container);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 테마 동기화
  useEffect(() => {
    if (!worldRef.current?.scene?.three || !threeRef.current) return;

    const bgColor = isDarkMode ? 0x1e293b : 0xf4f4f5;
    worldRef.current.scene.three.background = new threeRef.current.Color(bgColor);
  }, [isDarkMode, worldRef, threeRef]);
}
