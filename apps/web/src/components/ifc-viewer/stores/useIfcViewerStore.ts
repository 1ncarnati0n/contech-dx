import { create } from 'zustand';
import type {
  LoadingState,
  ViewerStats,
  SelectedElement,
  ProjectionMode,
  ActiveTool,
  LeftPanelTab,
  RightPanelTab,
  ClippingPlaneState,
  Annotation,
  MeasurementResult,
  SpatialTreeNode,
  CategoryFilterState,
} from '../types';

interface IfcViewerState {
  // 로딩 상태
  loadingState: LoadingState;
  setLoadingState: (state: LoadingState) => void;

  // 뷰어 상태
  isReady: boolean;
  setIsReady: (ready: boolean) => void;

  stats: ViewerStats | null;
  setStats: (stats: ViewerStats | null) => void;

  // UI 상태
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;

  showLeftPanel: boolean;
  setShowLeftPanel: (show: boolean) => void;
  toggleLeftPanel: () => void;

  showRightPanel: boolean;
  setShowRightPanel: (show: boolean) => void;
  toggleRightPanel: () => void;

  leftPanelTab: LeftPanelTab;
  setLeftPanelTab: (tab: LeftPanelTab) => void;

  rightPanelTab: RightPanelTab;
  setRightPanelTab: (tab: RightPanelTab) => void;

  // 카메라/뷰 상태
  projectionMode: ProjectionMode;
  setProjectionMode: (mode: ProjectionMode) => void;

  // 선택 상태
  selectedElements: SelectedElement[];
  setSelectedElements: (elements: SelectedElement[]) => void;
  clearSelection: () => void;

  // 렌더링 옵션
  edgesEnabled: boolean;
  setEdgesEnabled: (enabled: boolean) => void;
  toggleEdges: () => void;

  // 활성 도구
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;

  // 클리핑 플레인 상태
  clippingPlanes: {
    x: ClippingPlaneState;
    y: ClippingPlaneState;
    z: ClippingPlaneState;
  };
  setClippingPlane: (axis: 'x' | 'y' | 'z', state: Partial<ClippingPlaneState>) => void;
  resetClippingPlanes: () => void;

  // 측정 결과
  measurements: MeasurementResult[];
  addMeasurement: (measurement: MeasurementResult) => void;
  removeMeasurement: (id: string) => void;
  clearMeasurements: () => void;

  // 주석
  annotations: Annotation[];
  setAnnotations: (annotations: Annotation[]) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;

  // 모델 트리
  spatialTree: SpatialTreeNode[];
  setSpatialTree: (tree: SpatialTreeNode[]) => void;

  categoryFilter: CategoryFilterState;
  setCategoryFilter: (filter: CategoryFilterState) => void;
  toggleCategory: (category: string) => void;

  expandedNodes: Set<number>;
  toggleNodeExpanded: (nodeId: number) => void;
  expandAll: () => void;
  collapseAll: () => void;

  // 검색
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SelectedElement[];
  setSearchResults: (results: SelectedElement[]) => void;

  // 테마
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
}

const defaultClippingState: ClippingPlaneState = {
  axis: 'x',
  enabled: false,
  value: 0,
  flipped: false,
};

export const useIfcViewerStore = create<IfcViewerState>((set) => ({
  // 로딩 상태
  loadingState: { phase: 'idle', progress: 0, message: '' },
  setLoadingState: (loadingState) => set({ loadingState }),

  // 뷰어 상태
  isReady: false,
  setIsReady: (isReady) => set({ isReady }),

  stats: null,
  setStats: (stats) => set({ stats }),

  // UI 상태
  isDragging: false,
  setIsDragging: (isDragging) => set({ isDragging }),

  showLeftPanel: false,
  setShowLeftPanel: (showLeftPanel) => set({ showLeftPanel }),
  toggleLeftPanel: () => set((state) => ({ showLeftPanel: !state.showLeftPanel })),

  showRightPanel: false, // 기본 숨김 - 뷰어 왜곡 방지
  setShowRightPanel: (showRightPanel) => set({ showRightPanel }),
  toggleRightPanel: () => set((state) => ({ showRightPanel: !state.showRightPanel })),

  leftPanelTab: 'tree',
  setLeftPanelTab: (leftPanelTab) => set({ leftPanelTab }),

  rightPanelTab: 'properties',
  setRightPanelTab: (rightPanelTab) => set({ rightPanelTab }),

  // 카메라/뷰 상태
  projectionMode: 'Perspective',
  setProjectionMode: (projectionMode) => set({ projectionMode }),

  // 선택 상태
  selectedElements: [],
  setSelectedElements: (selectedElements) => set({ selectedElements }),
  clearSelection: () => set({ selectedElements: [] }),

  // 렌더링 옵션
  edgesEnabled: true,
  setEdgesEnabled: (edgesEnabled) => set({ edgesEnabled }),
  toggleEdges: () => set((state) => ({ edgesEnabled: !state.edgesEnabled })),

  // 활성 도구
  activeTool: 'select',
  setActiveTool: (activeTool) => set({ activeTool }),

  // 클리핑 플레인 상태
  clippingPlanes: {
    x: { ...defaultClippingState, axis: 'x' },
    y: { ...defaultClippingState, axis: 'y' },
    z: { ...defaultClippingState, axis: 'z' },
  },
  setClippingPlane: (axis, updates) =>
    set((state) => ({
      clippingPlanes: {
        ...state.clippingPlanes,
        [axis]: { ...state.clippingPlanes[axis], ...updates },
      },
    })),
  resetClippingPlanes: () =>
    set({
      clippingPlanes: {
        x: { ...defaultClippingState, axis: 'x' },
        y: { ...defaultClippingState, axis: 'y' },
        z: { ...defaultClippingState, axis: 'z' },
      },
    }),

  // 측정 결과
  measurements: [],
  addMeasurement: (measurement) =>
    set((state) => ({ measurements: [...state.measurements, measurement] })),
  removeMeasurement: (id) =>
    set((state) => ({
      measurements: state.measurements.filter((m) => m.id !== id),
    })),
  clearMeasurements: () => set({ measurements: [] }),

  // 주석
  annotations: [],
  setAnnotations: (annotations) => set({ annotations }),
  addAnnotation: (annotation) =>
    set((state) => ({ annotations: [...state.annotations, annotation] })),
  updateAnnotation: (id, updates) =>
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: Date.now() } : a
      ),
    })),
  removeAnnotation: (id) =>
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
    })),

  // 모델 트리
  spatialTree: [],
  setSpatialTree: (spatialTree) => set({ spatialTree }),

  categoryFilter: {},
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  toggleCategory: (category) =>
    set((state) => ({
      categoryFilter: {
        ...state.categoryFilter,
        [category]: !state.categoryFilter[category],
      },
    })),

  expandedNodes: new Set<number>(),
  toggleNodeExpanded: (nodeId) =>
    set((state) => {
      const newExpanded = new Set(state.expandedNodes);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      return { expandedNodes: newExpanded };
    }),
  expandAll: () =>
    set((state) => {
      const getAllIds = (nodes: SpatialTreeNode[]): number[] =>
        nodes.flatMap((n) => [n.id, ...getAllIds(n.children)]);
      return { expandedNodes: new Set(getAllIds(state.spatialTree)) };
    }),
  collapseAll: () => set({ expandedNodes: new Set() }),

  // 검색
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  searchResults: [],
  setSearchResults: (searchResults) => set({ searchResults }),

  // 테마
  isDarkMode: true,
  setIsDarkMode: (isDarkMode) => set({ isDarkMode }),
}));
