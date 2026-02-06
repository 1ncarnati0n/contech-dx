'use client';

import * as React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui';
import { ProcessItemCard } from './ProcessItemCard';
import { useProcessCalculation } from './hooks/useProcessCalculation';
import type { Building, ProcessCategory, BuildingProcessPlan, Floor } from '@/lib/types';
import type { ProcessModule, ProcessItem } from '@/lib/data/process-modules';

interface ProcessRowData {
  category: ProcessCategory;
  floorLabel?: string;
  floor?: Floor;
  floorClass?: string;
}

/** 특수 행 수량 데이터 타입 */
type SpecialRowQuantities = {
  gangForm?: number;
  alForm?: number;
  formwork?: number;
  stripClean?: number;
  rebar?: number;
  concrete?: number;
};

interface ProcessDetailPanelProps {
  /** 동 데이터 */
  building: Building;
  /** 확장된 행 데이터 */
  expandedRow: ProcessRowData | null;
  /** 해당 공정 모듈 */
  module: ProcessModule | null;
  /** 공정 계획 데이터 */
  plan: BuildingProcessPlan | undefined;
  /** 공정 행 목록 (기준층 공통 적용을 위해) */
  processRows: ProcessRowData[];
  /** 순작업일 변경 핸들러 */
  onDirectWorkDaysChange: (itemKey: string, value: number | null) => void;
  /** 추가 클래스명 */
  className?: string;
  /** 특수 행 수량 데이터 (지하층 주차장/3단 가시설 전용) */
  specialRowQuantities?: { [key: string]: SpecialRowQuantities };
}

/**
 * 개별 항목의 계산 결과를 가져오는 래퍼 컴포넌트
 */
function ProcessItemWithCalculation({
  building,
  item,
  index,
  category,
  floorLabel,
  floor,
  overriddenDirectWorkDays,
  onDirectWorkDaysChange,
  isSpecialRow,
  specialRowQuantities,
}: {
  building: Building;
  item: ProcessItem;
  index: number;
  category: ProcessCategory;
  floorLabel?: string;
  floor?: { id: string; floorLabel: string };
  overriddenDirectWorkDays?: number;
  onDirectWorkDaysChange: (value: number | null) => void;
  isSpecialRow?: boolean;
  specialRowQuantities?: SpecialRowQuantities;
}) {
  const calculationResult = useProcessCalculation({
    building,
    item,
    category,
    floorLabel,
    overriddenDirectWorkDays,
    floor,
    isSpecialRow,
    specialRowQuantities,
  });

  return (
    <ProcessItemCard
      item={item}
      index={index}
      calculationResult={calculationResult}
      overriddenDirectWorkDays={overriddenDirectWorkDays}
      onDirectWorkDaysChange={onDirectWorkDaysChange}
    />
  );
}

/**
 * 세부공정 상세 패널 컨테이너
 * 선택된 행의 세부공종 항목들을 표시합니다.
 */
export function ProcessDetailPanel({
  building,
  expandedRow,
  module,
  plan,
  processRows,
  onDirectWorkDaysChange,
  className,
  specialRowQuantities,
}: ProcessDetailPanelProps) {
  // 확장된 행이 없을 때
  if (!expandedRow) {
    return (
      <Card className={cn(
        'flex flex-col items-center justify-center py-12 px-4',
        'bg-zinc-50 dark:bg-zinc-900/50',
        className
      )}>
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
          <Info className="w-8 h-8 text-zinc-400" />
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          세부공정 버튼을 클릭하여 상세 정보를 확인하세요
        </p>
      </Card>
    );
  }

  // 모듈이 없을 때
  if (!module || !module.items.length) {
    return (
      <Card className={cn(
        'flex flex-col items-center justify-center py-12 px-4',
        'bg-zinc-50 dark:bg-zinc-900/50',
        className
      )}>
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
          <Info className="w-8 h-8 text-zinc-400" />
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          세부공정 데이터가 없습니다
        </p>
      </Card>
    );
  }

  // 일반층 여부 확인
  const isNormalFloor = expandedRow.floorClass === '일반층';

  // 특수 행(주차장, 3단 가시설) 여부 확인
  const isParking = expandedRow.floorLabel?.includes('주차장') ?? false;
  const isFacility = expandedRow.floorLabel?.includes('3단 가시설 적용부') ?? false;
  const isSpecialRow = isParking || isFacility;

  // 특수 행인 경우 해당 지하층의 floorLabel 추출 (예: "B1 주차장" -> "B1")
  let targetFloorLabel = expandedRow.floorLabel;
  if (isSpecialRow && expandedRow.floorLabel) {
    const floorMatch = expandedRow.floorLabel.match(/^(B\d+)/);
    if (floorMatch) {
      targetFloorLabel = floorMatch[1];
    }
  }

  // 특수 행의 수량 데이터 가져오기
  const currentSpecialRowQuantities = isSpecialRow && expandedRow.floorLabel
    ? specialRowQuantities?.[expandedRow.floorLabel]
    : undefined;

  // 해당 층의 항목만 필터링
  const filteredItems = module.items.filter((item) => {
    if (expandedRow.category === '기준층') {
      return item.floorLabel === expandedRow.floorLabel || !item.floorLabel;
    }
    if (expandedRow.category === '최상층') {
      return item.floorLabel === expandedRow.floorLabel || !item.floorLabel;
    }
    if (expandedRow.category === '주동 지하층') {
      // 특수 행(주차장, 3단 가시설)인 경우 해당 지하층의 항목 사용
      if (isSpecialRow) {
        return item.floorLabel === targetFloorLabel;
      }
      return item.floorLabel === expandedRow.floorLabel;
    }
    if (expandedRow.category === '지하주차장') {
      // 지하주차장: targetFloorLabel("B1")로 매칭 (expandedRow.floorLabel은 "B1 주차장")
      return item.floorLabel === targetFloorLabel;
    }
    if (expandedRow.category === 'PH층') {
      return !item.floorLabel || item.floorLabel === expandedRow.floorLabel;
    }
    if (expandedRow.category === '옥탑층') {
      if (!item.floorLabel) return true;
      if (!expandedRow.floorLabel) return true;
      const itemMatch = item.floorLabel.match(/옥탑(\d+)/);
      const rowMatch = expandedRow.floorLabel.match(/옥탑(\d+)/);
      if (itemMatch && rowMatch) {
        return itemMatch[1] === rowMatch[1];
      }
      return item.floorLabel === expandedRow.floorLabel;
    }
    if (isNormalFloor) {
      return item.floorLabel === expandedRow.floorLabel || !item.floorLabel;
    }
    if (expandedRow.category === '셋팅층') {
      return item.floorLabel === expandedRow.floorLabel || !item.floorLabel;
    }
    // 버림, 기초
    if (expandedRow.floorLabel && item.floorLabel) {
      return item.floorLabel === expandedRow.floorLabel;
    }
    const hasDirectDays = item.directWorkDays !== undefined && item.directWorkDays > 0;
    const hasIndirectDays = item.indirectDays > 0;
    return hasDirectDays || hasIndirectDays;
  });

  // 순작업일 합계 계산
  const calculateDirectWorkDaysSum = (): number => {
    let sum = 0;
    filteredItems.forEach((item) => {
      // 기준층인 경우 첫 번째 기준층의 오버라이드 사용
      let itemKey = `${expandedRow.category}-${expandedRow.floorLabel || ''}-${item.id}`;
      let firstStandardFloorLabel: string | undefined;

      if (expandedRow.category === '기준층') {
        const found = processRows.find(r => r.category === '기준층' && r.floorLabel);
        firstStandardFloorLabel = found?.floorLabel;
      }

      let overriddenDays: number | undefined;
      if (expandedRow.category === '기준층') {
        const currentFloorKey = `기준층-${expandedRow.floorLabel}-${item.id}`;
        overriddenDays = plan?.itemDirectWorkDaysOverrides?.[currentFloorKey];
        if (overriddenDays === undefined && firstStandardFloorLabel) {
          const firstStandardFloorKey = `기준층-${firstStandardFloorLabel}-${item.id}`;
          overriddenDays = plan?.itemDirectWorkDaysOverrides?.[firstStandardFloorKey];
        }
      } else {
        overriddenDays = plan?.itemDirectWorkDaysOverrides?.[itemKey];
      }

      if (overriddenDays !== undefined) {
        sum += overriddenDays;
      } else if (item.directWorkDays !== undefined) {
        sum += item.directWorkDays;
      }
      // 계산이 필요한 항목은 ProcessItemCard에서 개별 처리
    });
    return Math.floor(sum);
  };

  const directWorkDaysSum = calculateDirectWorkDaysSum();

  // 간접작업일 합계 계산
  const indirectDaysSum = Math.ceil(
    filteredItems.reduce((sum, item) => sum + item.indirectDays, 0)
  );
  const totalWorkDaysSum = directWorkDaysSum + indirectDaysSum;

  // 카테고리 표시 이름 생성
  const getCategoryDisplayName = (): string => {
    if (expandedRow.category === '버림' || expandedRow.category === '기초') {
      return expandedRow.category;
    }
    if (expandedRow.category === '주동 지하층') {
      // 특수 행(주차장, 3단 가시설)인 경우 그대로 표시
      if (isSpecialRow) {
        return expandedRow.floorLabel || '';
      }
      return `지하층 ${expandedRow.floorLabel}층`;
    }
    if (expandedRow.category === '옥탑층' || expandedRow.category === 'PH층') {
      let displayLabel = expandedRow.floorLabel || '';
      if (displayLabel.match(/^PH\d+$/i)) {
        const phMatch = displayLabel.match(/PH(\d+)/i);
        if (phMatch) {
          displayLabel = `옥탑${phMatch[1]}`;
        }
      }
      return `옥탑층 ${displayLabel}층`;
    }
    if (expandedRow.category === '셋팅층') {
      if (isNormalFloor) {
        return `일반층 ${expandedRow.floorLabel}`;
      }
      return `셋팅층 ${expandedRow.floorLabel}`;
    }
    if (expandedRow.category === '기준층') {
      return `기준층 ${expandedRow.floorLabel}`;
    }
    if (expandedRow.category === '최상층') {
      return `최상층 ${expandedRow.floorLabel}`;
    }
    if (expandedRow.category === '지하주차장') {
      return expandedRow.floorLabel || '지하주차장';
    }
    return `${expandedRow.category} ${expandedRow.floorLabel || ''}`;
  };

  return (
    <div
      className={cn(
        'fade-in',
        className
      )}
    >
      {/* 작업일 합계 표시 */}
      {(directWorkDaysSum > 0 || indirectDaysSum > 0) && (
        <div className="mb-4 space-y-1">
          <div className="text-sm text-accent-600 dark:text-accent-400 font-medium">
            순작업일 합계: {directWorkDaysSum}일
          </div>
          {indirectDaysSum > 0 && (
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              간접작업일 합계: {indirectDaysSum}일
            </div>
          )}
          {indirectDaysSum > 0 && (
            <div className="text-sm font-semibold text-zinc-900 dark:text-white">
              총작업일수: {totalWorkDaysSum}일
            </div>
          )}
        </div>
      )}

      {/* 세부공종 카드 목록 (1열 레이아웃) */}
      <div className="grid grid-cols-1 gap-4">
        {filteredItems.map((item, idx) => {
          // 오버라이드 키 생성
          const itemKey = `${expandedRow.category}-${expandedRow.floorLabel || ''}-${item.id}`;
          let overriddenDays: number | undefined;

          if (expandedRow.category === '기준층') {
            // 현재 층의 오버라이드 먼저 확인
            const currentFloorKey = `기준층-${expandedRow.floorLabel}-${item.id}`;
            overriddenDays = plan?.itemDirectWorkDaysOverrides?.[currentFloorKey];

            // 없으면 첫 번째 기준층의 오버라이드 확인
            if (overriddenDays === undefined) {
              const firstStandardFloor = processRows.find(r => r.category === '기준층' && r.floorLabel);
              if (firstStandardFloor) {
                const firstStandardFloorKey = `기준층-${firstStandardFloor.floorLabel}-${item.id}`;
                overriddenDays = plan?.itemDirectWorkDaysOverrides?.[firstStandardFloorKey];
              }
            }
          } else {
            overriddenDays = plan?.itemDirectWorkDaysOverrides?.[itemKey];
          }

          return (
            <div
              key={item.id}
              className="slide-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <ProcessItemWithCalculation
                building={building}
                item={item}
                index={idx + 1}
                category={expandedRow.category}
                floorLabel={isSpecialRow ? targetFloorLabel : expandedRow.floorLabel}
                floor={expandedRow.floor ? { id: expandedRow.floor.id, floorLabel: expandedRow.floor.floorLabel } : undefined}
                overriddenDirectWorkDays={overriddenDays}
                onDirectWorkDaysChange={(value) => onDirectWorkDaysChange(itemKey, value)}
                isSpecialRow={isSpecialRow}
                specialRowQuantities={currentSpecialRowQuantities}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

ProcessDetailPanel.displayName = 'ProcessDetailPanel';
