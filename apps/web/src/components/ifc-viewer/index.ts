/**
 * IFC Viewer - @thatopen/components 기반 IFC 모델 뷰어
 *
 * 주요 기능:
 * - IFC 파일 로딩 및 3D 렌더링
 * - 엣지라인 토글
 * - 단면도/클리핑 (X, Y, Z축)
 * - 모델 트리 뷰
 * - 거리/면적 측정
 * - 주석/마커
 * - 속성 검색
 *
 * 사용 라이브러리:
 * - Three.js v0.182.0
 * - @thatopen/components v3.2.7
 * - @thatopen/components-front
 */

// 메인 컴포넌트
export { IfcViewer } from './IfcViewer';

// Context & Provider
export { IfcViewerProvider, useIfcViewerContext } from './context/IfcViewerContext';

// Store
export { useIfcViewerStore } from './stores/useIfcViewerStore';

// Hooks
export { useIfcViewer } from './hooks/useIfcViewer';
export { useIfcLoader } from './hooks/useIfcLoader';
export { useEdgeRendering } from './hooks/useEdgeRendering';
export { useClipperPlanes } from './hooks/useClipperPlanes';
export { useModelTree } from './hooks/useModelTree';
export { useMeasurements } from './hooks/useMeasurements';
export { useAnnotations } from './hooks/useAnnotations';
export { usePropertySearch } from './hooks/usePropertySearch';

// Types
export type {
  LoadingState,
  ViewerStats,
  SelectedElement,
  ViewOrientation,
  ProjectionMode,
  ClippingAxis,
  ClippingPlaneState,
  MeasurementType,
  MeasurementResult,
  Annotation,
  SpatialTreeNode,
  IfcElementCategory,
  ActiveTool,
  LeftPanelTab,
  RightPanelTab,
} from './types';
