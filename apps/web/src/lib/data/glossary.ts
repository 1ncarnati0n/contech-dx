/**
 * 건축 공정 용어 사전
 */

export interface GlossaryTerm {
  term: string;
  definition: string;
  category: 'process' | 'material' | 'calculation' | 'structure';
  relatedTerms?: string[];
  example?: string;
}

/**
 * 용어 사전 데이터
 */
export const GLOSSARY: GlossaryTerm[] = [
  // 공정 관련
  {
    term: '순작업일',
    definition: '실제로 작업을 수행하는 일수입니다. 간접일(양생, 검측 등)을 제외한 순수 작업 일수입니다.',
    category: 'process',
    relatedTerms: ['간접일', '총 작업일수'],
    example: '철근 조립 작업을 6일 동안 수행하면 순작업일은 6일입니다.',
  },
  {
    term: '간접일',
    definition: '직접 작업이 아닌 양생, 검측, 준비 작업 등에 소요되는 일수입니다.',
    category: 'process',
    relatedTerms: ['순작업일', '총 작업일수'],
    example: '콘크리트 타설 후 양생에 2일이 필요하면 간접일은 2일입니다.',
  },
  {
    term: '총 작업일수',
    definition: '순작업일과 간접일을 합한 전체 공정일수입니다.',
    category: 'process',
    relatedTerms: ['순작업일', '간접일'],
    example: '순작업일 6일 + 간접일 2일 = 총 작업일수 8일',
  },
  {
    term: '사이클 공정',
    definition: '기준층에서 반복되는 공정으로, 5일/6일/7일/8일 사이클로 진행됩니다.',
    category: 'process',
    relatedTerms: ['기준층', '표준공정'],
    example: '6일 사이클: 순작업일 4일 + 양생 2일 = 6일',
  },
  {
    term: '표준공정',
    definition: '고정된 일수로 진행되는 공정입니다. 버림, 기초, 셋팅층, 옥탑층 등에 적용됩니다.',
    category: 'process',
    relatedTerms: ['사이클 공정'],
    example: '기초 표준공정: 먹매김 1일 + 철근조립 6일 + 타설 1일 = 8일',
  },
  {
    term: 'CP 타설구간',
    definition: 'Critical Path 타설구간으로, 전체 공정 중 가장 긴 경로를 의미합니다. 프로젝트 일정에 직접 영향을 줍니다.',
    category: 'process',
    relatedTerms: ['타설구간'],
    example: '가설공사 + 흙막이 + 토공사 + 버림 + 기초 + 지하층까지의 가장 긴 구간',
  },
  
  // 재료 관련
  {
    term: '갱폼',
    definition: '벽체 거푸집을 의미합니다. 수직 구조물(벽, 기둥)의 거푸집 면적을 나타냅니다.',
    category: 'material',
    relatedTerms: ['알폼', '형틀'],
    example: '벽체 거푸집 면적 651㎡',
  },
  {
    term: '알폼',
    definition: '보·슬라브 거푸집을 의미합니다. 수평 구조물(보, 슬라브)의 거푸집 면적을 나타냅니다.',
    category: 'material',
    relatedTerms: ['갱폼', '형틀'],
    example: '보·슬라브 거푸집 면적 796㎡',
  },
  {
    term: '형틀',
    definition: '전체 거푸집 면적을 의미합니다. 갱폼과 알폼을 합한 값이며, 유로폼 등도 포함됩니다.',
    category: 'material',
    relatedTerms: ['갱폼', '알폼'],
    example: '형틀 = 갱폼 + 알폼 = 651㎡ + 796㎡ = 1,447㎡',
  },
  {
    term: '해체/정리',
    definition: '거푸집 해체 및 정리 작업을 의미합니다. 콘크리트 양생 후 거푸집을 제거하는 작업입니다.',
    category: 'material',
    relatedTerms: ['형틀'],
    example: '거푸집 해체 면적 1,447㎡',
  },
  
  // 계산 관련
  {
    term: '총 작업인원',
    definition: '전체 작업을 완료하기 위해 필요한 연인원(명일)입니다. 수량을 일일 작업량으로 나눈 값입니다.',
    category: 'calculation',
    relatedTerms: ['1일 투입인원', '일일 작업량'],
    example: '철근 28.57ton ÷ 1.1ton/일 = 26명일',
  },
  {
    term: '1일 투입인원',
    definition: '매일 현장에 투입되는 인원 수입니다. 총 작업인원을 순작업일로 나눈 값입니다.',
    category: 'calculation',
    relatedTerms: ['총 작업인원', '순작업일'],
    example: '총 작업인원 26명일 ÷ 순작업일 6일 = 5명',
  },
  {
    term: '일일 작업량',
    definition: '1명이 하루 동안 수행할 수 있는 작업량입니다. 생산성을 나타냅니다.',
    category: 'calculation',
    relatedTerms: ['총 작업인원'],
    example: '철근 조립: 1.1ton/일',
  },
  {
    term: '장비 대수',
    definition: '콘크리트 타설 등에 투입되는 장비(펌프카 등)의 수입니다.',
    category: 'calculation',
    relatedTerms: ['대당 타설량'],
    example: '콘크리트 400㎥ ÷ 200㎥/대 = 2대',
  },
  
  // 구조 관련
  {
    term: '기준층',
    definition: '반복되는 중간층을 의미합니다. 사이클 공정이 적용되는 층입니다.',
    category: 'structure',
    relatedTerms: ['셋팅층', '최상층', '사이클 공정'],
    example: '4층~14층이 기준층인 경우',
  },
  {
    term: '셋팅층',
    definition: '지상층 첫 시공되는 층입니다. 1~5층 저층부를 의미합니다.',
    category: 'structure',
    relatedTerms: ['기준층', '최상층'],
    example: '1층~5층이 셋팅층인 경우',
  },
  {
    term: '최상층',
    definition: '기준층과 구조가 다른 최상층을 의미합니다.',
    category: 'structure',
    relatedTerms: ['기준층', '셋팅층', '옥탑층'],
    example: '15층이 최상층인 경우',
  },
  {
    term: '옥탑층',
    definition: '계단실, 엘리베이터 기계실 등이 있는 최상부 층입니다. PH층이라고도 합니다.',
    category: 'structure',
    relatedTerms: ['최상층'],
    example: 'PH1, PH2 등',
  },
];

/**
 * 용어 검색
 */
export function searchGlossary(query: string): GlossaryTerm[] {
  const lowerQuery = query.toLowerCase();
  return GLOSSARY.filter(
    (term) =>
      term.term.toLowerCase().includes(lowerQuery) ||
      term.definition.toLowerCase().includes(lowerQuery)
  );
}

/**
 * 용어 조회
 */
export function getGlossaryTerm(term: string): GlossaryTerm | undefined {
  return GLOSSARY.find((t) => t.term === term);
}

/**
 * 카테고리별 용어 조회
 */
export function getGlossaryByCategory(category: GlossaryTerm['category']): GlossaryTerm[] {
  return GLOSSARY.filter((term) => term.category === category);
}
