/**
 * 하이라이트 타겟 레지스트리
 * UI 요소를 식별하기 위한 data-* 속성과 매핑 정의
 */

import type { HighlightTarget, HighlightTargetKey } from '@/components/buildings/ProcessPlanChatbotTypes';

/**
 * 하이라이트 타겟 레지스트리 (12개 정의)
 */
export const HIGHLIGHT_REGISTRY: Record<HighlightTargetKey, HighlightTarget> = {
  // 네비게이션 요소
  buildingTabs: {
    id: 'buildingTabs',
    selector: '[data-highlight="building-tabs"]',
    label: '동 탭',
    description: '각 동을 선택하여 공정계획을 입력합니다.',
    position: 'bottom',
    category: 'navigation',
  },
  categoryExpand: {
    id: 'categoryExpand',
    selector: '[data-highlight="category-expand"]',
    label: '구분 확장',
    description: '세부 공정 정보를 펼쳐서 확인합니다.',
    position: 'right',
    category: 'navigation',
  },

  // 입력 요소
  processTypeSelector: {
    id: 'processTypeSelector',
    selector: '[data-highlight="process-type-selector"]',
    label: '공정 타입 선택',
    description: '기준층 사이클(5일/6일/7일/8일) 또는 표준공정을 선택합니다.',
    position: 'bottom',
    category: 'input',
  },
  quantityInput: {
    id: 'quantityInput',
    selector: '[data-highlight="quantity-input"]',
    label: '물량 입력',
    description: '각 공종별 물량을 입력합니다. 물량 참조 버튼으로 자동 입력 가능합니다.',
    position: 'left',
    category: 'input',
  },
  floorSettings: {
    id: 'floorSettings',
    selector: '[data-highlight="floor-settings"]',
    label: '층 설정',
    description: '공정계획에 포함할 층을 설정합니다.',
    position: 'bottom',
    category: 'input',
  },
  pumpCarSettings: {
    id: 'pumpCarSettings',
    selector: '[data-highlight="pump-car-settings"]',
    label: '펌프카 설정',
    description: '콘크리트 타설에 사용할 펌프카 대수를 설정합니다.',
    position: 'left',
    category: 'input',
  },

  // 결과 요소
  processDaysResult: {
    id: 'processDaysResult',
    selector: '[data-highlight="process-days-result"]',
    label: '공정일수 결과',
    description: '계산된 공정일수를 표시합니다.',
    position: 'top',
    category: 'result',
  },
  totalProcessDays: {
    id: 'totalProcessDays',
    selector: '[data-highlight="total-process-days"]',
    label: '총 공정일수',
    description: '전체 공정의 합계 일수입니다.',
    position: 'top',
    category: 'result',
  },
  standardCycle: {
    id: 'standardCycle',
    selector: '[data-highlight="standard-cycle"]',
    label: '기준층 사이클',
    description: '기준층의 반복 사이클 일수입니다.',
    position: 'right',
    category: 'result',
  },
  quantityTable: {
    id: 'quantityTable',
    selector: '[data-highlight="quantity-table"]',
    label: '물량표',
    description: '동별, 층별 물량 데이터를 확인합니다.',
    position: 'left',
    category: 'result',
  },

  // 액션 요소
  detailProcessTable: {
    id: 'detailProcessTable',
    selector: '[data-highlight="detail-process-table"]',
    label: '세부 공정 테이블',
    description: '각 공종별 세부 작업 내용을 확인합니다.',
    position: 'top',
    category: 'action',
  },
  saveButton: {
    id: 'saveButton',
    selector: '[data-highlight="save-button"]',
    label: '저장 버튼',
    description: '입력한 공정계획을 저장합니다.',
    position: 'left',
    category: 'action',
  },
};

/**
 * AI 응답에서 하이라이트 마커를 파싱합니다.
 * 확장된 패턴 매칭 (12개 타겟)
 */
export function parseHighlightMarkersEnhanced(text: string): HighlightTarget[] {
  const targets: HighlightTarget[] = [];
  const foundKeys = new Set<HighlightTargetKey>();

  // 패턴 매핑 (AI 응답 텍스트 -> 타겟 키)
  const patternMappings: Array<{ patterns: RegExp[]; key: HighlightTargetKey }> = [
    {
      patterns: [/\[공정타입선택\]/g, /\[공정\s?타입\]/g, /\[사이클\s?선택\]/g],
      key: 'processTypeSelector',
    },
    {
      patterns: [/\[물량입력\]/g, /\[물량\s?입력\]/g, /\[수량\s?입력\]/g],
      key: 'quantityInput',
    },
    {
      patterns: [/\[공정일수결과\]/g, /\[계산\s?결과\]/g, /\[일수\s?결과\]/g],
      key: 'processDaysResult',
    },
    {
      patterns: [/\[동탭\]/g, /\[동\s?선택\]/g, /\[동별\s?탭\]/g],
      key: 'buildingTabs',
    },
    {
      patterns: [/\[세부공정\]/g, /\[세부\s?테이블\]/g, /\[상세\s?공정\]/g],
      key: 'detailProcessTable',
    },
    {
      patterns: [/\[저장버튼\]/g, /\[저장\]/g],
      key: 'saveButton',
    },
    {
      patterns: [/\[층설정\]/g, /\[층\s?선택\]/g],
      key: 'floorSettings',
    },
    {
      patterns: [/\[펌프카설정\]/g, /\[펌프카\]/g, /\[콘크리트\s?타설\s?장비\]/g],
      key: 'pumpCarSettings',
    },
    {
      patterns: [/\[구분확장\]/g, /\[펼치기\]/g, /\[접기\/펼치기\]/g],
      key: 'categoryExpand',
    },
    {
      patterns: [/\[총공정일수\]/g, /\[전체\s?일수\]/g, /\[합계\s?일수\]/g],
      key: 'totalProcessDays',
    },
    {
      patterns: [/\[기준층사이클\]/g, /\[기준층\s?일수\]/g],
      key: 'standardCycle',
    },
    {
      patterns: [/\[물량표\]/g, /\[물량\s?테이블\]/g],
      key: 'quantityTable',
    },
  ];

  // 패턴 매칭
  for (const { patterns, key } of patternMappings) {
    for (const pattern of patterns) {
      if (pattern.test(text) && !foundKeys.has(key)) {
        foundKeys.add(key);
        targets.push(HIGHLIGHT_REGISTRY[key]);
        break;
      }
    }
  }

  return targets;
}

/**
 * 타겟 키로 하이라이트 정보를 가져옵니다.
 */
export function getHighlightTarget(key: HighlightTargetKey): HighlightTarget {
  return HIGHLIGHT_REGISTRY[key];
}

/**
 * 여러 타겟 키로 하이라이트 정보를 가져옵니다.
 */
export function getHighlightTargets(keys: HighlightTargetKey[]): HighlightTarget[] {
  return keys.map(key => HIGHLIGHT_REGISTRY[key]);
}

/**
 * 카테고리별 하이라이트 타겟을 가져옵니다.
 */
export function getHighlightTargetsByCategory(
  category: HighlightTarget['category']
): HighlightTarget[] {
  return Object.values(HIGHLIGHT_REGISTRY).filter(target => target.category === category);
}

/**
 * 모든 하이라이트 타겟 키 목록
 */
export function getAllHighlightTargetKeys(): HighlightTargetKey[] {
  return Object.keys(HIGHLIGHT_REGISTRY) as HighlightTargetKey[];
}

/**
 * AI 프롬프트용 하이라이트 마커 설명 생성
 */
export function generateHighlightMarkersGuide(): string {
  const markers = Object.entries(HIGHLIGHT_REGISTRY).map(([key, target]) => {
    const koreanLabel = getKoreanMarkerLabel(key as HighlightTargetKey);
    return `- ${koreanLabel}: "${target.description}"`;
  });

  return `
답변에서 UI 요소를 언급할 때는 다음과 같은 형식으로 표시하세요:
${markers.join('\n')}

예시: "먼저 [공정타입선택]에서 사이클을 선택하고, [물량입력]에 데이터를 입력하세요."
`;
}

/**
 * 타겟 키에 대한 한국어 마커 라벨
 */
function getKoreanMarkerLabel(key: HighlightTargetKey): string {
  const labelMap: Record<HighlightTargetKey, string> = {
    processTypeSelector: '[공정타입선택]',
    quantityInput: '[물량입력]',
    processDaysResult: '[공정일수결과]',
    buildingTabs: '[동탭]',
    detailProcessTable: '[세부공정]',
    saveButton: '[저장버튼]',
    floorSettings: '[층설정]',
    pumpCarSettings: '[펌프카설정]',
    categoryExpand: '[구분확장]',
    totalProcessDays: '[총공정일수]',
    standardCycle: '[기준층사이클]',
    quantityTable: '[물량표]',
  };
  return labelMap[key];
}
