/**
 * 전역 챗봇 설정
 * 페이지별 시스템 프롬프트, 빠른 질문, UI 설정 정의
 */

import type { PageType } from '@/lib/hooks/usePageContext';

/**
 * 빠른 질문 타입
 */
export interface QuickQuestion {
  id: string;
  question: string;
  description: string;
  category: 'guide' | 'feature' | 'help' | 'faq';
}

/**
 * 페이지별 챗봇 설정
 */
export interface PageChatbotConfig {
  /** 챗봇 타이틀 */
  title: string;
  /** 챗봇 설명 */
  description: string;
  /** 빠른 질문 목록 */
  quickQuestions: QuickQuestion[];
  /** 시스템 프롬프트 */
  systemPrompt: string;
  /** 환영 메시지 */
  welcomeMessage: string;
}

/**
 * 기본 시스템 프롬프트 템플릿
 */
const BASE_SYSTEM_PROMPT = `당신은 ConTech-DX 플랫폼의 AI 도우미입니다.
사용자의 질문에 친절하고 정확하게 답변해주세요.

## 기본 원칙
- 한국어로 답변합니다
- 간결하고 명확하게 설명합니다
- 불확실한 내용은 추측하지 않습니다
- 필요한 경우 추가 정보를 요청합니다

## ConTech-DX 플랫폼 정보
ConTech-DX는 건설 프로젝트 관리를 위한 스마트 건축 플랫폼입니다.
주요 기능:
- 프로젝트 관리: 건설 프로젝트 생성 및 관리
- 지상층 공정계획: 지상층 공정일수 계산 및 관리
- 지하층 공정계획: 지하 구조물 공정 관리
- 간트 차트: 프로젝트 일정 시각화
- 게시판: 공지사항 및 정보 공유
`;

/**
 * 페이지별 챗봇 설정 매핑
 */
export const PAGE_CHATBOT_CONFIGS: Record<PageType, PageChatbotConfig> = {
  home: {
    title: '플랫폼 도우미',
    description: 'ConTech-DX 플랫폼 사용을 도와드립니다',
    welcomeMessage: 'ConTech-DX에 오신 것을 환영합니다! 무엇을 도와드릴까요?',
    systemPrompt: `${BASE_SYSTEM_PROMPT}

## 현재 페이지: 홈
사용자가 홈 화면에 있습니다.
플랫폼 소개, 기능 안내, 시작 방법 등을 안내해주세요.`,
    quickQuestions: [
      { id: 'home-1', question: 'ConTech-DX는 어떤 서비스인가요?', description: '플랫폼 소개', category: 'guide' },
      { id: 'home-2', question: '어떤 기능들이 있나요?', description: '주요 기능', category: 'feature' },
      { id: 'home-3', question: '프로젝트를 어떻게 시작하나요?', description: '시작 가이드', category: 'guide' },
      { id: 'home-4', question: '공정계획이란 무엇인가요?', description: '공정계획 소개', category: 'faq' },
    ],
  },

  projects: {
    title: '프로젝트 도우미',
    description: '프로젝트 관리를 도와드립니다',
    welcomeMessage: '프로젝트 관리에 대해 무엇이든 물어보세요!',
    systemPrompt: `${BASE_SYSTEM_PROMPT}

## 현재 페이지: 프로젝트 목록
사용자가 프로젝트 목록 페이지에 있습니다.
프로젝트 생성, 검색, 필터링, 관리 방법을 안내해주세요.`,
    quickQuestions: [
      { id: 'projects-1', question: '새 프로젝트는 어떻게 만드나요?', description: '프로젝트 생성', category: 'guide' },
      { id: 'projects-2', question: '프로젝트를 검색하려면?', description: '검색 방법', category: 'feature' },
      { id: 'projects-3', question: '프로젝트 상태 변경은 어떻게 하나요?', description: '상태 관리', category: 'help' },
      { id: 'projects-4', question: '프로젝트를 삭제할 수 있나요?', description: '삭제 방법', category: 'faq' },
    ],
  },

  'project-detail': {
    title: '프로젝트 도우미',
    description: '프로젝트 상세 정보 관리를 도와드립니다',
    welcomeMessage: '이 프로젝트에 대해 무엇이든 물어보세요!',
    systemPrompt: `${BASE_SYSTEM_PROMPT}

## 현재 페이지: 프로젝트 상세
사용자가 특정 프로젝트의 상세 페이지에 있습니다.
프로젝트 정보 수정, 건물 추가, 공정계획 수립, 멤버 관리 등을 안내해주세요.`,
    quickQuestions: [
      { id: 'detail-1', question: '건물을 추가하려면 어떻게 하나요?', description: '건물 추가', category: 'guide' },
      { id: 'detail-2', question: '공정계획은 어떻게 수립하나요?', description: '공정계획 시작', category: 'guide' },
      { id: 'detail-3', question: '프로젝트 정보를 수정하려면?', description: '정보 수정', category: 'help' },
      { id: 'detail-4', question: '간트차트는 어디서 볼 수 있나요?', description: '간트차트', category: 'feature' },
    ],
  },

  'project-gantt': {
    title: '간트차트 도우미',
    description: '간트차트 사용을 도와드립니다',
    welcomeMessage: '간트차트 사용에 대해 도움이 필요하신가요?',
    systemPrompt: `${BASE_SYSTEM_PROMPT}

## 현재 페이지: 간트 차트
사용자가 프로젝트 간트 차트 페이지에 있습니다.
일정 조회, 마일스톤 관리, 의존성 설정, 진행률 확인 등을 안내해주세요.`,
    quickQuestions: [
      { id: 'gantt-1', question: '마일스톤을 추가하려면?', description: '마일스톤 추가', category: 'guide' },
      { id: 'gantt-2', question: '일정 의존성은 어떻게 설정하나요?', description: '의존성 설정', category: 'guide' },
      { id: 'gantt-3', question: '날짜 범위를 변경하려면?', description: '날짜 조정', category: 'help' },
      { id: 'gantt-4', question: '진행률은 어떻게 확인하나요?', description: '진행률 확인', category: 'feature' },
    ],
  },

  'building-process-plan': {
    title: '공정계획 도우미',
    description: '지상층 공정계획 수립을 도와드립니다',
    welcomeMessage: '공정계획 수립에 관한 질문에 답변드리겠습니다!',
    systemPrompt: `${BASE_SYSTEM_PROMPT}

## 현재 페이지: 지상층 공정계획
사용자가 건물의 지상층 공정계획 페이지에 있습니다.
공정 타입 선택, 물량 입력, 공정일수 계산, 저장 방법 등을 상세히 안내해주세요.

### 공정계획 주요 개념
- **공정 카테고리**: 셋팅층, 기준층, 옥탑층 (지하층, 기초, 버림은 별도 탭에서 관리)
- **공정 타입**: 각 카테고리별 사이클 유형 (예: 5일사이클, 6일사이클)
- **물량**: 형틀(갱폼/알폼), 철근, 콘크리트 물량
- **공정일수**: 순작업일 + 간접일로 계산

### 자주 묻는 질문
- 5일 사이클 vs 6일 사이클: 콘크리트 양생 기간에 따른 차이
- 물량 참조: 건물의 층별 물량 데이터를 가져와서 계산에 활용
- 순작업일: 실제 작업이 수행되는 일수
- 간접일: 준비, 양생, 대기 등의 간접 작업일`,
    quickQuestions: [
      { id: 'bpp-1', question: '공정 타입은 어떻게 선택하나요?', description: '타입 선택', category: 'guide' },
      { id: 'bpp-2', question: '물량 참조는 어떻게 하나요?', description: '물량 참조', category: 'guide' },
      { id: 'bpp-3', question: '공정일수 계산 방법은?', description: '계산 방법', category: 'help' },
      { id: 'bpp-4', question: '5일 사이클과 6일 사이클의 차이는?', description: '사이클 비교', category: 'faq' },
    ],
  },

  'basement-process-plan': {
    title: '지하층 공정계획 도우미',
    description: '지하층 공정계획 수립을 도와드립니다',
    welcomeMessage: '지하층 공정계획에 관해 무엇이든 물어보세요!',
    systemPrompt: `${BASE_SYSTEM_PROMPT}

## 현재 페이지: 지하층 공정계획
사용자가 지하층 공정계획 페이지에 있습니다.
지하 구조물의 공정계획 수립, 버림/기초/지하층 공정 관리를 안내해주세요.

### 지하층 공정 특징
- 버림 콘크리트: 기초 하부 보호용 콘크리트
- 기초: 건물의 기초 구조물
- 지하층: 지하 1층부터 최하층까지의 구조물`,
    quickQuestions: [
      { id: 'basement-1', question: '지하층 공정은 동별 공정과 다른가요?', description: '차이점', category: 'faq' },
      { id: 'basement-2', question: '버림 콘크리트란 무엇인가요?', description: '버림 설명', category: 'help' },
      { id: 'basement-3', question: '지하층 물량은 어떻게 입력하나요?', description: '물량 입력', category: 'guide' },
      { id: 'basement-4', question: '기초 공정 계산 방법은?', description: '기초 계산', category: 'guide' },
    ],
  },

  posts: {
    title: '게시판 도우미',
    description: '게시판 사용을 도와드립니다',
    welcomeMessage: '게시판 이용에 대해 무엇이든 물어보세요!',
    systemPrompt: `${BASE_SYSTEM_PROMPT}

## 현재 페이지: 게시판
사용자가 게시판 목록 페이지에 있습니다.
글 작성, 검색, 카테고리 필터링 등을 안내해주세요.`,
    quickQuestions: [
      { id: 'posts-1', question: '글을 작성하려면 어떻게 하나요?', description: '글 작성', category: 'guide' },
      { id: 'posts-2', question: '글을 검색하려면?', description: '검색 방법', category: 'feature' },
      { id: 'posts-3', question: '카테고리별로 필터링하려면?', description: '필터링', category: 'help' },
      { id: 'posts-4', question: '파일 첨부는 어떻게 하나요?', description: '파일 첨부', category: 'faq' },
    ],
  },

  'post-detail': {
    title: '게시판 도우미',
    description: '게시글 관련 도움을 드립니다',
    welcomeMessage: '게시글에 대해 궁금한 점이 있으신가요?',
    systemPrompt: `${BASE_SYSTEM_PROMPT}

## 현재 페이지: 게시글 상세
사용자가 특정 게시글을 보고 있습니다.
댓글 작성, 글 수정, 삭제, 공유 등을 안내해주세요.`,
    quickQuestions: [
      { id: 'post-1', question: '댓글을 작성하려면?', description: '댓글 작성', category: 'guide' },
      { id: 'post-2', question: '글을 수정하려면 어떻게 하나요?', description: '글 수정', category: 'help' },
      { id: 'post-3', question: '글을 삭제할 수 있나요?', description: '글 삭제', category: 'faq' },
      { id: 'post-4', question: '첨부파일을 다운로드하려면?', description: '파일 다운로드', category: 'feature' },
    ],
  },

  profile: {
    title: '프로필 도우미',
    description: '프로필 관리를 도와드립니다',
    welcomeMessage: '프로필 설정에 대해 도움이 필요하신가요?',
    systemPrompt: `${BASE_SYSTEM_PROMPT}

## 현재 페이지: 프로필
사용자가 프로필 페이지에 있습니다.
프로필 수정, 비밀번호 변경, 알림 설정 등을 안내해주세요.`,
    quickQuestions: [
      { id: 'profile-1', question: '프로필 사진을 변경하려면?', description: '사진 변경', category: 'guide' },
      { id: 'profile-2', question: '비밀번호는 어떻게 변경하나요?', description: '비밀번호 변경', category: 'help' },
      { id: 'profile-3', question: '알림 설정을 변경하려면?', description: '알림 설정', category: 'feature' },
      { id: 'profile-4', question: '계정을 삭제할 수 있나요?', description: '계정 삭제', category: 'faq' },
    ],
  },

  admin: {
    title: '관리자 도우미',
    description: '관리자 기능을 도와드립니다',
    welcomeMessage: '관리자 기능에 대해 안내해드리겠습니다.',
    systemPrompt: `${BASE_SYSTEM_PROMPT}

## 현재 페이지: 관리자 대시보드
사용자가 관리자 페이지에 있습니다.
시스템 관리, 사용자 관리, 통계 확인 등을 안내해주세요.`,
    quickQuestions: [
      { id: 'admin-1', question: '사용자 목록은 어디서 보나요?', description: '사용자 관리', category: 'guide' },
      { id: 'admin-2', question: '시스템 설정을 변경하려면?', description: '시스템 설정', category: 'feature' },
      { id: 'admin-3', question: '통계는 어디서 확인하나요?', description: '통계 확인', category: 'help' },
      { id: 'admin-4', question: '권한 설정은 어떻게 하나요?', description: '권한 관리', category: 'faq' },
    ],
  },

  'admin-users': {
    title: '회원 관리 도우미',
    description: '회원 관리를 도와드립니다',
    welcomeMessage: '회원 관리에 대해 무엇이든 물어보세요!',
    systemPrompt: `${BASE_SYSTEM_PROMPT}

## 현재 페이지: 회원 관리
사용자가 관리자의 회원 관리 페이지에 있습니다.
회원 조회, 권한 변경, 계정 정지/해제 등을 안내해주세요.`,
    quickQuestions: [
      { id: 'users-1', question: '회원 정보를 검색하려면?', description: '회원 검색', category: 'guide' },
      { id: 'users-2', question: '회원 권한을 변경하려면?', description: '권한 변경', category: 'help' },
      { id: 'users-3', question: '계정을 정지시키려면?', description: '계정 정지', category: 'feature' },
      { id: 'users-4', question: '회원 데이터를 내보내려면?', description: '데이터 내보내기', category: 'faq' },
    ],
  },

  'admin-settings': {
    title: '설정 도우미',
    description: '시스템 설정을 도와드립니다',
    welcomeMessage: '시스템 설정에 대해 안내해드리겠습니다.',
    systemPrompt: `${BASE_SYSTEM_PROMPT}

## 현재 페이지: 시스템 설정
사용자가 관리자의 시스템 설정 페이지에 있습니다.
시스템 설정 변경, 백업, 복원 등을 안내해주세요.`,
    quickQuestions: [
      { id: 'settings-1', question: '시스템 백업은 어떻게 하나요?', description: '백업 방법', category: 'guide' },
      { id: 'settings-2', question: '알림 설정을 변경하려면?', description: '알림 설정', category: 'help' },
      { id: 'settings-3', question: '로고를 변경할 수 있나요?', description: '로고 변경', category: 'feature' },
      { id: 'settings-4', question: '데이터를 복원하려면?', description: '데이터 복원', category: 'faq' },
    ],
  },

  unknown: {
    title: '도우미',
    description: 'ConTech-DX 플랫폼 사용을 도와드립니다',
    welcomeMessage: '무엇을 도와드릴까요?',
    systemPrompt: BASE_SYSTEM_PROMPT,
    quickQuestions: [
      { id: 'unknown-1', question: '이 페이지에서 무엇을 할 수 있나요?', description: '페이지 안내', category: 'guide' },
      { id: 'unknown-2', question: '도움말을 보려면 어디로 가나요?', description: '도움말', category: 'help' },
      { id: 'unknown-3', question: '홈으로 돌아가려면?', description: '홈으로', category: 'faq' },
    ],
  },
};

/**
 * 페이지 타입에 따른 챗봇 설정 가져오기
 */
export function getPageChatbotConfig(pageType: PageType): PageChatbotConfig {
  return PAGE_CHATBOT_CONFIGS[pageType] || PAGE_CHATBOT_CONFIGS.unknown;
}

/**
 * 동적 빠른 질문 타입 (탭 컨텍스트 기반)
 */
export interface DynamicQuickQuestion extends QuickQuestion {
  priority: number; // 높을수록 우선 표시
}

/**
 * 공정계획 단계별 추천 질문
 */
const PROCESS_PLAN_STEP_QUESTIONS: Record<
  'type_selection' | 'quantity_input' | 'calculation' | 'review',
  DynamicQuickQuestion[]
> = {
  type_selection: [
    {
      id: 'step-type-1',
      question: '어떤 사이클을 선택해야 하나요?',
      description: '사이클 선택 기준',
      category: 'guide',
      priority: 10,
    },
    {
      id: 'step-type-2',
      question: '5일 사이클과 6일 사이클의 차이는?',
      description: '사이클 비교',
      category: 'faq',
      priority: 9,
    },
    {
      id: 'step-type-3',
      question: '공정 타입은 어떤 기준으로 결정하나요?',
      description: '타입 기준',
      category: 'guide',
      priority: 8,
    },
  ],
  quantity_input: [
    {
      id: 'step-qty-1',
      question: '물량 참조는 어떻게 하나요?',
      description: '물량 참조 방법',
      category: 'guide',
      priority: 10,
    },
    {
      id: 'step-qty-2',
      question: '누락된 물량을 확인하려면?',
      description: '누락 물량 확인',
      category: 'help',
      priority: 9,
    },
    {
      id: 'step-qty-3',
      question: '물량 데이터는 어디서 가져오나요?',
      description: '물량 데이터 출처',
      category: 'faq',
      priority: 8,
    },
  ],
  calculation: [
    {
      id: 'step-calc-1',
      question: '공정일수는 어떻게 계산되나요?',
      description: '계산 방법',
      category: 'guide',
      priority: 10,
    },
    {
      id: 'step-calc-2',
      question: '계산 결과가 이상하면 어떻게 하나요?',
      description: '결과 검증',
      category: 'help',
      priority: 9,
    },
    {
      id: 'step-calc-3',
      question: '순작업일과 간접일의 차이는?',
      description: '일수 구분',
      category: 'faq',
      priority: 8,
    },
  ],
  review: [
    {
      id: 'step-review-1',
      question: '검토할 때 어떤 점을 확인해야 하나요?',
      description: '검토 포인트',
      category: 'guide',
      priority: 10,
    },
    {
      id: 'step-review-2',
      question: '저장 후 수정할 수 있나요?',
      description: '수정 가능 여부',
      category: 'faq',
      priority: 9,
    },
    {
      id: 'step-review-3',
      question: '현재 공정계획 상태를 요약해주세요',
      description: '상태 요약',
      category: 'help',
      priority: 8,
    },
  ],
};

/**
 * 오류 상황별 추천 질문
 */
const ERROR_QUESTIONS: DynamicQuickQuestion[] = [
  {
    id: 'error-1',
    question: '오류를 어떻게 해결하나요?',
    description: '오류 해결 방법',
    category: 'help',
    priority: 20, // 오류 질문은 최우선
  },
  {
    id: 'error-2',
    question: '필수 입력 항목은 무엇인가요?',
    description: '필수 항목 안내',
    category: 'guide',
    priority: 19,
  },
];

/**
 * 동 컨텍스트 기반 추천 질문
 */
const BUILDING_CONTEXT_QUESTIONS: DynamicQuickQuestion[] = [
  {
    id: 'building-1',
    question: '현재 동의 공정 상태를 알려주세요',
    description: '동 상태 요약',
    category: 'help',
    priority: 15,
  },
  {
    id: 'building-2',
    question: '이 동의 총 공정일수는 얼마인가요?',
    description: '공정일수 확인',
    category: 'feature',
    priority: 14,
  },
];

/**
 * 탭 컨텍스트 기반 동적 빠른 질문 생성
 */
export interface TabContext {
  buildingName?: string;
  currentStep?: 'type_selection' | 'quantity_input' | 'calculation' | 'review';
  hasErrors?: boolean;
  totalDays?: number;
  completionRate?: number;
}

/**
 * 탭 컨텍스트를 기반으로 동적 빠른 질문 목록 생성
 * @param tabContext 현재 탭 컨텍스트
 * @param baseQuestions 기본 빠른 질문 목록
 * @param maxQuestions 최대 질문 수 (기본 4개)
 */
export function getDynamicQuickQuestions(
  tabContext: TabContext | null,
  baseQuestions: QuickQuestion[],
  maxQuestions: number = 4
): QuickQuestion[] {
  // 탭 컨텍스트가 없으면 기본 질문 반환
  if (!tabContext) {
    return baseQuestions.slice(0, maxQuestions);
  }

  const dynamicQuestions: DynamicQuickQuestion[] = [];

  // 1. 오류가 있으면 오류 관련 질문 추가 (최우선)
  if (tabContext.hasErrors) {
    dynamicQuestions.push(...ERROR_QUESTIONS);
  }

  // 2. 동 컨텍스트 기반 질문 추가
  if (tabContext.buildingName) {
    dynamicQuestions.push(...BUILDING_CONTEXT_QUESTIONS);
  }

  // 3. 현재 단계별 질문 추가
  if (tabContext.currentStep) {
    dynamicQuestions.push(...PROCESS_PLAN_STEP_QUESTIONS[tabContext.currentStep]);
  }

  // 4. 우선순위 정렬 및 중복 제거
  const sortedQuestions = dynamicQuestions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, maxQuestions);

  // 5. DynamicQuickQuestion을 QuickQuestion으로 변환
  return sortedQuestions.map(({ priority, ...rest }) => rest);
}

/**
 * 카테고리별 스타일 설정
 */
export const QUICK_QUESTION_CATEGORY_STYLES: Record<
  QuickQuestion['category'],
  { color: string; bgColor: string; borderColor: string }
> = {
  guide: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  feature: {
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  help: {
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  faq: {
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
};
