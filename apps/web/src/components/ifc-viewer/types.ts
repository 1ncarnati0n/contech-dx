/**
 * IFC Viewer 타입 정의
 *
 * @thatopen/components 및 @thatopen/components-front 라이브러리의
 * 타입을 정의합니다. 외부 라이브러리 타입이 제한적이므로
 * 사용하는 메서드만 정의합니다.
 */

import type * as THREE from 'three';

// ============================================
// 기본 인터페이스
// ============================================

/**
 * OBC Components 인터페이스
 */
export interface OBCComponents {
  init(): void;
  dispose(): void;
  get<T>(component: new (...args: unknown[]) => T): T;
}

/**
 * 카메라 컨트롤 인터페이스
 */
export interface CameraControls {
  reset(animated: boolean): void;
  setLookAt(
    px: number, py: number, pz: number,
    tx: number, ty: number, tz: number,
    animated: boolean
  ): Promise<void>;
  addEventListener(event: string, handler: () => void): void;
}

/**
 * 카메라 프로젝션 인터페이스
 */
export interface CameraProjection {
  set(mode: 'Perspective' | 'Orthographic'): Promise<void>;
}

/**
 * OBC 카메라 인터페이스
 */
export interface OBCCamera {
  three: THREE.Camera;
  controls: CameraControls;
  projection: CameraProjection;
  fitToItems(): Promise<void>;
  hasCameraControls(): boolean;
}

/**
 * 씬 인터페이스
 */
export interface OBCScene {
  three: THREE.Scene;
  setup(): void;
}

/**
 * Postproduction 설정 인터페이스
 */
export interface PostproductionSettings {
  enabled: boolean;
  outlinesEnabled?: boolean;
  outlines?: {
    enabled: boolean;
    color?: THREE.Color;
    threshold?: number;
  };
}

/**
 * 렌더러 인터페이스
 */
export interface OBCRenderer {
  postproduction: PostproductionSettings;
  resize(): void;
}

/**
 * OBC World 인터페이스
 */
export interface OBCWorld {
  scene: OBCScene;
  renderer: OBCRenderer;
  camera: OBCCamera;
}

/**
 * Fragment 코어 인터페이스
 */
export interface FragmentCore {
  update(force: boolean): Promise<void>;
}

/**
 * Fragment 모델 인터페이스
 */
export interface FragmentModel {
  object: THREE.Object3D;
  useCamera(camera: THREE.Camera): void;
  getItemsData(localIds: number[]): Promise<FragmentItemData[]>;
}

/**
 * Fragment 아이템 데이터
 */
export interface FragmentItemData {
  localId?: number;
  type?: string;
  name?: string;
  attributes?: Record<string, unknown>;
}

/**
 * Fragments Manager 인터페이스
 */
export interface OBCFragmentsManager {
  list: Map<string, FragmentModel> & {
    onItemSet: {
      add(handler: (event: { value: FragmentModel }) => void): void;
    };
    size: number;
  };
  core: FragmentCore;
  init(workerUrl: string): void;
}

/**
 * IFC Loader 설정
 */
export interface IfcLoaderSetupConfig {
  autoSetWasm: boolean;
  wasm: {
    path: string;
    absolute: boolean;
  };
}

/**
 * IFC Loader 인터페이스
 */
export interface OBCIfcLoader {
  setup(config: IfcLoaderSetupConfig): Promise<void>;
  load(data: Uint8Array, coordToOrigin: boolean, name: string): Promise<void>;
}

/**
 * Highlighter 이벤트
 */
export interface HighlighterEvents {
  select: {
    onHighlight: {
      add(handler: (modelIdMap: Record<string, Set<number>>) => void): void;
    };
    onClear: {
      add(handler: () => void): void;
    };
  };
}

/**
 * Highlighter 설정
 */
export interface HighlighterSetupConfig {
  world: OBCWorld;
  selectMaterialDefinition: {
    color: THREE.Color;
    opacity: number;
    transparent: boolean;
    renderedFaces: number;
  };
}

/**
 * Highlighter 인터페이스
 */
export interface OBCHighlighter {
  events: HighlighterEvents;
  multiple: string;
  setup(config: HighlighterSetupConfig): void;
  clear(mode: string): void;
}

/**
 * Bounding Boxer 인터페이스
 */
export interface OBCBoundingBoxer {
  addFromModels(): void;
  getCameraOrientation(orientation: string): Promise<{
    position: THREE.Vector3;
    target: THREE.Vector3;
  }>;
}

// ============================================
// Clipper 관련 타입
// ============================================

/**
 * 클리핑 플레인 인터페이스
 */
export interface ClippingPlane {
  enabled: boolean;
  visible: boolean;
  plane: THREE.Plane;
}

/**
 * Clipper 인터페이스
 */
export interface OBCClipper {
  enabled: boolean;
  visible: boolean;
  create(world: OBCWorld): ClippingPlane;
  createFromNormalAndCoplanarPoint(
    world: OBCWorld,
    normal: THREE.Vector3,
    point: THREE.Vector3
  ): ClippingPlane;
  delete(plane: ClippingPlane): void;
  deleteAll(): void;
}

// ============================================
// 측정 관련 타입
// ============================================

/**
 * 측정 타입
 */
export type MeasurementType = 'distance' | 'area' | 'angle';

/**
 * 측정 결과 인터페이스
 */
export interface MeasurementResult {
  id: string;
  type: MeasurementType;
  value: number;
  unit: string;
  points: THREE.Vector3[];
  label?: string;
  timestamp: number;
}

/**
 * LengthMeasurement 인터페이스
 */
export interface OBCLengthMeasurement {
  enabled: boolean;
  snapEnabled: boolean;
  create(points?: THREE.Vector3[]): void;
  delete(): void;
  deleteAll(): void;
  cancelCreation(): void;
}

/**
 * AreaMeasurement 인터페이스
 */
export interface OBCAreaMeasurement {
  enabled: boolean;
  create(): void;
  delete(): void;
  deleteAll(): void;
  cancelCreation(): void;
}

// ============================================
// 주석 관련 타입
// ============================================

/**
 * 주석 데이터
 */
export interface Annotation {
  id: string;
  position: { x: number; y: number; z: number };
  text: string;
  title?: string;
  author?: string;
  createdAt: number;
  updatedAt?: number;
  color?: string;
  modelId?: string;
}

// ============================================
// 모델 트리 관련 타입
// ============================================

/**
 * IFC 요소 타입 (간단화)
 */
export type IfcElementCategory =
  | 'IfcProject'
  | 'IfcSite'
  | 'IfcBuilding'
  | 'IfcBuildingStorey'
  | 'IfcSpace'
  | 'IfcWall'
  | 'IfcSlab'
  | 'IfcColumn'
  | 'IfcBeam'
  | 'IfcDoor'
  | 'IfcWindow'
  | 'IfcStair'
  | 'IfcRoof'
  | 'IfcCurtainWall'
  | 'IfcRailing'
  | 'IfcFurniture'
  | 'IfcFlowTerminal'
  | 'IfcFlowSegment'
  | 'IfcDistributionElement'
  | 'Unknown';

/**
 * 공간 구조 트리 노드
 */
export interface SpatialTreeNode {
  id: number;
  expressId: number;
  name: string;
  type: IfcElementCategory | string;
  children: SpatialTreeNode[];
  modelId: string;
  isVisible?: boolean;
  isExpanded?: boolean;
}

/**
 * 카테고리 필터 상태
 */
export interface CategoryFilterState {
  [key: string]: boolean;
}

// ============================================
// Viewer Refs 타입
// ============================================

/**
 * IFC Viewer에서 사용하는 Ref 타입들
 */
export interface IfcViewerRefs {
  components: OBCComponents | null;
  world: OBCWorld | null;
  ifcLoader: OBCIfcLoader | null;
  fragments: OBCFragmentsManager | null;
  highlighter: OBCHighlighter | null;
  boundingBoxer: OBCBoundingBoxer | null;
  clipper: OBCClipper | null;
  lengthMeasurement: OBCLengthMeasurement | null;
  areaMeasurement: OBCAreaMeasurement | null;
  three: typeof THREE | null;
}

// ============================================
// 컴포넌트 Props 타입
// ============================================

/**
 * 뷰 방향
 */
export type ViewOrientation = 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right';

/**
 * 프로젝션 모드
 */
export type ProjectionMode = 'Perspective' | 'Orthographic';

/**
 * 로딩 상태
 */
export interface LoadingState {
  phase: 'idle' | 'initializing' | 'loading' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
}

/**
 * 뷰어 통계
 */
export interface ViewerStats {
  meshCount: number;
  fileSize: string;
  loadTime: number;
}

/**
 * 선택된 요소
 */
export interface SelectedElement {
  id: number;
  type: string;
  name: string;
  properties: Record<string, unknown>;
}

// ============================================
// 클리핑 플레인 UI 타입
// ============================================

/**
 * 클리핑 축
 */
export type ClippingAxis = 'x' | 'y' | 'z';

/**
 * 클리핑 플레인 상태
 */
export interface ClippingPlaneState {
  axis: ClippingAxis;
  enabled: boolean;
  value: number; // -100 to 100 (percentage)
  flipped: boolean;
}

// ============================================
// 패널 상태 타입
// ============================================

/**
 * 좌측 패널 탭
 */
export type LeftPanelTab = 'tree' | 'search';

/**
 * 우측 패널 탭
 */
export type RightPanelTab = 'properties' | 'annotations';

/**
 * 활성 도구
 */
export type ActiveTool =
  | 'select'
  | 'measure-distance'
  | 'measure-area'
  | 'annotate'
  | 'clip-x'
  | 'clip-y'
  | 'clip-z'
  | null;
