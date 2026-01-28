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
 * 렌더러 인터페이스
 */
export interface OBCRenderer {
  postproduction: {
    enabled: boolean;
  };
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
