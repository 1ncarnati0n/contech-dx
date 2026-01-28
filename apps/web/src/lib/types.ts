/**
 * 프로젝트 타입 정의
 */

// ============================================
// 공종 관련 타입 (re-export from floorIdUtils)
// ============================================

export { TRADE_GROUPS, type TradeGroup, SPECIAL_FLOOR_GROUPS, type SpecialFloorGroup } from './utils/floorIdUtils';

// ============================================
// 기본 타입
// ============================================

/**
 * 회원 등급 타입
 */
export type UserRole = 'admin' | 'main_user' | 'vip_user' | 'user';

/**
 * 작성자 정보 (Post, Comment에서 공통 사용)
 */
export interface Author {
  email: string;
  role?: UserRole;
}

// ============================================
// 데이터베이스 모델 타입
// ============================================

/**
 * 게시글 타입
 */
export interface Post {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author?: Author | null;
  created_at: string;
  updated_at: string;
}

/**
 * 댓글 타입
 */
export interface Comment {
  id: string;
  post_id: string;
  content: string;
  author_id: string;
  author?: Author | null;
  post?: Pick<Post, 'id' | 'title'> | null;
  created_at: string;
}

/**
 * 사용자 프로필 타입
 */
export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  created_at: string;
  updated_at?: string;
}

// ============================================
// API 응답 타입
// ============================================

/**
 * API 에러 타입
 */
export interface ApiError {
  code?: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * 표준 API 응답 타입
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/**
 * 페이지네이션 파라미터
 */
export interface PaginationParams {
  page: number;
  perPage: number;
}

/**
 * 페이지네이션된 응답 타입
 */
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// ============================================
// 역할 통계 타입
// ============================================

/**
 * 역할별 사용자 통계
 */
export interface RoleStats {
  total: number;
  admin: number;
  main_user: number;
  vip_user: number;
  user: number;
}

// ============================================
// 폼 입력 타입
// ============================================

/**
 * 로그인 폼 입력
 */
export interface LoginFormInput {
  email: string;
  password: string;
}

/**
 * 회원가입 폼 입력
 */
export interface SignupFormInput {
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * 게시글 폼 입력
 */
export interface PostFormInput {
  title: string;
  content: string;
}

/**
 * 댓글 폼 입력
 */
export interface CommentFormInput {
  content: string;
}

/**
 * 프로필 수정 폼 입력
 */
export interface ProfileFormInput {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
}

// ============================================
// Gemini AI 관련 타입
// ============================================

/**
 * 파일 검색 스토어
 */
export interface FileSearchStore {
  name: string;
  displayName: string;
  createTime: string;
}

/**
 * 업로드된 파일
 */
export interface UploadedFile {
  name: string;
  displayName: string;
  mimeType: string;
  sizeBytes: string;
  createTime: string;
  uri: string;
}

/**
 * 검색 인용 정보
 */
export interface SearchCitation {
  startIndex: number;
  endIndex: number;
  uri: string;
  title: string;
}

/**
 * 검색 메시지
 */
export interface SearchMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: SearchCitation[];
}

// ============================================
// Gemini API 응답 타입 (서버 사이드)
// ============================================

/**
 * Gemini File Search Store (API 원본 응답)
 */
export interface GeminiFileSearchStore {
  name: string;
  displayName: string;
  createTime: string;
  activeDocumentsCount?: number;
  pendingDocumentsCount?: number;
  failedDocumentsCount?: number;
  sizeBytes?: string;
}

/**
 * Gemini Document (API 원본 응답)
 */
export interface GeminiDocument {
  name: string;
  displayName: string;
  mimeType: string;
  sizeBytes: string;
  createTime: string;
  state: string;
}

/**
 * Gemini Citation (API 원본 응답)
 */
export interface GeminiCitation {
  startIndex: number;
  endIndex: number;
  uri?: string;
  license?: string;
}

/**
 * Gemini API 에러 응답
 */
export interface GeminiApiError {
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

// ============================================
// 컴포넌트 Props 타입
// ============================================

/**
 * 게시글 목록 Props
 */
export interface PostsListProps {
  posts: (Post & { author: Author | null })[];
}

/**
 * 댓글 목록 Props
 */
export interface CommentListProps {
  postId: string;
}

/**
 * 모바일 메뉴 Props
 */
export interface MobileMenuProps {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  isAdmin: boolean;
}

// ============================================
// 프로젝트 관리 타입
// ============================================

/**
 * 프로젝트 상태
 */
export type ProjectStatus = 'announcement' | 'bidding' | 'award' | 'construction_start' | 'completion';

/**
 * 프로젝트 멤버 역할
 */
export type ProjectMemberRole = 'pm' | 'engineer' | 'supervisor' | 'worker' | 'member';

/**
 * 프로젝트 타입
 */
export interface Project {
  id: string;
  project_number: number;
  name: string;
  description?: string;
  location?: string;
  client?: string;
  contract_amount?: number;
  start_date: string;  // ISO 8601 date string
  end_date?: string;
  status: ProjectStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 프로젝트 생성 DTO
 */
export interface CreateProjectDTO {
  name: string;
  description?: string;
  location?: string;
  client?: string;
  contract_amount?: number;
  start_date: string;
  end_date?: string;
  status?: ProjectStatus;
}

/**
 * 프로젝트 수정 DTO
 */
export interface UpdateProjectDTO {
  name?: string;
  description?: string;
  location?: string;
  client?: string;
  contract_amount?: number;
  start_date?: string;
  end_date?: string;
  status?: ProjectStatus;
}

/**
 * 프로젝트 멤버 타입
 */
export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  created_at: string;
  // Joined data
  user?: {
    email: string;
    display_name?: string;
    avatar_url?: string;
  };
}

/**
 * 프로젝트 멤버 추가 DTO
 */
export interface AddProjectMemberDTO {
  project_id: string;
  user_id: string;
  role?: ProjectMemberRole;
}

/**
 * 프로젝트 멤버 역할 수정 DTO
 */
export interface UpdateProjectMemberRoleDTO {
  role: ProjectMemberRole;
}

// ============================================
// 골조 직영공사 데이터 입력 타입
// ============================================

/**
 * 코어 타입
 */
export type CoreType = '중복도(판상형)' | '타워형' | '편복도';

/**
 * 구조형식 타입
 */
export type SlabType = '벽식구조' | 'RC구조' | '벽식구조(내부기둥)';

/**
 * 층 레벨 타입
 */
export type LevelType = '지하' | '지상';

/**
 * 층 분류 타입
 */
export type FloorClass = '지하층' | '일반층' | '셋팅층' | '기준층' | '최상층' | 'PH층' | '옥탑층';

/**
 * 단위세대 타입 패턴
 */
export interface UnitTypePattern {
  from: number;
  to: number;
  type: string; // "59A", "84A" 등
  coreNumber?: number; // 코어 번호 (1, 2, 3, 4... 높은층 순서)
}

/**
 * 동 기본 정보 메타데이터
 */
export interface BuildingMeta {
  totalUnits: number;
  unitTypePattern: UnitTypePattern[];
  coreCount: number;
  coreType: CoreType;
  slabType: SlabType;
  floorCount: {
    basement: number;
    ground: number; // 전체 지상층 수 (코어별 입력이 없을 때 사용)
    ph: number;
    coreGroundFloors?: number[]; // 코어별 지상층 수 (코어1, 코어2, ... 순서, 높은층 순서)
    coreBasementFloors?: number[]; // 코어별 지하층 수 (코어1, 코어2, ... 순서)
    corePhFloors?: number[]; // 코어별 옥탑층 수 (코어1, 코어2, ... 순서)
    pilotisCount?: number; // 필로티 수량 (기존 호환성 유지)
    corePilotisCounts?: number[]; // 코어별 필로티+ 부대시설 제외 세대수 (코어1, 코어2, ... 순서)
    corePilotisHeights?: number[]; // 코어별 필로티 높이 (개층) (코어1, 코어2, ... 순서)
    hasHighCeilingEquipmentRoom?: boolean; // 고천장 장비실 여부
  };
  heights: {
    basement2: number; // 지하2층 층고
    basement1: number; // 지하1층 층고
    standard: number; // 기준층 층고
    floor1: number; // 1층 층고
    floor2: number; // 2층 층고
    floor3: number; // 3층 층고
    floor4?: number; // 4층 층고
    floor5?: number; // 5층 층고
    top: number; // 최상층 층고
    ph: number | number[]; // PH층 층고 (단일 값 또는 배열)
  };
  standardFloorCycle?: number; // 기준층 공정사이클
  pumpCarCount?: number | null; // 펌프카 최대 투입대수
}

/**
 * 층 정보
 */
export interface Floor {
  id: string;
  buildingId: string;
  floorLabel: string; // "B2", "B1", "1F", "PH1" 등
  floorNumber: number; // 정렬용 (-2, -1, 1, 2, ...)
  levelType: LevelType;
  floorClass: FloorClass;
  height: number | null; // 층고(m)
}

/**
 * 공종 필드 데이터 (공통 구조)
 */
export interface TradeFieldData {
  areaM2?: number;
  productivity?: number;
  productivityM2?: number;
  productivityM3?: number;
  workers?: number;
  cost?: number;
  ton?: number;
  volumeM3?: number;
  wall?: number;
  beamSlab?: number;
  equipmentCount?: number;
}

/**
 * TradeData의 카테고리 키 타입
 */
export type TradeCategoryKey = keyof TradeData;

/**
 * 공종별 데이터
 */
export interface TradeData {
  // 갱폼
  gangForm?: {
    areaM2: number;
    productivity: number;
    workers: number;
    cost: number;
  };
  
  // 알폼
  alForm?: {
    areaM2: number;
    productivity: number;
    workers: number;
    cost: number;
  };
  
  // 형틀
  formwork?: {
    areaM2: number;
    productivity: number;
    workers: number;
    cost: number;
  };
  
  // 유로폼
  euroForm?: {
    areaM2: number;
    productivity: number;
    workers: number;
    cost: number;
  };
  
  // 해체/정리
  stripClean?: {
    areaM2: number;
    productivityM2: number;
    workers: number;
    cost: number;
  };
  
  // 철근
  rebar?: {
    ton: number; // 기존 (합계용)
    wall?: number; // 벽 (TON)
    beamSlab?: number; // 보/슬라브 (TON)
    productivity: number;
    workers: number;
    cost: number;
  };
  
  // 콘크리트
  concrete?: {
    volumeM3: number; // 기존 (합계용)
    wall?: number; // 벽 (M³)
    beamSlab?: number; // 보/슬라브 (M³)
    equipmentCount: number;
    productivityM3: number;
    workers: number;
    cost: number;
  };

  // 동적 접근을 위한 인덱스 시그니처 (타입 안전성 유지)
  [key: string]: TradeFieldData | undefined;
}

/**
 * 층별 공종 데이터
 */
export interface FloorTrade {
  id: string;
  floorId: string;
  buildingId: string;
  tradeGroup: string; // '버림', '기초', '아파트' 등
  trades: TradeData;
}

/**
 * 동(Building) 타입
 */
export interface Building {
  id: string;
  projectId: string;
  buildingName: string;
  buildingNumber: number;
  meta: BuildingMeta;
  floors: Floor[];
  floorTrades: FloorTrade[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 동 생성 DTO
 */
export interface CreateBuildingDTO {
  projectId: string;
  buildingName: string;
  buildingNumber: number;
  meta: BuildingMeta;
}

/**
 * 동 수정 DTO
 */
export interface UpdateBuildingDTO {
  buildingName?: string;
  meta?: Partial<BuildingMeta>;
}

/**
 * 층 수정 DTO
 */
export interface UpdateFloorDTO {
  floorClass?: FloorClass;
  height?: number | null;
}

/**
 * 층별 공종 데이터 수정 DTO
 */
export interface UpdateFloorTradeDTO {
  floorId: string;
  tradeGroup: string;
  trades: Partial<TradeData>;
}

/**
 * 단가 항목 (계획 내역 / 실행 내역)
 */
export interface UnitRateItem {
  id: string;              // 내부용 PK
  trade: string;           // 공종 (형틀/갱폼/알폼/해체정리/철근/타설 등)
  category: string;        // 구분 (거푸집 설치-합판 등)
  spec: string;            // 규격 (없으면 빈 문자열)
  unit: string;            // 단위 (M2, M, TON, 개, M3 등)
  quantity: number;        // 수량
  materialUnit: number;    // 재료비단가
  materialAmount: number;  // 재료비 금액 = quantity * materialUnit
  laborUnit: number;       // 노무비단가
  laborAmount: number;     // 노무비 금액 = quantity * laborUnit
}

/**
 * 단가 입력 타입 (계획 내역 / 실행 내역)
 */
export type UnitRateType = 'planned' | 'executed';

// ============================================
// 동별 공정 계획 타입
// ============================================

/**
 * 공정 구분 타입
 */
export type ProcessCategory = '버림' | '기초' | '지하층' | '셋팅층' | '기준층' | 'PH층' | '옥탑층';

/**
 * 공정 타입 (표준공정 또는 사이클)
 */
export type ProcessType = 
  | '표준공정'
  | '5일 사이클'
  | '6일 사이클'
  | '7일 사이클'
  | '8일 사이클'
  | '지하외벽 합벽 적용'
  | '일체타설 적용'
  | string; // 기타 커스텀 타입

/**
 * 동별 공정 계획
 */
export interface BuildingProcessPlan {
  id: string;
  buildingId: string;
  projectId: string;
  // 구분별 공정 정보
  processes: {
    [category in ProcessCategory]?: {
      days: number; // 공정일수 (간트차트에서 duration으로 사용)
      processType: ProcessType; // 선택된 공정 타입 (기본값, 층별 설정이 없을 때 사용)
      floors?: { [floorLabel: string]: { processType: ProcessType } }; // 층별 공정 타입 (지하층, PH층 등)
    };
  };
  totalDays: number; // 구분공정 합계일수 (간트차트에서 전체 일정 계산에 사용)
  // 세부공정 항목별 순작업일 오버라이드 (키: "category-floorLabel-itemId", 값: 순작업일)
  itemDirectWorkDaysOverrides?: { [key: string]: number };
  // 가설공사 흙막이 토공사 공사일수 (지하층 공정계획 전용)
  temporaryWorkDays?: number; // 가설공사 공사일수
  earthRetentionWorkDays?: number; // 흙막이 공사일수
  earthworkWorkDays?: number; // 토공사 공사일수
  // 주차장 및 3단 가시설 적용부 수량 (지하층별, 공사일수 전용)
  // 키: "floorLabel-specialType" (예: "B1-parking", "B1-facility3")
  // 값: { gangForm, alForm, formwork, stripClean, rebar, concrete }
  specialRowQuantities?: {
    [key: string]: {
      gangForm?: number;
      alForm?: number;
      formwork?: number;
      stripClean?: number;
      rebar?: number;
      concrete?: number;
    };
  };
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 동별 공정 계획 생성/수정 DTO
 */
export interface CreateBuildingProcessPlanDTO {
  buildingId: string;
  projectId: string;
  processes: {
    [category in ProcessCategory]?: {
      days?: number;
      processType: ProcessType;
    };
  };
}

export interface UpdateBuildingProcessPlanDTO {
  processes?: {
    [category in ProcessCategory]?: {
      days?: number;
      processType?: ProcessType;
    };
  };
}

/**
 * 타설구간
 */
export interface PouringSection {
  id: string; // 고유 ID
  label: string; // 'A', 'B', 'C' 등
  projectId: string;
  // 타설구간별 공정 정보
  processDays?: number;
  concreteVolume?: number; // 해당 구간의 콘크리트 물량
  equipmentCount?: number; // 해당 구간의 장비 대수
  isPassage?: boolean; // 통로부분 여부
  includesGroundFloor?: boolean; // 지상층 주동 포함 여부
  includesFacility3?: boolean; // 3단 가시설 적용부분 포함 여부
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 프로젝트 레벨 타설구간 목록
 */
export interface ProjectPouringSections {
  projectId: string;
  sections: PouringSection[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 타설구간 계산 결과
 */
export interface PouringSectionCalculationResult {
  totalConcreteVolume: number; // 입력된 총 기초 타설량
  buildingCount: number; // 입력된 동 개수
  baseSectionCount: number; // 기본 구간 개수 (FLOOR(물량 / 1,300))
  remainder: number; // 남은 물량
  calculatedCount: number; // 계산된 구간 개수 (기본 + 남은 물량 처리)
  minSectionCount: number; // 최소 구간 개수 (동 개수 + 1)
  finalSectionCount: number; // 최종 타설구간 개수
  sections: PouringSection[]; // 생성된 타설구간 목록
}

// ============================================
// CastPlan 타설 계획 타입
// ============================================

/**
 * 2D 좌표 타입
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * DXF 엔티티 타입
 */
export type DxfEntityType =
  | 'LINE'
  | 'POLYLINE'
  | 'LWPOLYLINE'
  | 'CIRCLE'
  | 'ARC'
  | 'TEXT'
  | 'MTEXT'
  | 'INSERT'
  | 'SPLINE'
  | 'ELLIPSE'
  | 'HATCH'
  | 'SOLID'
  | 'POINT'
  | 'DIMENSION'
  | '3DFACE';

/**
 * DXF 엔티티
 */
export interface DxfEntity {
  type: DxfEntityType;
  layer: string;
  color?: number;
  vertices?: Point2D[];
  // LINE
  startPoint?: Point2D;
  endPoint?: Point2D;
  // CIRCLE/ARC/ELLIPSE
  center?: Point2D;
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  // ELLIPSE
  majorAxisEndPoint?: Point2D;
  minorAxisRatio?: number;
  // TEXT
  text?: string;
  position?: Point2D;
  // SPLINE
  controlPoints?: Point2D[];
  fitPoints?: Point2D[];
  degree?: number;
  // INSERT (블록 참조)
  blockName?: string;
  insertionPoint?: Point2D;
  scale?: { x: number; y: number };
  rotation?: number;
  // POINT
  point?: Point2D;
  // HATCH
  boundaryPaths?: Point2D[][];
}

/**
 * DXF 레이어
 */
export interface DxfLayer {
  name: string;
  color: number;
  visible: boolean;
  entities: DxfEntity[];
}

/**
 * 파싱된 DXF 데이터
 */
export interface ParsedDxfData {
  layers: DxfLayer[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  blocks?: DxfBlock[];
  statistics?: DxfStatistics;
}

/**
 * DXF 블록 정의 (INSERT 참조용)
 */
export interface DxfBlock {
  name: string;
  basePoint: Point2D;
  entities: DxfEntity[];
}

/**
 * DXF 파싱 통계
 */
export interface DxfStatistics {
  totalEntities: number;
  parsedEntities: number;
  skippedEntities: number;
  entityCounts: Record<string, number>;
  layerCount: number;
  blockCount: number;
}

/**
 * DXF 파싱 진행률 이벤트
 */
export interface DxfParseProgress {
  phase: 'reading' | 'parsing' | 'processing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  statistics?: DxfStatistics;
}

/**
 * 펌프카 타입
 */
export type PumpCarType = '36M' | '42M' | '52M' | '56M' | '63M';

/**
 * 펌프카 스펙
 */
export interface PumpCarSpec {
  type: PumpCarType;
  boomLength: number;      // 붐 길이 (m)
  horizontalReach: number; // 수평 도달 (m)
  verticalReach: number;   // 수직 도달 (m)
  vehicleWidth: number;    // 차량폭 (m)
  outriggerWidth: number;  // 아웃트리거 (m)
}

/**
 * 펌프카 스펙 목록
 */
export const PUMP_CAR_SPECS: Record<PumpCarType, PumpCarSpec> = {
  '36M': { type: '36M', boomLength: 36, horizontalReach: 32, verticalReach: 36, vehicleWidth: 2.5, outriggerWidth: 8.2 },
  '42M': { type: '42M', boomLength: 42, horizontalReach: 38, verticalReach: 42, vehicleWidth: 2.5, outriggerWidth: 8.6 },
  '52M': { type: '52M', boomLength: 52, horizontalReach: 48, verticalReach: 52, vehicleWidth: 2.5, outriggerWidth: 9.4 },
  '56M': { type: '56M', boomLength: 56, horizontalReach: 52, verticalReach: 56, vehicleWidth: 2.8, outriggerWidth: 10.2 },
  '63M': { type: '63M', boomLength: 63, horizontalReach: 59, verticalReach: 63, vehicleWidth: 2.8, outriggerWidth: 11.0 },
};

/**
 * 펌프카
 */
export interface PumpCar {
  id: string;
  name: string;
  type: PumpCarType;
  position: Point2D;
  rotation: number;        // 차량 방향 (각도)
  spec: PumpCarSpec;
  assignedBlocks: string[]; // 담당 블록 ID 목록
}

/**
 * 게이트 타입
 */
export type GateType = 'main' | 'temp';

/**
 * 게이트 (장비 진입구)
 */
export interface Gate {
  id: string;
  name: string;
  position: Point2D;
  width: number;           // 게이트 폭 (m)
  direction: number;       // 진입 방향 (각도 0-360)
  type: GateType;
  maxVehicleWidth: number; // 최대 차량 폭 제한 (m)
}

/**
 * 타설 블록 (캔버스용 확장)
 */
export interface CastBlock {
  id: string;
  name: string;
  sectionId?: string;      // PouringSection 참조
  points: number[];        // 폴리곤 좌표 [x1,y1,x2,y2,...]
  color: string;           // 표시 색상 (HEX)
  thickness: number;       // 타설 두께 (m)
  concreteGrade: string;   // 콘크리트 강도 (25-24-15)
  surchargeRate: number;   // 할증률 (%)
  sequence: number;        // 타설 순서
  scheduledDate?: string;  // 타설 예정일 (ISO date)
  // 계산 값
  area?: number;           // 면적 (㎡)
  volume?: number;         // 순물량 (㎥)
  orderVolume?: number;    // 발주량 (㎥)
}

/**
 * CastPlan 도구 타입
 */
export type CastPlanTool =
  | 'select'    // 선택
  | 'pan'       // 이동
  | 'split'     // 블록 분할
  | 'gate'      // 게이트 배치
  | 'pumpcar'   // 펌프카 배치
  | 'route'     // 동선 그리기
  | 'measure';  // 측정

/**
 * CastPlan 캔버스 상태
 */
export interface CastPlanState {
  // DXF 데이터
  dxfData: ParsedDxfData | null;
  dxfFileName: string | null;

  // 캔버스 뷰
  scale: number;
  offsetX: number;
  offsetY: number;

  // 현재 도구
  activeTool: CastPlanTool;

  // 데이터
  blocks: CastBlock[];
  gates: Gate[];
  pumpCars: PumpCar[];

  // 선택 상태
  selectedBlockId: string | null;
  selectedGateId: string | null;
  selectedPumpCarId: string | null;

  // 표시 옵션
  showReachCircles: boolean;
  showLabels: boolean;
  showGrid: boolean;
  snapEnabled: boolean;
}

/**
 * CastPlan 프로젝트 저장 데이터
 */
export interface CastPlanProject {
  id: string;
  projectId: string;        // ConTech 프로젝트 ID
  name: string;
  dxfFileName: string | null;
  blocks: CastBlock[];
  gates: Gate[];
  pumpCars: PumpCar[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 물량표 내보내기 데이터
 */
export interface VolumeExportRow {
  no: number;
  blockName: string;
  area: number;             // ㎡
  thickness: number;        // m
  volume: number;           // ㎥
  surchargeRate: number;    // %
  orderVolume: number;      // ㎥
  concreteGrade: string;
}

// ============================================
// Supabase Database Row Types
// ============================================

/**
 * Supabase buildings 테이블 Row 타입
 */
export interface BuildingRow {
  id: string;
  project_id: string;
  building_name: string;
  building_number: number;
  meta: BuildingMeta;  // JSONB
  created_at: string;
  updated_at: string;
}

/**
 * Supabase floors 테이블 Row 타입
 */
export interface FloorRow {
  id: string;
  building_id: string;
  floor_label: string;
  floor_number: number;
  level_type: LevelType;
  floor_class: FloorClass;
  height: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Supabase floor_trades 테이블 Row 타입
 */
export interface FloorTradeRow {
  id: string;
  floor_id: string;
  building_id: string;
  trade_group: string;
  trades: TradeData;  // JSONB
  created_at: string;
  updated_at: string;
}

/**
 * Supabase building_process_plans 테이블 Row 타입
 */
export interface BuildingProcessPlanRow {
  id: string;
  building_id: string;
  project_id: string;
  processes: BuildingProcessPlan['processes'];  // JSONB
  total_days: number;
  item_direct_work_days_overrides: Record<string, number> | null;  // JSONB
  temporary_work_days: number | null;
  earth_retention_work_days: number | null;
  earthwork_work_days: number | null;
  special_row_quantities: BuildingProcessPlan['specialRowQuantities'] | null;  // JSONB
  created_at: string;
  updated_at: string;
}

/**
 * Supabase pouring_sections 테이블 Row 타입
 */
export interface PouringSectionRow {
  id: string;
  project_id: string;
  label: string;
  concrete_volume: number | null;
  equipment_count: number | null;
  process_days: number | null;
  is_passage: boolean;
  includes_ground_floor: boolean;
  includes_facility3: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// DB Row <-> App Model 변환 헬퍼 타입
// ============================================

/**
 * Building 생성용 Insert 타입 (id, created_at, updated_at 제외)
 */
export type BuildingInsert = Omit<BuildingRow, 'id' | 'created_at' | 'updated_at'>;

/**
 * Floor 생성용 Insert 타입
 */
export type FloorInsert = Omit<FloorRow, 'id' | 'created_at' | 'updated_at'>;

/**
 * FloorTrade 생성용 Insert 타입
 */
export type FloorTradeInsert = Omit<FloorTradeRow, 'id' | 'created_at' | 'updated_at'>;

/**
 * BuildingProcessPlan 생성용 Insert 타입
 */
export type BuildingProcessPlanInsert = Omit<BuildingProcessPlanRow, 'id' | 'created_at' | 'updated_at'>;

/**
 * PouringSection 생성용 Insert 타입
 */
export type PouringSectionInsert = Omit<PouringSectionRow, 'id' | 'created_at' | 'updated_at'>;