/**
 * 세부공정 모듈 데이터
 * 엑셀의 "골조표준공정 일수고정 산식표" 구조를 기반으로 정의
 */

import type { ProcessCategory, ProcessType } from '@/lib/types';

/**
 * 세부공종 항목
 */
export interface ProcessItem {
  id: string;
  workItem: string; // 직영공사 적용 항목 (예: "1.버림틀설치")
  unit: string; // 단위 (㎡, ㎥, TON 등)
  quantityReference?: string; // 물량 참조 패턴 (예: "D6", "G6", "F7*0.45")
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
        workItem: '1.버림틀설치',
        unit: '㎡',
        quantityReference: 'D6', // 동,층별물량표!D6 (형틀)
        dailyProductivity: 10,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        indirectDays: 0,
      },
      {
        id: 'blinding-concrete',
        workItem: '2.버림타설',
        unit: '㎥',
        quantityReference: 'G6', // 동,층별물량표!G6 (콘크리트)
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
        workItem: '3.먹매김',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        dailyProductivity: 0,
        indirectDays: 0,
      },
      {
        id: 'foundation-rebar',
        workItem: '4.기초철근조립',
        unit: 'ton',
        quantityReference: 'F7', // 동,층별물량표!F7 (철근)
        dailyProductivity: 1.1,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 6, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'foundation-cutwork',
        workItem: '5.끊어치기 작업',
        unit: '㎡',
        quantityReference: 'D7', // 동,층별물량표!D7 (형틀)
        dailyProductivity: 10,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'foundation-concrete',
        workItem: '6.기초타설',
        unit: '㎥',
        quantityReference: 'G7', // 동,층별물량표!G7 (콘크리트)
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
  // 지하층 - 지하2층 표준 지하1층 2차마감
  // ============================================
  {
    id: 'basement-standard',
    name: '표준공정',
    category: '지하층',
    items: [
      {
        id: 'basement-meokmaekim-1',
        workItem: '1.먹매김(1일)',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        dailyProductivity: 0,
        indirectDays: 0,
        floorLabel: 'B2', // 지하2층
      },
      {
        id: 'basement-wall-rebar-b2',
        workItem: '2.옹벽철근조립',
        unit: 'ton',
        quantityReference: 'F8*0.45', // 동,층별물량표!F8*0.45
        dailyProductivity: 0.8,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 5, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B2', // 지하2층
      },
      {
        id: 'basement-formwork-b2',
        workItem: '3.지하2층거푸집설치',
        unit: '㎡',
        quantityReference: 'D8*0.95', // 동,층별물량표!D8*0.95
        dailyProductivity: 11,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 17, // 고정값
        indirectDays: 1,
        indirectWorkItem: '보강/검측',
        floorLabel: 'B2', // 지하2층
      },
      {
        id: 'basement-slab-rebar-b2',
        workItem: '4.보슬라브철근조립',
        unit: 'ton',
        quantityReference: 'F8*0.55', // 동,층별물량표!F8*0.55
        dailyProductivity: 0.8,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 5, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B2', // 지하2층
      },
      {
        id: 'basement-finish-b2',
        workItem: '5.마감작업',
        unit: '㎡',
        quantityReference: 'D8*0.05', // 동,층별물량표!D8*0.05
        dailyProductivity: 11,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B2', // 지하2층
      },
      {
        id: 'basement-concrete-b2',
        workItem: '6.타설',
        unit: '㎥',
        quantityReference: 'G8', // 동,층별물량표!G8
        dailyProductivity: 130,
        calculationBasis: '장비대수*5명 /지하층부분',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1, // 계산식: CEILING(MIN(2, E17/I28), 1)
        equipmentCalculationBase: 500, // 지하 대당 타설량 기준값
        equipmentWorkersPerUnit: 5, // 장비당 인원수
        indirectDays: 3,
        indirectWorkItem: '양생',
        floorLabel: 'B2', // 지하2층
        // directWorkDays는 계산식
      },
      {
        id: 'basement-stripclean-b2',
        workItem: '*거푸집해체정리',
        unit: '㎡',
        quantityReference: 'D8', // 해당 층의 형틀 수량 (D열, 행 8 = B2층)
        dailyProductivity: 50,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 0, // 순작업일은 0 (간접일로 분류)
        indirectDays: 16, // 간접일로 분류
        floorLabel: 'B2', // 지하2층
      },
      {
        id: 'basement-meokmaekim-2',
        workItem: '7.먹매김(1일)',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        dailyProductivity: 0,
        indirectDays: 0,
        floorLabel: 'B1', // 지하1층
      },
      {
        id: 'basement-wall-rebar-b1',
        workItem: '8.벽 철근조립',
        unit: 'ton',
        quantityReference: 'F9*0.45', // 동,층별물량표!F9*0.45
        dailyProductivity: 0.7,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 5, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B1', // 지하1층
      },
      {
        id: 'basement-formwork-b1',
        workItem: '9.지하1층 거푸집 설치',
        unit: '㎡',
        quantityReference: 'D9*0.9', // 동,층별물량표!D9*0.9
        dailyProductivity: 9,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 19, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B1', // 지하1층
      },
      {
        id: 'basement-slab-rebar-b1',
        workItem: '10.보슬라브 철근조립',
        unit: 'ton',
        quantityReference: 'F9*0.55', // 동,층별물량표!F9*0.55
        dailyProductivity: 0.7,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 5, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B1', // 지하1층
      },
      {
        id: 'basement-finish-1st',
        workItem: '11.1차 마감작업',
        unit: '㎡',
        quantityReference: 'D9*0.05', // 동,층별물량표!D9*0.05
        dailyProductivity: 10,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B1', // 지하1층
      },
      {
        id: 'basement-concrete-1st',
        workItem: '12.1차 타설',
        unit: '㎥',
        quantityReference: 'G9*0.6', // 동,층별물량표!G9*0.6
        dailyProductivity: 130,
        calculationBasis: '장비대수*5명 /지하층부분',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1, // 계산식
        equipmentCalculationBase: 500, // 지하 대당 타설량 기준값
        equipmentWorkersPerUnit: 5, // 장비당 인원수
        indirectDays: 3,
        indirectWorkItem: '양생',
        floorLabel: 'B1', // 지하1층
        // directWorkDays는 계산식
      },
      {
        id: 'basement-finish-2nd',
        workItem: '12.2차 마감작업',
        unit: '㎡',
        quantityReference: 'D9*0.05', // 동,층별물량표!D9*0.05
        dailyProductivity: 10,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
        floorLabel: 'B1', // 지하1층
      },
      {
        id: 'basement-concrete-2nd',
        workItem: '13.2차 타설',
        unit: '㎥',
        quantityReference: 'G9*0.4', // 동,층별물량표!G9*0.4
        dailyProductivity: 130,
        calculationBasis: '장비대수*5명 /지하층부분',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1, // 계산식
        equipmentCalculationBase: 500, // 지하 대당 타설량 기준값
        equipmentWorkersPerUnit: 5, // 장비당 인원수
        indirectDays: 3,
        indirectWorkItem: '양생',
        floorLabel: 'B1', // 지하1층
        // directWorkDays는 계산식
      },
      {
        id: 'basement-stripclean-b1',
        workItem: '*거푸집해체정리',
        unit: '㎡',
        quantityReference: 'D9', // 해당 층의 형틀 수량 (D열, 행 9 = B1층)
        dailyProductivity: 50,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 0, // 순작업일은 0 (간접일로 분류)
        indirectDays: 22, // 간접일로 분류
        floorLabel: 'B1', // 지하1층
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
        workItem: '1.먹매김(1일)',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        dailyProductivity: 0,
        indirectDays: 0,
      },
      {
        id: 'setting-gangform',
        workItem: '2.갱폼설치',
        unit: '㎡',
        quantityReference: 'B11', // 동,층별물량표!B11 (갱폼, 1층)
        dailyProductivity: 30,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2, // 고정값
        indirectDays: 6,
        indirectWorkItem: '앵커/안전발판',
      },
      {
        id: 'setting-wall-rebar',
        workItem: '3.옹벽철근 조립',
        unit: 'ton',
        quantityReference: 'F11*0.5', // 동,층별물량표!F11*0.5
        dailyProductivity: 0.8,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'setting-alform',
        workItem: '4.알폼조립',
        unit: '㎡',
        quantityReference: 'C11', // 동,층별물량표!C11 (알폼, 1층)
        dailyProductivity: 30,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 4, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'setting-slab-rebar',
        workItem: '5.슬라브철근 조립',
        unit: 'ton',
        quantityReference: 'F11*0.5', // 동,층별물량표!F11*0.5
        dailyProductivity: 0.9,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'setting-concrete',
        workItem: '6.타설',
        unit: '㎥',
        quantityReference: 'G11', // 동,층별물량표!G11 (콘크리트, 1층)
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
  // 기준층 - 8일 사이클
  // ============================================
  {
    id: 'standard-8day',
    name: '8일 사이클',
    category: '기준층',
    items: [
      {
        id: 'standard-meokmaekim',
        workItem: '1.먹매김(1일)',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        dailyProductivity: 0,
        indirectDays: 0,
      },
      {
        id: 'standard-gangform',
        workItem: '2.갱폼설치',
        unit: '㎡',
        quantityReference: 'B14', // 동,층별물량표!B14 (갱폼, 4층 기준)
        dailyProductivity: 60,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        indirectDays: 1,
        indirectWorkItem: '보강/검측',
      },
      {
        id: 'standard-wall-rebar',
        workItem: '3.옹벽철근 조립',
        unit: 'ton',
        quantityReference: 'F14*0.5', // 동,층별물량표!F14*0.5 (또는 하드코딩: 18.83*0.5)
        dailyProductivity: 0.8,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'standard-alform',
        workItem: '4.알폼조립',
        unit: '㎡',
        quantityReference: 'C14*0.55', // 동,층별물량표!C14*0.55 (또는 하드코딩: 1731*0.55)
        dailyProductivity: 60,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'standard-slab-rebar',
        workItem: '5.슬라브철근 조립',
        unit: 'ton',
        quantityReference: 'F14*0.5', // 동,층별물량표!F14*0.5 (또는 하드코딩: 18.83*0.5)
        dailyProductivity: 0.9,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'standard-concrete',
        workItem: '6.타설',
        unit: '㎥',
        quantityReference: 'G14', // 동,층별물량표!G14 (콘크리트, 4층 기준)
        dailyProductivity: 130,
        calculationBasis: '장비대수*6명 /일반층',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1, // 계산식: CEILING(MIN(2, E43/I44), 1)
        equipmentCalculationBase: 320, // 기준층 대당 타설량 기준값
        equipmentWorkersPerUnit: 6, // 장비당 인원수
        indirectDays: 2,
        indirectWorkItem: '양생',
        // directWorkDays는 계산식
      },
    ],
  },

  // 기준층 - 5일 사이클, 6일 사이클, 7일 사이클은 8일 사이클과 동일한 항목
  {
    id: 'standard-5day',
    name: '5일 사이클',
    category: '기준층',
    items: [
      {
        id: 'standard-meokmaekim-5day',
        workItem: '1.먹매김(1일)',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        dailyProductivity: 0,
        indirectDays: 0,
        indirectWorkItem: '검측',
      },
      {
        id: 'standard-gangform-5day',
        workItem: '2.갱폼설치',
        unit: '㎡',
        quantityReference: 'B14',
        dailyProductivity: 60,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 1,
        indirectWorkItem: '보강/검측',
      },
      {
        id: 'standard-wall-rebar-5day',
        workItem: '3.옹벽철근 조립',
        unit: 'ton',
        quantityReference: 'F14*0.5',
        dailyProductivity: 0.8,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'standard-alform-5day',
        workItem: '4.알폼조립',
        unit: '㎡',
        quantityReference: 'C14*0.55',
        dailyProductivity: 60,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'standard-slab-rebar-5day',
        workItem: '5.슬라브철근 조립',
        unit: 'ton',
        quantityReference: 'F14*0.5',
        dailyProductivity: 0.9,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'standard-concrete-5day',
        workItem: '6.타설',
        unit: '㎥',
        quantityReference: 'G14',
        dailyProductivity: 130,
        calculationBasis: '장비대수*6명 /일반층',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1,
        equipmentCalculationBase: 320, // 기준층 대당 타설량 기준값
        equipmentWorkersPerUnit: 6, // 장비당 인원수
        indirectDays: 2,
        indirectWorkItem: '양생',
      },
    ],
  },
  {
    id: 'standard-6day',
    name: '6일 사이클',
    category: '기준층',
    items: [
      {
        id: 'standard-meokmaekim-6day',
        workItem: '1.먹매김(1일)',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        dailyProductivity: 0,
        indirectDays: 0,
        indirectWorkItem: '검측',
      },
      {
        id: 'standard-gangform-6day',
        workItem: '2.갱폼설치',
        unit: '㎡',
        quantityReference: 'B14',
        dailyProductivity: 60,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 1,
        indirectWorkItem: '보강/검측',
      },
      {
        id: 'standard-wall-rebar-6day',
        workItem: '3.옹벽철근 조립',
        unit: 'ton',
        quantityReference: 'F14*0.5',
        dailyProductivity: 0.8,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'standard-alform-6day',
        workItem: '4.알폼조립',
        unit: '㎡',
        quantityReference: 'C14*0.55',
        dailyProductivity: 60,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'standard-slab-rebar-6day',
        workItem: '5.슬라브철근 조립',
        unit: 'ton',
        quantityReference: 'F14*0.5',
        dailyProductivity: 0.9,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'standard-concrete-6day',
        workItem: '6.타설',
        unit: '㎥',
        quantityReference: 'G14',
        dailyProductivity: 130,
        calculationBasis: '장비대수*6명 /일반층',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1,
        equipmentCalculationBase: 320, // 기준층 대당 타설량 기준값
        equipmentWorkersPerUnit: 6, // 장비당 인원수
        indirectDays: 2,
        indirectWorkItem: '양생',
      },
    ],
  },
  {
    id: 'standard-7day',
    name: '7일 사이클',
    category: '기준층',
    items: [
      {
        id: 'standard-meokmaekim-7day',
        workItem: '1.먹매김(1일)',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        dailyProductivity: 0,
        indirectDays: 0,
        indirectWorkItem: '검측',
      },
      {
        id: 'standard-gangform-7day',
        workItem: '2.갱폼설치',
        unit: '㎡',
        quantityReference: 'B14',
        dailyProductivity: 60,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 1,
        indirectWorkItem: '보강/검측',
      },
      {
        id: 'standard-wall-rebar-7day',
        workItem: '3.옹벽철근 조립',
        unit: 'ton',
        quantityReference: 'F14*0.5',
        dailyProductivity: 0.8,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'standard-alform-7day',
        workItem: '4.알폼조립',
        unit: '㎡',
        quantityReference: 'C14*0.55',
        dailyProductivity: 60,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'standard-slab-rebar-7day',
        workItem: '5.슬라브철근 조립',
        unit: 'ton',
        quantityReference: 'F14*0.5',
        dailyProductivity: 0.9,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'standard-concrete-7day',
        workItem: '6.타설',
        unit: '㎥',
        quantityReference: 'G14',
        dailyProductivity: 130,
        calculationBasis: '장비대수*6명 /일반층',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1,
        equipmentCalculationBase: 320, // 기준층 대당 타설량 기준값
        equipmentWorkersPerUnit: 6, // 장비당 인원수
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
        workItem: '1.먹매김(1일)',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        dailyProductivity: 0,
        indirectDays: 0,
      },
      {
        id: 'ph-wall-rebar',
        workItem: '3.옹벽철근 조립',
        unit: 'ton',
        quantityReference: 'F26*0.5', // 동,층별물량표!F26*0.5 (옥탑1층 철근)
        dailyProductivity: 0.7,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'ph-euroform',
        workItem: '4.유로폼 설치',
        unit: '㎡',
        quantityReference: 'D26', // 동,층별물량표!D26 (PH1층 형틀)
        dailyProductivity: 9,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 6, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'ph-slab-rebar',
        workItem: '5.슬라브철근 조립',
        unit: 'ton',
        quantityReference: 'F26*0.5', // 동,층별물량표!F26*0.5
        dailyProductivity: 0.6,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'ph-concrete',
        workItem: '6.타설',
        unit: '㎥',
        quantityReference: 'G26', // 동,층별물량표!G26 (PH1층 콘크리트)
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
    ],
  },

  // PH층 - 5일 사이클, 6일 사이클, 7일 사이클, 8일 사이클
  {
    id: 'ph-5day',
    name: '5일 사이클',
    category: 'PH층',
    items: [
      {
        id: 'ph-meokmaekim-5day',
        workItem: '1.먹매김(1일)',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        dailyProductivity: 0,
        indirectDays: 0,
        indirectWorkItem: '검측',
      },
      {
        id: 'ph-wall-rebar-5day',
        workItem: '3.옹벽철근 조립',
        unit: 'ton',
        quantityReference: 'F26*0.5',
        dailyProductivity: 0.7,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'ph-euroform-5day',
        workItem: '4.유로폼 설치',
        unit: '㎡',
        quantityReference: 'D26',
        dailyProductivity: 9,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 6,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'ph-slab-rebar-5day',
        workItem: '5.슬라브철근 조립',
        unit: 'ton',
        quantityReference: 'F26*0.5',
        dailyProductivity: 0.6,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'ph-concrete-5day',
        workItem: '6.타설',
        unit: '㎥',
        quantityReference: 'G26',
        dailyProductivity: 130,
        calculationBasis: '장비대수*4명 /최상층',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1,
        equipmentCalculationBase: 230, // PH층 대당 타설량 기준값
        equipmentWorkersPerUnit: 4, // 장비당 인원수
        indirectDays: 2,
        indirectWorkItem: '양생',
      },
    ],
  },
  {
    id: 'ph-6day',
    name: '6일 사이클',
    category: 'PH층',
    items: [
      {
        id: 'ph-meokmaekim-6day',
        workItem: '1.먹매김(1일)',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        dailyProductivity: 0,
        indirectDays: 0,
        indirectWorkItem: '검측',
      },
      {
        id: 'ph-wall-rebar-6day',
        workItem: '3.옹벽철근 조립',
        unit: 'ton',
        quantityReference: 'F26*0.5',
        dailyProductivity: 0.7,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'ph-euroform-6day',
        workItem: '4.유로폼 설치',
        unit: '㎡',
        quantityReference: 'D26',
        dailyProductivity: 9,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 6,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'ph-slab-rebar-6day',
        workItem: '5.슬라브철근 조립',
        unit: 'ton',
        quantityReference: 'F26*0.5',
        dailyProductivity: 0.6,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'ph-concrete-6day',
        workItem: '6.타설',
        unit: '㎥',
        quantityReference: 'G26',
        dailyProductivity: 130,
        calculationBasis: '장비대수*4명 /최상층',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1,
        equipmentCalculationBase: 230, // PH층 대당 타설량 기준값
        equipmentWorkersPerUnit: 4, // 장비당 인원수
        indirectDays: 2,
        indirectWorkItem: '양생',
      },
    ],
  },
  {
    id: 'ph-7day',
    name: '7일 사이클',
    category: 'PH층',
    items: [
      {
        id: 'ph-meokmaekim-7day',
        workItem: '1.먹매김(1일)',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        dailyProductivity: 0,
        indirectDays: 0,
        indirectWorkItem: '검측',
      },
      {
        id: 'ph-wall-rebar-7day',
        workItem: '3.옹벽철근 조립',
        unit: 'ton',
        quantityReference: 'F26*0.5',
        dailyProductivity: 0.7,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'ph-euroform-7day',
        workItem: '4.유로폼 설치',
        unit: '㎡',
        quantityReference: 'D26',
        dailyProductivity: 9,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 6,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'ph-slab-rebar-7day',
        workItem: '5.슬라브철근 조립',
        unit: 'ton',
        quantityReference: 'F26*0.5',
        dailyProductivity: 0.6,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'ph-concrete-7day',
        workItem: '6.타설',
        unit: '㎥',
        quantityReference: 'G26',
        dailyProductivity: 130,
        calculationBasis: '장비대수*4명 /최상층',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1,
        equipmentCalculationBase: 650, // I51 값
        equipmentWorkersPerUnit: 4, // 장비당 인원수
        indirectDays: 2,
        indirectWorkItem: '양생',
      },
    ],
  },
  {
    id: 'ph-8day',
    name: '8일 사이클',
    category: 'PH층',
    items: [
      {
        id: 'ph-meokmaekim-8day',
        workItem: '1.먹매김(1일)',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        dailyProductivity: 0,
        indirectDays: 0,
        indirectWorkItem: '검측',
      },
      {
        id: 'ph-wall-rebar-8day',
        workItem: '3.옹벽철근 조립',
        unit: 'ton',
        quantityReference: 'F26*0.5',
        dailyProductivity: 0.7,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'ph-euroform-8day',
        workItem: '4.유로폼 설치',
        unit: '㎡',
        quantityReference: 'D26',
        dailyProductivity: 9,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 6,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'ph-slab-rebar-8day',
        workItem: '5.슬라브철근 조립',
        unit: 'ton',
        quantityReference: 'F26*0.5',
        dailyProductivity: 0.6,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 1,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'ph-concrete-8day',
        workItem: '6.타설',
        unit: '㎥',
        quantityReference: 'G26',
        dailyProductivity: 130,
        calculationBasis: '장비대수*4명 /최상층',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1,
        equipmentCalculationBase: 230, // PH층 대당 타설량 기준값
        equipmentWorkersPerUnit: 4, // 장비당 인원수
        indirectDays: 2,
        indirectWorkItem: '양생',
      },
    ],
  },

  // 셋팅층 - 5일 사이클, 6일 사이클, 7일 사이클, 8일 사이클
  {
    id: 'setting-5day',
    name: '5일 사이클',
    category: '셋팅층',
    items: [
      {
        id: 'setting-meokmaekim-5day',
        workItem: '1.먹매김(1일)',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        dailyProductivity: 0,
        indirectDays: 0,
        indirectWorkItem: '검측',
      },
      {
        id: 'setting-gangform-5day',
        workItem: '2.갱폼설치',
        unit: '㎡',
        quantityReference: 'B11',
        dailyProductivity: 30,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2,
        indirectDays: 6,
        indirectWorkItem: '앵커/안전발판',
      },
      {
        id: 'setting-wall-rebar-5day',
        workItem: '3.옹벽철근 조립',
        unit: 'ton',
        quantityReference: 'F11*0.5',
        dailyProductivity: 0.8,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'setting-alform-5day',
        workItem: '4.알폼조립',
        unit: '㎡',
        quantityReference: 'C11',
        dailyProductivity: 30,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 4,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'setting-slab-rebar-5day',
        workItem: '5.슬라브철근 조립',
        unit: 'ton',
        quantityReference: 'F11*0.5',
        dailyProductivity: 0.9,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'setting-concrete-5day',
        workItem: '6.타설',
        unit: '㎥',
        quantityReference: 'G11',
        dailyProductivity: 130,
        calculationBasis: '장비대수*6명 /셋팅층',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1,
        equipmentCalculationBase: 400, // 셋팅층 대당 타설량 기준값
        equipmentWorkersPerUnit: 6, // 장비당 인원수
        indirectDays: 2,
        indirectWorkItem: '양생',
      },
    ],
  },
  {
    id: 'setting-6day',
    name: '6일 사이클',
    category: '셋팅층',
    items: [
      {
        id: 'setting-meokmaekim-6day',
        workItem: '1.먹매김(1일)',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        dailyProductivity: 0,
        indirectDays: 0,
        indirectWorkItem: '검측',
      },
      {
        id: 'setting-gangform-6day',
        workItem: '2.갱폼설치',
        unit: '㎡',
        quantityReference: 'B11',
        dailyProductivity: 30,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2,
        indirectDays: 6,
        indirectWorkItem: '앵커/안전발판',
      },
      {
        id: 'setting-wall-rebar-6day',
        workItem: '3.옹벽철근 조립',
        unit: 'ton',
        quantityReference: 'F11*0.5',
        dailyProductivity: 0.8,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'setting-alform-6day',
        workItem: '4.알폼조립',
        unit: '㎡',
        quantityReference: 'C11',
        dailyProductivity: 30,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 4,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'setting-slab-rebar-6day',
        workItem: '5.슬라브철근 조립',
        unit: 'ton',
        quantityReference: 'F11*0.5',
        dailyProductivity: 0.9,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'setting-concrete-6day',
        workItem: '6.타설',
        unit: '㎥',
        quantityReference: 'G11',
        dailyProductivity: 130,
        calculationBasis: '장비대수*6명 /셋팅층',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1,
        equipmentCalculationBase: 400, // 셋팅층 대당 타설량 기준값
        equipmentWorkersPerUnit: 6, // 장비당 인원수
        indirectDays: 2,
        indirectWorkItem: '양생',
      },
    ],
  },
  {
    id: 'setting-7day',
    name: '7일 사이클',
    category: '셋팅층',
    items: [
      {
        id: 'setting-meokmaekim-7day',
        workItem: '1.먹매김(1일)',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        dailyProductivity: 0,
        indirectDays: 0,
        indirectWorkItem: '검측',
      },
      {
        id: 'setting-gangform-7day',
        workItem: '2.갱폼설치',
        unit: '㎡',
        quantityReference: 'B11',
        dailyProductivity: 30,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2,
        indirectDays: 6,
        indirectWorkItem: '앵커/안전발판',
      },
      {
        id: 'setting-wall-rebar-7day',
        workItem: '3.옹벽철근 조립',
        unit: 'ton',
        quantityReference: 'F11*0.5',
        dailyProductivity: 0.8,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'setting-alform-7day',
        workItem: '4.알폼조립',
        unit: '㎡',
        quantityReference: 'C11',
        dailyProductivity: 30,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 4,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'setting-slab-rebar-7day',
        workItem: '5.슬라브철근 조립',
        unit: 'ton',
        quantityReference: 'F11*0.5',
        dailyProductivity: 0.9,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'setting-concrete-7day',
        workItem: '6.타설',
        unit: '㎥',
        quantityReference: 'G11',
        dailyProductivity: 130,
        calculationBasis: '장비대수*6명 /셋팅층',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1,
        equipmentCalculationBase: 400, // 셋팅층 대당 타설량 기준값
        equipmentWorkersPerUnit: 6, // 장비당 인원수
        indirectDays: 2,
        indirectWorkItem: '양생',
      },
    ],
  },
  {
    id: 'setting-8day',
    name: '8일 사이클',
    category: '셋팅층',
    items: [
      {
        id: 'setting-meokmaekim-8day',
        workItem: '1.먹매김(1일)',
        calculationBasis: '일수고정',
        unit: '',
        equipmentCount: 1,
        directWorkDays: 1, // 고정값
        dailyProductivity: 0,
        indirectDays: 0,
        indirectWorkItem: '검측',
      },
      {
        id: 'setting-gangform-8day',
        workItem: '2.갱폼설치',
        unit: '㎡',
        quantityReference: 'B11',
        dailyProductivity: 30,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2,
        indirectDays: 6,
        indirectWorkItem: '앵커/안전발판',
      },
      {
        id: 'setting-wall-rebar-8day',
        workItem: '3.옹벽철근 조립',
        unit: 'ton',
        quantityReference: 'F11*0.5',
        dailyProductivity: 0.8,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'setting-alform-8day',
        workItem: '4.알폼조립',
        unit: '㎡',
        quantityReference: 'C11',
        dailyProductivity: 30,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 4,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'setting-slab-rebar-8day',
        workItem: '5.슬라브철근 조립',
        unit: 'ton',
        quantityReference: 'F11*0.5',
        dailyProductivity: 0.9,
        calculationBasis: '일수고정',
        equipmentCount: 1,
        directWorkDays: 2,
        indirectDays: 0.5,
        indirectWorkItem: '검측',
      },
      {
        id: 'setting-concrete-8day',
        workItem: '6.타설',
        unit: '㎥',
        quantityReference: 'G11',
        dailyProductivity: 130,
        calculationBasis: '장비대수*6명 /셋팅층',
        equipmentName: '콘크리트 펌프차',
        equipmentCount: 1,
        equipmentCalculationBase: 400, // 셋팅층 대당 타설량 기준값
        equipmentWorkersPerUnit: 6, // 장비당 인원수
        indirectDays: 2,
        indirectWorkItem: '양생',
      },
    ],
  },
];

/**
 * 구분과 공정타입으로 모듈 찾기
 */
export function getProcessModule(
  category: ProcessCategory,
  processType: ProcessType
): ProcessModule | undefined {
  return PROCESS_MODULES.find(
    module => module.category === category && module.name === processType
  );
}

/**
 * 구분별 사용 가능한 모듈 목록
 */
export function getAvailableModules(category: ProcessCategory): ProcessModule[] {
  return PROCESS_MODULES.filter(module => module.category === category);
}
