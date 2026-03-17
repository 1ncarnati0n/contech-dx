import {
  LayoutDashboard,
  Box,
  Calculator,
  Database,
  Package,
  Layers,
  DollarSign,
  Calendar,
  BarChart3,
  Users,
  FileText,
  Settings,
  Building,
  type LucideIcon,
} from 'lucide-react';

// 탭 ID → URL 경로 매핑
export const TAB_ROUTES: Record<string, string> = {
  overview: '',
  ifc_viewer: '/ifc-viewer',
  pouring_section_review: '/pouring-section',
  data_input: '/basic-info',
  quantity_input: '/quantity',
  detailed_quantity_input: '/detailed-quantity',
  geological_data: '/geological-data',
  planned_unit_rate: '/unit-rate',
  executed_unit_rate: '/executed-unit-rate',
  process_logic: '/process-logic',
  building_process_plan: '/building-process-plan',
  basement_process_plan: '/basement-process-plan',
  gantt_chart: '/gantt-chart',
  team: '/team',
  documents: '/documents',
  settings: '/settings',
};

// URL 경로 → 탭 ID 역매핑
const PATH_TO_TAB: Record<string, string> = Object.fromEntries(
  Object.entries(TAB_ROUTES).map(([tab, path]) => [path, tab])
);

export function pathToTabId(pathname: string): string {
  // /projects/[id]/basic-info → /basic-info
  const match = pathname.match(/\/projects\/[^/]+(.*)$/);
  const subPath = match?.[1] || '';
  return PATH_TO_TAB[subPath] || 'overview';
}

export function getTabHref(projectId: string, tabId: string): string {
  const route = TAB_ROUTES[tabId] || '';
  return `/projects/${projectId}${route}`;
}

// 탭별 제목
export const TAB_TITLES: Record<string, string> = {
  overview: '프로젝트 개요',
  ifc_viewer: 'IFC 뷰어',
  pouring_section_review: '타설구간검토',
  data_input: '동 기본 정보',
  quantity_input: '물량 입력',
  detailed_quantity_input: '상세물량입력',
  geological_data: '지질 데이터 입력',
  planned_unit_rate: '단가 입력',
  executed_unit_rate: '실행 단가',
  process_logic: '공정로직',
  building_process_plan: '지상층 공정계획',
  basement_process_plan: '지하층 공정계획',
  gantt_chart: '간트차트',
  team: '팀 관리',
  documents: '문서 관리',
  settings: '설정',
};

// 탭별 설명
export const TAB_DESCRIPTIONS: Record<string, string> = {
  overview: '',
  ifc_viewer: 'IFC 모델 뷰어 페이지입니다.',
  pouring_section_review: '콘크리트 물량과 동수를 기반으로 타설구간을 개략 검토합니다.',
  data_input: '각 동의 기본 정보와 층 구성을 입력합니다.',
  quantity_input: '층별/공종별 물량 데이터를 입력합니다.',
  detailed_quantity_input: '동별·층별·공종별 물량을 입력합니다.',
  geological_data: '지질 조사 데이터를 입력합니다.',
  planned_unit_rate: '계획 단가를 입력합니다.',
  executed_unit_rate: '실행 단가를 입력합니다.',
  process_logic: '공정 계산 공식, 모듈, 사이클 정의를 관리합니다.',
  building_process_plan: '지상층 공정계획을 수립하고 일수를 계산합니다.',
  basement_process_plan: '지하층 공정계획을 수립하고 일수를 계산합니다.',
  gantt_chart: '프로젝트 공정 현황을 한눈에 확인하세요.',
  team: '프로젝트에 참여하는 팀원을 관리합니다.',
  documents: '프로젝트 문서를 관리합니다.',
  settings: '프로젝트 설정을 관리합니다.',
};

// 탭별 아이콘
export const TAB_ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  ifc_viewer: Box,
  pouring_section_review: Calculator,
  data_input: Database,
  quantity_input: Package,
  detailed_quantity_input: Package,
  geological_data: Layers,
  planned_unit_rate: DollarSign,
  executed_unit_rate: DollarSign,
  process_logic: Calculator,
  building_process_plan: Calendar,
  basement_process_plan: Calendar,
  gantt_chart: BarChart3,
  team: Users,
  documents: FileText,
  settings: Settings,
};
