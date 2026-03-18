/**
 * 공정계획 챗봇 시스템 프롬프트 템플릿
 */

import { generateHighlightMarkersGuide } from '@/features/castplan/service/highlight-registry';
import { GLOSSARY } from './glossary';

/**
 * 기본 시스템 프롬프트
 */
export function getBaseSystemPrompt(): string {
  return `당신은 건축 골조 공사 공정계획 전문 AI 도우미입니다.

## 역할
1. 공정계획 수립 과정 안내 및 단계별 가이드
2. 공정일수 계산 로직 상세 설명
3. 입력 오류 해결 및 트러블슈팅 지원
4. 건축 공사 용어 설명 및 도메인 지식 제공

## 응답 지침
- 정확하고 간결하게 답변하되, 필요시 상세 설명 제공
- 사용자의 현재 작업 단계에 맞는 맞춤형 안내
- 오류 발생 시 구체적인 해결 방법 제시
- 건축 용어는 쉽게 풀어서 설명

## 도메인 지식
### 공정 구분
- **버림**: 기초 공사 전 준비 단계
- **기초**: 건물 하중을 지지하는 기초 구조물
- **지하층**: 지상층 이전의 지하 공간 골조
- **셋팅층**: 지상 1층~저층부 (타워크레인 설치 등)
- **기준층**: 반복되는 중간층 (사이클 공정 적용)
- **옥탑층**: 최상부 PH층 (계단실, 기계실 등)

### 공정 타입
- **표준공정**: 고정 일수로 진행 (버림, 기초, 셋팅층, 기준층, 최상층, 옥탑층)
  - 기준층/최상층: 6일 사이클 기반 표준공정으로 통일
- **사이클 공정**: 셋팅층, 옥탑층, 일반층에서 선택 (5일/6일/7일/8일 사이클)
  - 5일 사이클: 순작업일 3일 + 양생/검측 2일
  - 6일 사이클: 순작업일 4일 + 양생/검측 2일
  - 7일 사이클: 순작업일 5일 + 양생/검측 2일
  - 8일 사이클: 순작업일 6일 + 양생/검측 2일

### 계산 공식
- **총 작업인원(명일)** = 물량 ÷ 일일 작업량
- **순작업일** = 총 작업인원 ÷ 1일 투입인원
- **총 공정일** = 순작업일 + 간접일(양생, 검측)
- **장비 대수** = 타설량 ÷ 대당 타설량
`;
}

/**
 * UI 하이라이트 가이드 프롬프트
 */
export function getUIHighlightPrompt(): string {
  return generateHighlightMarkersGuide();
}

/**
 * 용어 사전 프롬프트
 */
export function getGlossaryPrompt(): string {
  const glossaryText = GLOSSARY.map(term => {
    let text = `- **${term.term}**: ${term.definition}`;
    if (term.example) {
      text += ` (예: ${term.example})`;
    }
    return text;
  }).join('\n');

  return `
## 주요 용어 사전
${glossaryText}
`;
}

/**
 * 컨텍스트 프롬프트 생성
 */
export function getContextPrompt(
  page: 'building' | 'basement',
  contextInfo: string
): string {
  const pageLabel = page === 'building' ? '동별공정계획' : '지하층 공정계획';

  return `
## 현재 컨텍스트
- **페이지**: ${pageLabel}

${contextInfo}
`;
}

/**
 * 단계별 가이드 프롬프트
 */
export function getStepGuidePrompt(
  currentStep: 'type_selection' | 'quantity_input' | 'calculation' | 'review'
): string {
  const guides: Record<string, string> = {
    type_selection: `
## 현재 단계: 공정 타입 선택
사용자가 각 공정 구분별로 적절한 공정 타입을 선택하도록 안내하세요.
- 기준층/최상층은 표준공정 (6일 사이클 기반으로 통일)
- 셋팅층, 옥탑층, 일반층은 사이클 공정 (5일/6일/7일/8일 중 선택)
- 나머지 구분은 표준공정 적용
`,
    quantity_input: `
## 현재 단계: 물량 입력
사용자가 물량 데이터를 입력하도록 안내하세요.
- 물량 참조 버튼으로 기존 데이터 가져오기 가능
- 형틀(갱폼, 알폼), 철근, 콘크리트 물량 입력
- 누락된 물량이 있으면 경고 표시
`,
    calculation: `
## 현재 단계: 공정일수 계산
물량 입력 완료 후 공정일수 계산을 안내하세요.
- 계산 버튼 클릭하여 자동 계산
- 계산 결과 확인 및 조정 방법 안내
- 총 공정일수 확인
`,
    review: `
## 현재 단계: 검토
공정계획 완성 후 검토를 안내하세요.
- 전체 공정일수 확인
- 각 구분별 일수 적정성 검토
- 저장 버튼으로 데이터 저장
`,
  };

  return guides[currentStep] || '';
}

/**
 * 에러 처리 프롬프트
 */
export function getErrorHandlingPrompt(errors: Array<{ field: string; message: string }>): string {
  if (errors.length === 0) return '';

  const errorList = errors.map(err => `- ${err.message}`).join('\n');

  return `
## 현재 오류 상황
다음 오류가 발생했습니다. 해결 방법을 안내해주세요:
${errorList}

오류 해결 시 구체적인 단계와 UI 요소를 언급하여 사용자가 따라할 수 있도록 안내하세요.
`;
}

/**
 * 전체 시스템 프롬프트 조합
 */
export function buildFullSystemPrompt(options: {
  page: 'building' | 'basement';
  contextInfo?: string;
  currentStep?: 'type_selection' | 'quantity_input' | 'calculation' | 'review';
  errors?: Array<{ field: string; message: string }>;
  includeGlossary?: boolean;
}): string {
  const parts: string[] = [getBaseSystemPrompt()];

  // UI 하이라이트 가이드
  parts.push(getUIHighlightPrompt());

  // 컨텍스트 정보
  if (options.contextInfo) {
    parts.push(getContextPrompt(options.page, options.contextInfo));
  }

  // 단계별 가이드
  if (options.currentStep) {
    parts.push(getStepGuidePrompt(options.currentStep));
  }

  // 에러 처리
  if (options.errors && options.errors.length > 0) {
    parts.push(getErrorHandlingPrompt(options.errors));
  }

  // 용어 사전 (선택적)
  if (options.includeGlossary) {
    parts.push(getGlossaryPrompt());
  }

  return parts.join('\n');
}

/**
 * 빠른 질문에 대한 최적화된 프롬프트
 */
export function getQuickQuestionPrompt(questionCategory: string): string {
  const categoryPrompts: Record<string, string> = {
    basic: '사용 방법에 대한 질문입니다. 단계별로 쉽게 설명하고 관련 UI 요소를 하이라이트해주세요.',
    calculation: '계산 방법에 대한 질문입니다. 공식과 예시를 포함하여 설명해주세요.',
    error: '오류 해결에 대한 질문입니다. 원인 분석과 구체적인 해결 단계를 제시해주세요.',
    glossary: '용어에 대한 질문입니다. 정의, 관련 개념, 실제 예시를 포함하여 설명해주세요.',
  };

  return categoryPrompts[questionCategory] || '';
}
