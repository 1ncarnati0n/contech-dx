/**
 * 세부공정 모듈 데이터
 * 엑셀의 "골조표준공정 일수고정 산식표" 구조를 기반으로 정의
 */

import type { ProcessCategory, ProcessType } from '@/lib/types';
import type { SemanticQuantityReference } from '@/lib/types/process-quantity';

/**
 * 세부공종 항목
 */
export interface ProcessItem {
  id: string;
  workItem: string; // 직영공사 적용 항목 (예: "1.버림틀설치")
  unit: string; // 단위 (㎡, ㎥, TON 등)
  quantityReference?: string; // 레거시 물량 참조 (유지, 예: "D6", "G6", "F7*0.45")
  quantityRef?: SemanticQuantityReference; // 의미론적 물량 참조 (우선 사용)
  dailyProductivity: number; // 인당 1일 작업량
  calculationBasis?: string; // 산정 기준
  equipmentName?: string; // 투입장비명
  equipmentCount: number; // 장비대수 (고정값 또는 계산식)
  directWorkDays?: number; // 직영 순작업일 (고정값인 경우)
  indirectDays: number; // 간접일
  indirectWorkItem?: string; // 간접작업항목
  // 장비대수 계산용 기준값 (대당 타설량)
  equipmentCalculationBase?: number; // I열 값 (예: 650)
  // 장비기반 인원수 (K*5 또는 K*6)
  equipmentWorkersPerUnit?: number; // 4, 5, 6 등
  // 층별 구분 (지하층, 기준층, 옥탑층 등에서 사용)
  floorLabel?: string; // "B2", "B1", "1F", "옥탑1" 등
  // 엑셀 J~N열 참조값 (UI 표시/참조용, 계산에는 사용하지 않음)
  teamWorkerCount?: number;      // J: 작업조 기준인원
  baseWorkerCount?: number;       // K: 기준 인원
  maxTeams?: number;              // L: 최대 작업조
  adjustmentCoefficient?: number; // M: 부분별 보정계수
  maxInputWorkers?: number;       // N: 최대투입인원
}

/**
 * 세부공정 모듈
 */
export interface ProcessModule {
  id: string;
  name: ProcessType;
  category: ProcessCategory;
  items: ProcessItem[];
}

/**
 * 세부공정 모듈 데이터
 */
export const PROCESS_MODULES: ProcessModule[] = [
  // ============================================
  // 버림 - 표준공정
  // ============================================
  {
    id: 'blinding-standard',
    name: '표준공정',
    category: '버림',
    items: [
      {
        id: 'blinding-formwork',
        workItem: '버림틀설치',
        unit: '㎡',
        quantityReference: 'U6', // 동,층별물량표!U6 (유로폼)
        quantityRef: { tradeField: 'euroForm', subField: 'areaM2', ratio: 1, sourceType: 'category', tradeGroup: '버림' },
        dailyProductivity: 10,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        indirectDays: 0,
      },
      {
        id: 'blinding-concrete',
        workItem: '버림타설',
        unit: '㎥',
        quantityReference: 'G6', // 동,층별물량표!G6 (콘크리트)
        quantityRef: { tradeField: 'concrete', subField: 'volumeM3', ratio: 1, sourceType: 'category', tradeGroup: '버림' },
        dailyProductivity: 130,
        calculationBasis: '장비대수*4명 /버림부분',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1, // 계산식: CEILING(MIN(2, E5/I11), 1)
        equipmentCalculationBase: 650, // I11 값
        equipmentWorkersPerUnit: 4, // 장비당 인원수
        indirectDays: 1,
        indirectWorkItem: '양생',
        // directWorkDays는 계산식 (MAX, IF, ROUNDDOWN/ROUNDUP)
      },
    ],
  },

  // ============================================
  // 기초 - 표준공정
  // ============================================
  {
    id: 'foundation-standard',
    name: '표준공정',
    category: '기초',
    items: [
      {
        id: 'foundation-meokmaekim',
        workItem: '먹매김',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        dailyProductivity: 0,
        indirectDays: 0,
      },
      {
        id: 'foundation-rebar',
        workItem: '기초철근조립',
        unit: 'ton',
        quantityReference: 'F7', // 동,층별물량표!F7 (철근)
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 1, sourceType: 'category', tradeGroup: '기초' },
        dailyProductivity: 1.1,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 6, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'foundation-cutwork',
        workItem: '끊어치기 작업',
        unit: '㎡',
        quantityReference: 'U7', // 동,층별물량표!U7 (유로폼)
        quantityRef: { tradeField: 'euroForm', subField: 'areaM2', ratio: 1, sourceType: 'category', tradeGroup: '기초' },
        dailyProductivity: 10,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'foundation-concrete',
        workItem: '기초타설',
        unit: '㎥',
        quantityReference: 'G7', // 동,층별물량표!G7 (콘크리트)
        quantityRef: { tradeField: 'concrete', subField: 'volumeM3', ratio: 1, sourceType: 'category', tradeGroup: '기초' },
        dailyProductivity: 130,
        calculationBasis: '장비대수*5명 /기초부분',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1, // 계산식: CEILING(MIN(2, E9/I10), 1)
        equipmentCalculationBase: 650, // I10 값
        equipmentWorkersPerUnit: 5, // 장비당 인원수
        indirectDays: 3,
        indirectWorkItem: '양생',
        // directWorkDays는 계산식
      },
    ],
  },

  // ============================================
  // 셋팅층 - 표준공정
  // ============================================
  {
    id: 'setting-standard',
    name: '표준공정',
    category: '셋팅층',
    items: [
      {
        id: 'setting-meokmaekim',
        workItem: '먹매김',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1,
        dailyProductivity: 0,
        indirectDays: 0,
      },
      {
        id: 'setting-gangform',
        workItem: '갱폼 설치',
        unit: '㎡',
        quantityReference: 'B11*0.45', // 동,층별물량표!B11*0.45 (갱폼, 1층)
        quantityRef: { tradeField: 'gangForm', subField: 'areaM2', ratio: 0.45, sourceType: 'floor' },
        dailyProductivity: 30,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2, // 고정값
        indirectDays: 6,
        indirectWorkItem: '앵커/안전발판',
      },
      {
        id: 'setting-wall-rebar',
        workItem: '벽 철근조립',
        unit: 'ton',
        quantityReference: 'F11*0.5', // 동,층별물량표!F11*0.5
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 0.5, sourceType: 'floor' },
        dailyProductivity: 0.8,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2, // 고정값
        indirectDays: 0,
        indirectWorkItem: '검측',
      },
      {
        id: 'setting-alform',
        workItem: '알폼 조립',
        unit: '㎡',
        quantityReference: 'C11*0.55', // 동,층별물량표!C11*0.55 (알폼, 1층)
        quantityRef: { tradeField: 'alForm', subField: 'areaM2', ratio: 0.55, sourceType: 'floor' },
        dailyProductivity: 30,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 4, // 고정값
        indirectDays: 0,
        indirectWorkItem: '검측',
      },
      {
        id: 'setting-slab-rebar',
        workItem: '보슬라브 철근조립',
        unit: 'ton',
        quantityReference: 'F11*0.5', // 동,층별물량표!F11*0.5
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 0.5, sourceType: 'floor' },
        dailyProductivity: 0.9,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2, // 고정값
        indirectDays: 0,
        indirectWorkItem: '검측',
      },
      {
        id: 'setting-concrete',
        workItem: '타설',
        unit: '㎥',
        quantityReference: 'G11', // 동,층별물량표!G11 (콘크리트, 1층)
        quantityRef: { tradeField: 'concrete', subField: 'volumeM3', ratio: 1, sourceType: 'floor' },
        dailyProductivity: 130,
        calculationBasis: '장비대수*6명 /셋팅층',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1, // 계산식: CEILING(MIN(2, E35/I36), 1)
        equipmentCalculationBase: 400, // 셋팅층 대당 타설량 기준값
        equipmentWorkersPerUnit: 6, // 장비당 인원수
        indirectDays: 2,
        indirectWorkItem: '양생',
        // directWorkDays는 계산식
      },
    ],
  },

  // ============================================
  // 기준층 - 표준공정 (6일 사이클 기반)
  // ============================================
  {
    id: 'standard-standard',
    name: '표준공정',
    category: '기준층',
    items: [
      {
        id: 'standard-meokmaekim',
        workItem: '먹매김',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1,
        dailyProductivity: 0,
        indirectDays: 0,
      },
      {
        id: 'standard-gangform',
        workItem: '갱폼 설치',
        unit: '㎡',
        quantityReference: 'B14*0.45',
        quantityRef: { tradeField: 'gangForm', subField: 'areaM2', ratio: 0.45, sourceType: 'floor' },
        dailyProductivity: 60,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 1,
        indirectWorkItem: '보강/검측',
      },
      {
        id: 'standard-wall-rebar',
        workItem: '벽 철근조립',
        unit: 'ton',
        quantityReference: 'F14*0.5',
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 0.5, sourceType: 'floor' },
        dailyProductivity: 0.8,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'standard-alform',
        workItem: '알폼 조립',
        unit: '㎡',
        quantityReference: 'C14*0.55',
        quantityRef: { tradeField: 'alForm', subField: 'areaM2', ratio: 0.55, sourceType: 'floor' },
        dailyProductivity: 60,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'standard-slab-rebar',
        workItem: '보슬라브 철근조립',
        unit: 'ton',
        quantityReference: 'F14*0.5',
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 0.5, sourceType: 'floor' },
        dailyProductivity: 0.9,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'standard-concrete',
        workItem: '타설',
        unit: '㎥',
        quantityReference: 'G14',
        quantityRef: { tradeField: 'concrete', subField: 'volumeM3', ratio: 1, sourceType: 'floor' },
        dailyProductivity: 130,
        calculationBasis: '장비대수*6명 /기준층',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1,
        equipmentCalculationBase: 320,
        equipmentWorkersPerUnit: 6,
        indirectDays: 2,
        indirectWorkItem: '양생',
      },
    ],
  },

  // ============================================
  // 옥탑층 - 표준공정
  // ============================================
  {
    id: 'ph-standard',
    name: '표준공정',
    category: '옥탑층',
    items: [
      {
        id: 'ph-meokmaekim',
        workItem: '먹매김',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1,
        dailyProductivity: 0,
        indirectDays: 0,
      },
      {
        id: 'ph-wall-rebar',
        workItem: '벽 철근조립',
        unit: 'ton',
        quantityReference: 'F26*0.5', // 동,층별물량표!F26*0.5 (옥탑1층 철근)
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 0.5, sourceType: 'floor' },
        dailyProductivity: 0.7,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'ph-euroform',
        workItem: '유로폼 설치',
        unit: '㎡',
        quantityReference: 'U26', // 동,층별물량표!U26 (PH1층 유로폼)
        quantityRef: { tradeField: 'euroForm', subField: 'areaM2', ratio: 1, sourceType: 'floor' },
        dailyProductivity: 9,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 6, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'ph-slab-rebar',
        workItem: '보슬라브 철근조립',
        unit: 'ton',
        quantityReference: 'F26*0.5', // 동,층별물량표!F26*0.5
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 0.5, sourceType: 'floor' },
        dailyProductivity: 0.6,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'ph-concrete',
        workItem: '타설',
        unit: '㎥',
        quantityReference: 'G26', // 동,층별물량표!G26 (PH1층 콘크리트)
        quantityRef: { tradeField: 'concrete', subField: 'volumeM3', ratio: 1, sourceType: 'floor' },
        dailyProductivity: 130,
        calculationBasis: '장비대수*4명 /최상층',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1, // 계산식: CEILING(MIN(2, E50/I51), 1)
        equipmentCalculationBase: 230, // PH층 대당 타설량 기준값
        equipmentWorkersPerUnit: 4, // 장비당 인원수
        indirectDays: 2,
        indirectWorkItem: '양생',
        // directWorkDays는 계산식
      },
      {
        id: 'ph-stripclean',
        workItem: '거푸집 해체/정리',
        unit: '㎡',
        quantityReference: 'E26', // 해체/정리 (= 유로폼 × 2)
        quantityRef: { tradeField: 'stripClean', subField: 'areaM2', ratio: 1, sourceType: 'floor' },
        dailyProductivity: 50,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0,
      },
    ],
  },



  // ============================================
  // 지하주차장 - 표준공정
  // (주동지하와 달리 피트층 없음, B2/B1 구조)
  // ============================================
  {
    id: 'parking-standard',
    name: '표준공정',
    category: '지하주차장',
    items: [
      // B2층 공정
      {
        id: 'parking-b2-meokmaekim',
        workItem: '먹매김',
        unit: '',
        dailyProductivity: 0,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0,
        floorLabel: 'B2',
      },
      {
        id: 'parking-b2-wall-rebar',
        workItem: '벽 철근조립',
        unit: 'ton',
        quantityReference: 'F8*0.5',
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 0.5, sourceType: 'floor' },
        dailyProductivity: 0.8,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 5,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B2',
      },
      {
        id: 'parking-b2-formwork',
        workItem: '지하2층 거푸집 설치',
        unit: '㎡',
        quantityReference: 'D8*0.95',
        quantityRef: { tradeField: 'formwork', subField: 'areaM2', ratio: 0.95, sourceType: 'floor' },
        dailyProductivity: 11,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 17,
        indirectDays: 1,
        indirectWorkItem: '보강/검측',
        floorLabel: 'B2',
      },
      {
        id: 'parking-b2-slab-rebar',
        workItem: '보슬라브 철근조립',
        unit: 'ton',
        quantityReference: 'F8*0.5',
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 0.5, sourceType: 'floor' },
        dailyProductivity: 0.8,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 5,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B2',
      },
      {
        id: 'parking-b2-finish',
        workItem: '마감작업',
        unit: '㎡',
        quantityReference: 'D8*0.05',
        quantityRef: { tradeField: 'formwork', subField: 'areaM2', ratio: 0.05, sourceType: 'floor' },
        dailyProductivity: 11,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B2',
      },
      {
        id: 'parking-b2-concrete',
        workItem: '타설',
        unit: '㎥',
        quantityReference: 'G8',
        quantityRef: { tradeField: 'concrete', subField: 'volumeM3', ratio: 1, sourceType: 'floor' },
        dailyProductivity: 130,
        calculationBasis: '장비대수*5명',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1,
        equipmentCalculationBase: 500,
        equipmentWorkersPerUnit: 5,
        indirectDays: 3,
        indirectWorkItem: '양생',
        floorLabel: 'B2',
      },
      {
        id: 'parking-b2-stripclean',
        workItem: '거푸집 해체/정리',
        unit: '㎡',
        quantityReference: 'E8', // 해체/정리 (= 유로폼 × 2)
        quantityRef: { tradeField: 'stripClean', subField: 'areaM2', ratio: 1, sourceType: 'floor' },
        dailyProductivity: 50,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 16,
        indirectDays: 0,
        floorLabel: 'B2',
      },
      // B1층 공정
      {
        id: 'parking-b1-meokmaekim',
        workItem: '먹매김',
        unit: '',
        dailyProductivity: 0,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0,
        floorLabel: 'B1',
      },
      {
        id: 'parking-b1-wall-rebar',
        workItem: '벽 철근조립',
        unit: 'ton',
        quantityReference: 'F9*0.5',
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 0.5, sourceType: 'floor' },
        dailyProductivity: 0.7,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 5,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B1',
      },
      {
        id: 'parking-b1-formwork',
        workItem: '지하1층 거푸집 설치',
        unit: '㎡',
        quantityReference: 'D9*0.95',
        quantityRef: { tradeField: 'formwork', subField: 'areaM2', ratio: 0.95, sourceType: 'floor' },
        dailyProductivity: 9,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 19,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B1',
      },
      {
        id: 'parking-b1-slab-rebar',
        workItem: '보슬라브 철근조립',
        unit: 'ton',
        quantityReference: 'F9*0.5',
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 0.5, sourceType: 'floor' },
        dailyProductivity: 0.7,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 5,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B1',
      },
      {
        id: 'parking-b1-finish',
        workItem: '마감작업',
        unit: '㎡',
        quantityReference: 'D9*0.05',
        quantityRef: { tradeField: 'formwork', subField: 'areaM2', ratio: 0.05, sourceType: 'floor' },
        dailyProductivity: 10,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B1',
      },
      {
        id: 'parking-b1-concrete',
        workItem: '타설',
        unit: '㎥',
        quantityReference: 'G9',
        quantityRef: { tradeField: 'concrete', subField: 'volumeM3', ratio: 1, sourceType: 'floor' },
        dailyProductivity: 130,
        calculationBasis: '장비대수*5명',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1,
        equipmentCalculationBase: 500,
        equipmentWorkersPerUnit: 5,
        indirectDays: 3,
        indirectWorkItem: '양생',
        floorLabel: 'B1',
      },
      {
        id: 'parking-b1-stripclean',
        workItem: '거푸집 해체/정리',
        unit: '㎡',
        quantityReference: 'E9', // 해체/정리 (= 유로폼 × 2)
        quantityRef: { tradeField: 'stripClean', subField: 'areaM2', ratio: 1, sourceType: 'floor' },
        dailyProductivity: 50,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 22,
        indirectDays: 0,
        floorLabel: 'B1',
      },
    ],
  },

  // ============================================
  // 주동 지하층 - 층고6.5m이상 (B1+B2 통합, 시스템동바리 포함)
  // ============================================
  {
    id: 'basement-high-ceiling',
    name: '표준공정',
    category: '지하층(층고6.5m이상)',
    items: [
      {
        id: 'bhc-floor-marking',
        workItem: '먹매김',
        unit: '',
        dailyProductivity: 0,
        quantityReference: undefined,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0,
        // floorLabel 없음 (통합 지하층)
      },
      {
        id: 'bhc-wall-rebar',
        workItem: '벽 철근조립',
        unit: 'ton',
        dailyProductivity: 0.8,
        quantityReference: 'F_B1B2_COMBINED', // B1+B2 합산 벽 철근량
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 1, sourceType: 'combined', combineFloors: ['B1', 'B2'] },
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 5,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        // floorLabel 없음
      },
      // 시스템동바리 - 층고6.5m이상에서만 적용 (통합)
      {
        id: 'bhc-system-support',
        workItem: '시스템동바리',
        unit: '㎡',
        dailyProductivity: 20.0,
        directWorkDays: 6,
        quantityReference: 'C_B1B2_COMBINED', // 특수 계산 - 바닥 면적 기반
        quantityRef: { tradeField: 'alForm', subField: 'areaM2', ratio: 1, sourceType: 'combined', combineFloors: ['B1', 'B2'] },
        calculationBasis: '일수고정',
        equipmentCount: 1,
        indirectDays: 0,
        // floorLabel 없음
      },
      {
        id: 'bhc-formwork-install',
        workItem: '거푸집 설치',
        unit: '㎡',
        dailyProductivity: 11.0,
        quantityReference: 'U_B1B2_COMBINED', // B1+B2 합산 유로폼 면적
        quantityRef: { tradeField: 'euroForm', subField: 'areaM2', ratio: 1, sourceType: 'combined', combineFloors: ['B1', 'B2'] },
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 17,
        indirectDays: 1,
        indirectWorkItem: '보강/검측',
        // floorLabel 없음
      },
      {
        id: 'bhc-slab-rebar',
        workItem: '보슬라브 철근조립',
        unit: 'ton',
        dailyProductivity: 0.8,
        quantityReference: 'F_B1B2_COMBINED', // B1+B2 합산 슬라브 철근량
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 1, sourceType: 'combined', combineFloors: ['B1', 'B2'] },
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 5,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        // floorLabel 없음
      },
      {
        id: 'bhc-finishing',
        workItem: '마감작업',
        unit: '㎡',
        dailyProductivity: 11,
        quantityReference: 'U_B1B2_COMBINED', // B1+B2 합산 유로폼 면적
        quantityRef: { tradeField: 'euroForm', subField: 'areaM2', ratio: 1, sourceType: 'combined', combineFloors: ['B1', 'B2'] },
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        // floorLabel 없음
      },
      {
        id: 'bhc-concrete',
        workItem: '타설',
        unit: '㎥',
        dailyProductivity: 130,
        calculationBasis: '장비대수*5명 /지하층부분',
        equipmentName: '콘크리트 펌프차',
        equipmentCalculationBase: 500,
        equipmentWorkersPerUnit: 5,
        equipmentCount: 1,
        quantityReference: 'G_B1B2_COMBINED',
        quantityRef: { tradeField: 'concrete', subField: 'volumeM3', ratio: 1, sourceType: 'combined', combineFloors: ['B1', 'B2'] },
        indirectDays: 3,
        indirectWorkItem: '양생',
        // floorLabel 없음
      },
      {
        id: 'bhc-formwork-dismantle',
        workItem: '거푸집 해체/정리',
        unit: '㎡',
        dailyProductivity: 50.0,
        quantityReference: 'E_B1B2_COMBINED', // 해체/정리 (= 유로폼 × 2)
        quantityRef: { tradeField: 'stripClean', subField: 'areaM2', ratio: 1, sourceType: 'combined', combineFloors: ['B1', 'B2'] },
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 16,
        indirectDays: 0,
        // floorLabel 없음
      },
    ],
  },

  // ============================================
  // 주동 지하층 - 피트층포함
  // ============================================
  {
    id: 'basement-with-pit',
    name: '표준공정',
    category: '주동 지하층',
    items: [
      // === B2 층 항목 (7개) ===
      {
        id: 'bwp-meokmaekim-b2',
        workItem: '먹매김',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1,
        dailyProductivity: 0,
        indirectDays: 0,
        floorLabel: 'B2',
      },
      {
        id: 'bwp-wall-rebar-b2',
        workItem: '벽 철근조립',
        unit: 'ton',
        quantityReference: 'F8*0.5',
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 0.5, sourceType: 'floor' },
        dailyProductivity: 0.8,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 5,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B2',
      },
      {
        id: 'bwp-formwork-b2',
        workItem: '지하2층 거푸집 설치',
        unit: '㎡',
        quantityReference: 'U8*0.95',
        quantityRef: { tradeField: 'euroForm', subField: 'areaM2', ratio: 0.95, sourceType: 'floor' },
        dailyProductivity: 11,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 17,
        indirectDays: 1,
        indirectWorkItem: '보강/검측',
        floorLabel: 'B2',
      },
      {
        id: 'bwp-slab-rebar-b2',
        workItem: '보슬라브 철근조립',
        unit: 'ton',
        quantityReference: 'F8*0.5',
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 0.5, sourceType: 'floor' },
        dailyProductivity: 0.8,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 5,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B2',
      },
      {
        id: 'bwp-finish-b2',
        workItem: '마감작업',
        unit: '㎡',
        quantityReference: 'U8*0.05',
        quantityRef: { tradeField: 'euroForm', subField: 'areaM2', ratio: 0.05, sourceType: 'floor' },
        dailyProductivity: 11,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B2',
      },
      {
        id: 'bwp-concrete-b2',
        workItem: '타설',
        unit: '㎥',
        quantityReference: 'G8',
        quantityRef: { tradeField: 'concrete', subField: 'volumeM3', ratio: 1, sourceType: 'floor' },
        dailyProductivity: 130,
        calculationBasis: '장비대수*5명 /지하층부분',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1,
        equipmentCalculationBase: 500,
        equipmentWorkersPerUnit: 5,
        indirectDays: 3,
        indirectWorkItem: '양생',
        floorLabel: 'B2',
      },
      {
        id: 'bwp-stripclean-b2',
        workItem: '거푸집 해체/정리',
        unit: '㎡',
        quantityReference: 'E8', // 해체/정리 (= 유로폼 × 2)
        quantityRef: { tradeField: 'stripClean', subField: 'areaM2', ratio: 1, sourceType: 'floor' },
        dailyProductivity: 50,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 16,
        indirectDays: 0,
        floorLabel: 'B2',
      },

      // === B1 층 항목 (6개) ===
      {
        id: 'bwp-meokmaekim-b1',
        workItem: '먹매김',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1,
        dailyProductivity: 0,
        indirectDays: 0,
        floorLabel: 'B1',
      },
      {
        id: 'bwp-wall-rebar-b1',
        workItem: '벽 철근조립',
        unit: 'ton',
        quantityReference: 'F9*0.3',
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 0.3, sourceType: 'floor' },
        dailyProductivity: 0.7,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 5,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B1',
      },
      {
        id: 'bwp-formwork-b1',
        workItem: '지하1층 거푸집 설치',
        unit: '㎡',
        quantityReference: 'U9*0.65',
        quantityRef: { tradeField: 'euroForm', subField: 'areaM2', ratio: 0.65, sourceType: 'floor' },
        dailyProductivity: 9,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 19,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B1',
      },
      {
        id: 'bwp-slab-rebar-b1',
        workItem: '보슬라브 철근조립',
        unit: 'ton',
        quantityReference: 'F9*0.3',
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 0.3, sourceType: 'floor' },
        dailyProductivity: 0.7,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 5,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B1',
      },
      {
        id: 'bwp-finish-1st',
        workItem: '마감작업',
        unit: '㎡',
        quantityReference: 'U9*0.05',
        quantityRef: { tradeField: 'euroForm', subField: 'areaM2', ratio: 0.05, sourceType: 'floor' },
        dailyProductivity: 10,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B1',
      },
      {
        id: 'bwp-concrete-1st',
        workItem: '타설',
        unit: '㎥',
        quantityReference: 'G9*0.6',
        quantityRef: { tradeField: 'concrete', subField: 'volumeM3', ratio: 0.6, sourceType: 'floor' },
        dailyProductivity: 130,
        calculationBasis: '장비대수*5명 /지하층부분',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1,
        equipmentCalculationBase: 500,
        equipmentWorkersPerUnit: 5,
        indirectDays: 3,
        indirectWorkItem: '양생',
        floorLabel: 'B1',
      },

      // === B1 피트층 항목 (5개) ===
      {
        id: 'bwp-wall-rebar-pit',
        workItem: '벽 철근조립',
        unit: 'ton',
        quantityReference: 'F9*0.2',
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 0.2, sourceType: 'floor' },
        dailyProductivity: 0.7,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 3,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B1',
      },
      {
        id: 'bwp-formwork-pit',
        workItem: '피트층 거푸집 설치',
        unit: '㎡',
        quantityReference: 'U9*0.3',
        quantityRef: { tradeField: 'euroForm', subField: 'areaM2', ratio: 0.3, sourceType: 'floor' },
        dailyProductivity: 10,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B1',
      },
      {
        id: 'bwp-slab-rebar-pit',
        workItem: '보슬라브 철근조립',
        unit: 'ton',
        quantityReference: 'F9*0.2',
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 0.2, sourceType: 'floor' },
        dailyProductivity: 0.7,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 3,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B1',
      },
      {
        id: 'bwp-concrete-pit',
        workItem: '피트층 타설',
        unit: '㎥',
        quantityReference: 'G9*0.4',
        quantityRef: { tradeField: 'concrete', subField: 'volumeM3', ratio: 0.4, sourceType: 'floor' },
        dailyProductivity: 130,
        calculationBasis: '장비대수*5명 /지하층부분',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1,
        equipmentCalculationBase: 500,
        equipmentWorkersPerUnit: 5,
        indirectDays: 3,
        indirectWorkItem: '양생',
        floorLabel: 'B1',
      },
      {
        id: 'bwp-stripclean-b1',
        workItem: '거푸집 해체/정리',
        unit: '㎡',
        quantityReference: 'E9', // 해체/정리 (= 유로폼 × 2)
        quantityRef: { tradeField: 'stripClean', subField: 'areaM2', ratio: 1, sourceType: 'floor' },
        dailyProductivity: 50,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 22,
        indirectDays: 0,
        floorLabel: 'B1',
      },
    ],
  },

  // ============================================
  // 일반층 - 표준공정 (기준층과 별도)
  // ============================================
  {
    id: 'general-standard',
    name: '표준공정',
    category: '일반층',
    items: [
      {
        id: 'general-meokmaekim',
        workItem: '먹매김',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1,
        dailyProductivity: 0,
        indirectDays: 0,
      },
      {
        id: 'general-wall-rebar',
        workItem: '벽 철근조립',
        unit: 'ton',
        quantityReference: 'F14*0.5',
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 0.5, sourceType: 'floor' },
        dailyProductivity: 0.7,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'general-euroform',
        workItem: '유로폼 설치',
        unit: '㎡',
        quantityReference: 'U14',
        quantityRef: { tradeField: 'euroForm', subField: 'areaM2', ratio: 1, sourceType: 'floor' },
        dailyProductivity: 9,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 6,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'general-slab-rebar',
        workItem: '보슬라브 철근조립',
        unit: 'ton',
        quantityReference: 'F14*0.5',
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 0.5, sourceType: 'floor' },
        dailyProductivity: 0.6,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'general-concrete',
        workItem: '타설',
        unit: '㎥',
        quantityReference: 'G14',
        quantityRef: { tradeField: 'concrete', subField: 'volumeM3', ratio: 1, sourceType: 'floor' },
        dailyProductivity: 130,
        calculationBasis: '장비대수*4명 /일반층',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1,
        equipmentCalculationBase: 200,
        equipmentWorkersPerUnit: 4,
        indirectDays: 2,
        indirectWorkItem: '양생',
      },
      {
        id: 'general-stripclean',
        workItem: '거푸집 해체/정리',
        unit: '㎡',
        quantityReference: 'E14', // 해체/정리 (= 유로폼 × 2)
        quantityRef: { tradeField: 'stripClean', subField: 'areaM2', ratio: 1, sourceType: 'floor' },
        dailyProductivity: 50,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0,
      },
    ],
  },

  // ============================================
  // 최상층 - 표준공정 (6일 사이클 기반)
  // ============================================
  {
    id: 'top-standard',
    name: '표준공정',
    category: '최상층',
    items: [
      {
        id: 'top-meokmaekim',
        workItem: '먹매김',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1,
        dailyProductivity: 0,
        indirectDays: 0,
      },
      {
        id: 'top-gangform',
        workItem: '갱폼 설치',
        unit: '㎡',
        quantityReference: 'B14*0.45',
        quantityRef: { tradeField: 'gangForm', subField: 'areaM2', ratio: 0.45, sourceType: 'floor' },
        dailyProductivity: 60,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 1,
        indirectWorkItem: '보강/검측',
      },
      {
        id: 'top-wall-rebar',
        workItem: '벽 철근조립',
        unit: 'ton',
        quantityReference: 'F14*0.5',
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 0.5, sourceType: 'floor' },
        dailyProductivity: 0.8,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'top-alform',
        workItem: '알폼 조립',
        unit: '㎡',
        quantityReference: 'C14*0.55',
        quantityRef: { tradeField: 'alForm', subField: 'areaM2', ratio: 0.55, sourceType: 'floor' },
        dailyProductivity: 60,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'top-slab-rebar',
        workItem: '보슬라브 철근조립',
        unit: 'ton',
        quantityReference: 'F14*0.5',
        quantityRef: { tradeField: 'rebar', subField: 'ton', ratio: 0.5, sourceType: 'floor' },
        dailyProductivity: 0.9,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'top-concrete',
        workItem: '타설',
        unit: '㎥',
        quantityReference: 'G14',
        quantityRef: { tradeField: 'concrete', subField: 'volumeM3', ratio: 1, sourceType: 'floor' },
        dailyProductivity: 130,
        calculationBasis: '장비대수*6명 /최상층',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1,
        equipmentCalculationBase: 230,
        equipmentWorkersPerUnit: 6,
        indirectDays: 2,
        indirectWorkItem: '양생',
      },
    ],
  },
];

/**
 * 기준층/최상층 레거시 사이클 → 표준공정 폴백 매핑
 * DB에 '5일 사이클'~'8일 사이클'로 저장된 기존 데이터 호환용
 */
const LEGACY_PROCESS_TYPE_MAP: Partial<Record<string, ProcessType>> = {
  '5일 사이클': '표준공정',
  '6일 사이클': '표준공정',
  '7일 사이클': '표준공정',
  '8일 사이클': '표준공정',
};

/**
 * 구분과 공정타입으로 모듈 찾기
 */
export function getProcessModule(
  category: ProcessCategory,
  processType: ProcessType
): ProcessModule | undefined {
  let result = PROCESS_MODULES.find(
    module => module.category === category && module.name === processType
  );

  // 기준층/최상층의 레거시 사이클 → 표준공정 폴백
  if (!result && (category === '기준층' || category === '최상층')) {
    const mapped = LEGACY_PROCESS_TYPE_MAP[processType];
    if (mapped) {
      result = PROCESS_MODULES.find(
        module => module.category === category && module.name === mapped
      );
    }
  }

  return result;
}

/**
 * 모듈 ID로 직접 모듈 가져오기
 * 동일한 name을 가진 모듈이 여러 개 있을 때 명확하게 구분하기 위해 사용
 */
export function getProcessModuleById(moduleId: string): ProcessModule | undefined {
  return PROCESS_MODULES.find(module => module.id === moduleId);
}

/**
 * 구분별 사용 가능한 모듈 목록
 */
export function getAvailableModules(category: ProcessCategory): ProcessModule[] {
  return PROCESS_MODULES.filter(module => module.category === category);
}
