/**
 * 물량 데이터 참조 유틸리티
 * 물량입력 페이지의 데이터를 참조하여 수량을 가져옴
 */

import type { Building, FloorTrade } from '@/lib/types';
import { getQuantityValue } from './tradeDataHelpers';
import { logger } from './logger';

/**
 * 물량 데이터에서 값 가져오기
 */
export function getQuantityFromBuilding(
  building: Building,
  category: string, // '버림', '기초', '주동 지하층' 등
  field: 'gangForm' | 'alForm' | 'formwork' | 'euroForm' | 'stripClean' | 'rebar' | 'concrete',
  subField: string // 'areaM2', 'ton', 'volumeM3' 등
): number {
  // 구분에 맞는 FloorTrade 찾기
  const trade = building.floorTrades.find(ft => ft.tradeGroup === category);
  if (!trade) return 0;

  const tradeData = trade.trades[field];
  if (!tradeData) return 0;

  return getQuantityValue(tradeData, subField);
}

/**
 * 비율 계산으로 물량 가져오기
 */
export function getQuantityWithRatio(
  building: Building,
  category: string,
  field: 'gangForm' | 'alForm' | 'formwork' | 'euroForm' | 'stripClean' | 'rebar' | 'concrete',
  subField: string,
  ratio: number // 0.45, 0.55, 0.95 등
): number {
  const baseQuantity = getQuantityFromBuilding(building, category, field, subField);
  return baseQuantity * ratio;
}

/**
 * 층 라벨을 정규화하여 비교 가능한 형식으로 변환
 * 옥탑층: "옥탑1", "옥탑1층", "옥탑 1", "PH1", "ph1" -> "PH1"
 * 지하층: "B1", "지하1층", "지하1" -> "B1"
 */
function normalizeFloorLabel(label: string): string {
  // 코어 정보 제거
  let normalized = label.replace(/코어\d+-/, '');

  // 옥탑층 정규화: 다양한 형식 지원
  // "옥탑1", "옥탑1층", "옥탑 1", "옥탑 1층" -> "PH1"
  const optapMatch = normalized.match(/^옥탑\s*(\d+)(층)?$/);
  if (optapMatch) {
    normalized = `PH${optapMatch[1]}`;
  } else {
    // 이미 PH 형식인 경우 대문자로 통일
    // "PH1", "Ph1", "ph1" -> "PH1"
    const phMatch = normalized.match(/^ph(\d+)$/i);
    if (phMatch) {
      normalized = `PH${phMatch[1]}`;
    }
  }

  // 지하층 정규화: 지하1층, 지하1 -> B1
  const basementMatch = normalized.match(/^지하(\d+)(층)?$/);
  if (basementMatch) {
    normalized = `B${basementMatch[1]}`;
  }

  return normalized;
}

/**
 * 특정 층의 물량 데이터 가져오기
 * 물량입력 데이터(building.floorTrades)에서 해당 층의 물량을 가져옵니다.
 *
 * @param building - 동 정보 (floors, floorTrades 포함)
 * @param floorLabel - 층 라벨 (예: '1F', '2F', 'B1', '코어1-3F')
 * @param field - 공종 필드 (gangForm, alForm, formwork, stripClean, rebar, concrete)
 * @param subField - 세부 필드 (areaM2, ton, volumeM3 등)
 * @returns 물량입력 데이터에서 가져온 수량
 */
export function getQuantityFromFloor(
  building: Building,
  floorLabel: string, // '1F', '2F', 'B1', '코어1-3F' 등 또는 범위 형식 기준층의 floor.id
  field: 'gangForm' | 'alForm' | 'formwork' | 'euroForm' | 'stripClean' | 'rebar' | 'concrete',
  subField: string,
  rangeFloorId?: string, // 범위 형식 기준층의 floor.id (선택적)
  tradeGroup?: string // 특정 tradeGroup의 데이터만 조회 (예: '주동 지하층')
): number {
  // rangeFloorId가 제공된 경우 (기준층 범위 형식), 범위 기준층을 우선 처리
  let rangeFloor: typeof building.floors[0] | null = null;
  let individualFloorId: string | null = null;

  if (rangeFloorId) {
    rangeFloor = building.floors.find(f => f.id === rangeFloorId) ?? null;
    if (rangeFloor) {
      const floorMatch = floorLabel.match(/(\d+)F/);
      if (floorMatch) {
        const floorNum = parseInt(floorMatch[1], 10);
        individualFloorId = `${rangeFloor.id}-${floorNum}F`;
      }
    }
  }

  // 개별 층 찾기 (rangeFloorId가 있어도 개별 층을 먼저 확인 - 개별 층 데이터가 있으면 우선 사용)
  let floor: typeof building.floors[0] | null = null;

  // 정규화된 라벨로 비교
  const normalizedInput = normalizeFloorLabel(floorLabel);

  // 층 찾기 (정확히 일치하거나, 정규화된 라벨이 일치하는 경우)
  floor = building.floors.find(f => {
    if (f.floorLabel === floorLabel) return true;
    const normalizedFloor = normalizeFloorLabel(f.floorLabel);
    return normalizedFloor === normalizedInput;
  }) ?? null;

  // 옥탑층 특화: 못 찾았고 PH로 시작하는 경우 추가 시도
  if (!floor && normalizedInput.startsWith('PH')) {
    const phNum = normalizedInput.match(/^PH(\d+)$/)?.[1];
    if (phNum) {
      // "옥탑1", "옥탑1층", "PH1" 등 다양한 형식으로 재시도
      floor = building.floors.find(f => {
        const label = f.floorLabel.replace(/코어\d+-/, '');
        return (
          label === `옥탑${phNum}` ||
          label === `옥탑${phNum}층` ||
          label.toUpperCase() === `PH${phNum}` ||
          normalizeFloorLabel(label) === normalizedInput
        );
      }) ?? null;
    }
  }
    
    // 개별 층이 없으면 범위 형식의 기준층 찾기 (예: "7F" -> "2~14F 기준층" 또는 "코어1-2~14F 기준층")
    // rangeFloorId가 제공되지 않은 경우에만 실행 (이미 rangeFloorId가 있으면 위에서 처리됨)
    if (!floor && !rangeFloorId) {
      const floorMatch = floorLabel.match(/(\d+)F/);
      if (floorMatch) {
        const floorNum = parseInt(floorMatch[1], 10);
        // 기준층 범위 형식 찾기 (코어 정보 포함/미포함 모두 처리)
        rangeFloor = building.floors.find(f => {
          if (f.floorClass === '기준층' && f.floorLabel.includes('~')) {
            // 코어 정보 제거 후 범위 추출
            const cleanLabel = f.floorLabel.replace(/코어\d+-/, '').replace(/\s*기준층\s*$/, '');
            const rangeMatch = cleanLabel.match(/(\d+)~(\d+)F/);
            if (rangeMatch) {
              const start = parseInt(rangeMatch[1], 10);
              const end = parseInt(rangeMatch[2], 10);
              return floorNum >= start && floorNum <= end;
            }
          }
          return false;
        }) ?? null;
        
        // 범위 형식의 기준층을 찾았으면, 개별 층 ID 생성
        // 예: rangeFloor.id가 "floor-123"이고 floorNum이 13이면 "floor-123-13F"
        if (rangeFloor) {
          individualFloorId = `${rangeFloor.id}-${floorNum}F`;
        }
      }
    }
  
  if (!floor && !rangeFloor) {
    logger.debug('[getQuantityFromFloor] Floor not found', {
      floorLabel,
      buildingId: building.id,
      availableFloors: building.floors.map(f => f.floorLabel),
    });
    return 0;
  }
  
  // 해당 층의 FloorTrade 찾기 (tradeGroup: '아파트' 우선, 없으면 다른 tradeGroup도 확인)
  // 개별 데이터 저장 방식: 정확한 개별 층 ID로 직접 조회
  // 개별 층이 있으면 개별 층의 trade를 우선 사용, 없으면 범위 기반 individualFloorId 사용
  // 개별 층 ID로 trade를 찾지 못하면 범위 기반 individualFloorId를 fallback으로 사용
  const primaryTargetFloorId = (floor ? floor.id : null) || individualFloorId;

  if (!primaryTargetFloorId) {
    return 0;
  }

  // 옥탑층 여부 판단
  const isPHFloor = normalizedInput.startsWith('PH') || floorLabel.includes('옥탑');

  // tradeGroup 조회 순서 결정
  const tradeGroupPriority = isPHFloor
    ? ['옥탑층', 'PH층', '아파트']  // 옥탑층: '옥탑층' 우선
    : ['아파트', '옥탑층', 'PH층']; // 기타: '아파트' 우선

  // 정확한 floorId로 직접 조회 (개별 데이터 저장 방식)
  let trade: FloorTrade | undefined;

  if (tradeGroup) {
    // tradeGroup이 명시된 경우: 해당 tradeGroup만 조회
    trade = building.floorTrades.find(ft =>
      ft.floorId === primaryTargetFloorId && ft.tradeGroup === tradeGroup
    );
  } else {
    // 기존 우선순위 로직 유지
    for (const tg of tradeGroupPriority) {
      trade = building.floorTrades.find(ft =>
        ft.floorId === primaryTargetFloorId && ft.tradeGroup === tg
      );
      if (trade) break;
    }

    // 찾지 못하면 tradeGroup 무시하고 floorId만으로 조회
    if (!trade) {
      trade = building.floorTrades.find(ft => ft.floorId === primaryTargetFloorId);
    }
  }

  // 개별 층 ID로 trade를 찾지 못하고 범위 기반 individualFloorId가 있으면 fallback
  if (!trade && primaryTargetFloorId === floor?.id && individualFloorId) {
    if (tradeGroup) {
      trade = building.floorTrades.find(ft =>
        ft.floorId === individualFloorId && ft.tradeGroup === tradeGroup
      );
    } else {
      for (const tg of tradeGroupPriority) {
        trade = building.floorTrades.find(ft =>
          ft.floorId === individualFloorId && ft.tradeGroup === tg
        );
        if (trade) break;
      }

      if (!trade) {
        trade = building.floorTrades.find(ft => ft.floorId === individualFloorId);
      }
    }
  }

  if (!trade) {
    logger.debug('[getQuantityFromFloor] Trade not found', {
      floorLabel,
      primaryTargetFloorId,
      tradeGroupPriority,
      availableTradeGroups: building.floorTrades
        .filter(ft => ft.floorId === primaryTargetFloorId)
        .map(ft => ft.tradeGroup),
    });
    return 0;
  }

  const tradeData = trade.trades[field];
  if (!tradeData) {
    // stripClean(해체/정리)은 DB에 저장되지 않는 파생값: 형틀합계(gangForm + alForm + euroForm) × 2
    if (field === 'stripClean' && subField === 'areaM2') {
      const gangForm = getQuantityValue(trade.trades['gangForm'] || {}, 'areaM2');
      const alForm = getQuantityValue(trade.trades['alForm'] || {}, 'areaM2');
      const euroForm = getQuantityValue(trade.trades['euroForm'] || {}, 'areaM2');
      const formworkTotal = gangForm + alForm + euroForm;
      if (formworkTotal > 0) {
        return formworkTotal * 2;
      }
    }

    logger.debug('[getQuantityFromFloor] Trade field not found', {
      floorLabel,
      field,
      availableFields: Object.keys(trade.trades),
    });
    return 0;
  }

  const result = getQuantityValue(tradeData, subField);

  return result;
}

/**
 * 엑셀 참조 패턴에 따른 물량 가져오기
 * 물량입력 데이터(building.floorTrades)를 기반으로 수량을 가져옵니다.
 * 엑셀 열 구조: B=갱폼, C=알폼, D=형틀, E=해체/정리, F=철근, G=콘크리트
 * 행 구조: 행 6=버림, 행 7=기초, 행 8=B2, 행 9=B1, 행 11=1층, 행 12=2층, 행 13=3층, 행 14=4층, 행 26=옥탑1층, 행 27=옥탑2층, 행 28=옥탑3층
 * 
 * @param building - 동 정보 (floorTrades 포함)
 * @param reference - 참조 패턴 (예: 'D6', 'G6', 'F7*0.45', 'E14+E16')
 * @returns 물량입력 데이터에서 가져온 수량
 */
export function getQuantityByReference(
  building: Building,
  reference: string // 'D6', 'G6', 'F7*0.45', 'E14+E16' 등
): number {
  // 복합 참조 처리 (예: E14+E16)
  if (reference.includes('+')) {
    const parts = reference.split('+').map(p => p.trim());
    const result = parts.reduce((sum, part) => {
      const partValue = getQuantityByReference(building, part);
      if (isNaN(partValue)) {
        logger.warn('[getQuantityByReference] NaN in composite reference part', { reference, part });
        return sum;
      }
      return sum + partValue;
    }, 0);
    return result;
  }

  // Handle combined B1+B2 references (for basement-high-ceiling module)
  // 예: 'F_B1B2_COMBINED' -> F열(철근), B1+B2 합산
  const combinedMatch = reference.match(/^([A-Z])_B1B2_COMBINED$/);
  if (combinedMatch) {
    const [, col] = combinedMatch;

    // Map column to field and subField
    const fieldMap: Record<string, { field: 'gangForm' | 'alForm' | 'formwork' | 'euroForm' | 'stripClean' | 'rebar' | 'concrete'; subField: string }> = {
      B: { field: 'gangForm', subField: 'areaM2' },
      C: { field: 'alForm', subField: 'areaM2' },
      D: { field: 'formwork', subField: 'areaM2' },
      E: { field: 'stripClean', subField: 'areaM2' },
      F: { field: 'rebar', subField: 'ton' },
      G: { field: 'concrete', subField: 'volumeM3' },
      U: { field: 'euroForm', subField: 'areaM2' },
    };

    const mapping = fieldMap[col];
    if (mapping) {
      const b1Qty = getQuantityFromFloor(building, 'B1', mapping.field, mapping.subField);
      const b2Qty = getQuantityFromFloor(building, 'B2', mapping.field, mapping.subField);
      return b1Qty + b2Qty;
    }

    return 0;
  }

  // 참조 패턴 파싱
  // 예: 'D6' -> D열(형틀), 6행(버림)
  // 예: 'G6' -> G열(콘크리트), 6행(버림)
  // 예: 'F7*0.45' -> F열(철근), 7행(기초), 45% 비율

  const match = reference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
  if (!match) return 0;
  
  const [, col, row, ratioStr] = match;
  const rowNum = parseInt(row, 10);
  const ratio = ratioStr ? parseFloat(ratioStr) : 1;

  // 행 번호 범위 검증 (유효 범위: 6~28)
  if (rowNum < 6 || rowNum > 28) {
    logger.warn('[getQuantityByReference] Row out of range', { reference, rowNum });
    return 0;
  }

  // 비율 값 검증
  if (isNaN(ratio) || ratio < 0) {
    logger.warn('[getQuantityByReference] Invalid ratio', { reference, ratio });
    return 0;
  }

  // 열에 따른 필드 결정 (B=갱폼, C=알폼, D=형틀, E=해체/정리, F=철근, G=콘크리트, U=유로폼)
  let field: 'gangForm' | 'alForm' | 'formwork' | 'euroForm' | 'stripClean' | 'rebar' | 'concrete' | null = null;
  let subField = '';

  switch (col) {
    case 'B':
      field = 'gangForm';
      subField = 'areaM2';
      break;
    case 'C':
      field = 'alForm';
      subField = 'areaM2';
      break;
    case 'D':
      field = 'formwork';
      subField = 'areaM2';
      break;
    case 'E':
      field = 'stripClean';
      subField = 'areaM2';
      break;
    case 'F':
      field = 'rebar';
      subField = 'ton';
      break;
    case 'G':
      field = 'concrete';
      subField = 'volumeM3';
      break;
    case 'U':
      field = 'euroForm';
      subField = 'areaM2';
      break;
  }
  
  if (!field) return 0;
  
  // 행 번호에 따른 구분 및 층 결정 (엑셀 구조에 맞게 수정)
  let tradeGroup = '';
  let floorLabel = '';
  let rangeFloorIdToPass: string | undefined;

  if (rowNum === 6) {
    // 버림 (행 6)
    tradeGroup = '버림';
  } else if (rowNum === 7) {
    // 기초 (행 7)
    tradeGroup = '기초';
  } else if (rowNum === 8) {
    // B2 (행 8)
    const basementFloors = building.floors
      .filter(f => f.levelType === '지하')
      .sort((a, b) => a.floorNumber - b.floorNumber); // Sort by floor number ascending (B2=-2, B1=-1)
    if (basementFloors.length >= 2) {
      tradeGroup = '주동 지하층';
      // 정규화된 라벨 사용 (코어 정보 제거)
      // B2 is the lowest basement (first in sorted array)
      floorLabel = normalizeFloorLabel(basementFloors[0].floorLabel); // B2
    }
    // B2가 없으면 tradeGroup과 floorLabel 모두 빈값으로 유지 → quantity = 0
  } else if (rowNum === 9) {
    // B1 (행 9)
    const basementFloors = building.floors
      .filter(f => f.levelType === '지하')
      .sort((a, b) => a.floorNumber - b.floorNumber); // Sort by floor number ascending (B2=-2, B1=-1)
    if (basementFloors.length >= 1) {
      tradeGroup = '주동 지하층';
      // 정규화된 라벨 사용 (코어 정보 제거)
      // B1 is the highest basement (last in sorted array, or only one if single basement)
      floorLabel = normalizeFloorLabel(basementFloors[basementFloors.length - 1].floorLabel); // B1
    }
  } else if (rowNum === 11) {
    // 행 11은 1층 - 셋팅층 또는 일반층일 수 있음
    const floorNum = rowNum - 10; // 행 11 = 1층
    // 먼저 셋팅층으로 찾기
    let floor = building.floors.find(f => {
      if (f.floorClass === '셋팅층') {
        const match = f.floorLabel.match(/(\d+)F|(\d+)층/);
        if (match) {
          const num = parseInt(match[1] || match[2], 10);
          return num === floorNum;
        }
      }
      return false;
    });
    if (floor) {
      tradeGroup = '셋팅층';
      floorLabel = floor.floorLabel;
    } else {
      // 일반층으로 찾기
      floor = building.floors.find(f => {
        if (f.floorClass === '일반층') {
          const match = f.floorLabel.match(/(\d+)F|(\d+)층/);
          if (match) {
            const num = parseInt(match[1] || match[2], 10);
            return num === floorNum;
          }
        }
        return false;
      });
      if (floor) {
        // 일반층도 셋팅층과 동일한 tradeGroup 사용 (공정 타입은 옥탑층 사용)
        tradeGroup = '셋팅층';
        floorLabel = floor.floorLabel;
      }
    }
  } else if (rowNum === 12) {
    // 행 12는 2층 - 셋팅층, 일반층 또는 기준층일 수 있음
    const floorNum = rowNum - 10; // 행 12 = 2층
    // 먼저 셋팅층으로 찾기
    let floor = building.floors.find(f => {
      if (f.floorClass === '셋팅층') {
        const match = f.floorLabel.match(/(\d+)F|(\d+)층/);
        if (match) {
          const num = parseInt(match[1] || match[2], 10);
          return num === floorNum;
        }
      }
      return false;
    });
    if (floor) {
      tradeGroup = '셋팅층';
      floorLabel = floor.floorLabel;
    } else {
      // 일반층으로 찾기
      floor = building.floors.find(f => {
        if (f.floorClass === '일반층') {
          const match = f.floorLabel.match(/(\d+)F|(\d+)층/);
          if (match) {
            const num = parseInt(match[1] || match[2], 10);
            return num === floorNum;
          }
        }
        return false;
      });
      if (floor) {
        // 일반층도 셋팅층과 동일한 tradeGroup 사용 (공정 타입은 옥탑층 사용)
        tradeGroup = '셋팅층';
        floorLabel = floor.floorLabel;
      } else {
        // 셋팅층/일반층이 아니면 기준층으로 처리
        tradeGroup = '기준층';
        floor = building.floors.find(f => {
          // 코어 정보 제거 후 매칭
          const cleanLabel = f.floorLabel.replace(/코어\d+-/, '');
          const match = cleanLabel.match(/(\d+)F|(\d+)층/);
          if (match) {
            const num = parseInt(match[1] || match[2], 10);
            return num === floorNum;
          }
          // 범위 형식의 기준층도 확인 (예: "2~14F 기준층")
          if (f.floorClass === '기준층') {
            const rangeMatch = cleanLabel.match(/(\d+)~(\d+)F/);
            if (rangeMatch) {
              const start = parseInt(rangeMatch[1], 10);
              const end = parseInt(rangeMatch[2], 10);
              return floorNum >= start && floorNum <= end;
            }
          }
          return false;
        });
        if (floor) {
          // 범위 형식의 기준층인 경우 rangeFloorId 저장
          if (floor.floorLabel.includes('~')) {
            rangeFloorIdToPass = floor.id;
            // 개별 층 라벨 생성 (예: "2F")
            floorLabel = `${floorNum}F`;
          } else {
            floorLabel = floor.floorLabel;
          }
        }
      }
    }
  } else if (rowNum >= 13 && rowNum <= 25) {
    // 기준층 (행 13~25: 3층 ~ 15층)
    tradeGroup = '기준층';
    const floorNum = rowNum - 10; // 행 13 = 3층, 행 14 = 4층, ...
    const floor = building.floors.find(f => {
      // 코어 정보 제거 후 매칭
      const cleanLabel = f.floorLabel.replace(/코어\d+-/, '');
      const match = cleanLabel.match(/(\d+)F|(\d+)층/);
      if (match) {
        const num = parseInt(match[1] || match[2], 10);
        if (num === floorNum) {
          return true; // 개별 층 매칭 성공
        }
        // 개별 층 매칭 실패 시 범위 체크로 계속 진행
      }
      // 범위 형식의 기준층도 확인 (예: "2~14F 기준층")
      if (f.floorClass === '기준층') {
        const rangeMatch = cleanLabel.match(/(\d+)~(\d+)F/);
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1], 10);
          const end = parseInt(rangeMatch[2], 10);
          return floorNum >= start && floorNum <= end;
        }
      }
      return false;
    });
    if (floor) {
      // 범위 형식의 기준층인 경우 개별 층의 floorLabel 생성
      if (floor.floorLabel.includes('~')) {
        // 범위 기준층 ID 저장
        rangeFloorIdToPass = floor.id;

        // 코어 정보가 있으면 유지, 없으면 그냥 층 번호만
        const hasCore = floor.floorLabel.includes('코어');
        if (hasCore) {
          const coreMatch = floor.floorLabel.match(/코어(\d+)-/);
          if (coreMatch) {
            floorLabel = `코어${coreMatch[1]}-${floorNum}F`;
          } else {
            floorLabel = `${floorNum}F`;
          }
        } else {
          floorLabel = `${floorNum}F`;
        }
      } else {
        // 원본 floorLabel 사용 (getQuantityFromFloor에서 찾기 위해)
        floorLabel = floor.floorLabel;
      }
    }
  } else if (rowNum === 26) {
    // 옥탑1층 (행 26)
    // 옥탑 또는 PH 형식 모두 검색
    const phFloors = building.floors.filter(f =>
      f.floorLabel.includes('옥탑') || /PH\d+/i.test(f.floorLabel)
    ).sort((a, b) => (a.floorNumber || 0) - (b.floorNumber || 0));

    if (phFloors.length >= 1) {
      tradeGroup = '옥탑층';
      floorLabel = normalizeFloorLabel(phFloors[0].floorLabel);
    } else {
      logger.warn('[getQuantityByReference] PH floor not found', {
        rowNum,
        phIndex: 0,
        availableFloors: phFloors.length,
        buildingId: building.id
      });
      return 0;
    }
  } else if (rowNum === 27) {
    // 옥탑2층 (행 27)
    const phFloors = building.floors.filter(f =>
      f.floorLabel.includes('옥탑') || /PH\d+/i.test(f.floorLabel)
    ).sort((a, b) => (a.floorNumber || 0) - (b.floorNumber || 0));

    if (phFloors.length >= 2) {
      tradeGroup = '옥탑층';
      floorLabel = normalizeFloorLabel(phFloors[1].floorLabel);
    } else {
      logger.warn('[getQuantityByReference] PH floor not found', {
        rowNum,
        phIndex: 1,
        availableFloors: phFloors.length,
        buildingId: building.id
      });
      return 0;
    }
  } else if (rowNum === 28) {
    // 옥탑3층 (행 28)
    const phFloors = building.floors.filter(f =>
      f.floorLabel.includes('옥탑') || /PH\d+/i.test(f.floorLabel)
    ).sort((a, b) => (a.floorNumber || 0) - (b.floorNumber || 0));

    if (phFloors.length >= 3) {
      tradeGroup = '옥탑층';
      floorLabel = normalizeFloorLabel(phFloors[2].floorLabel);
    } else {
      logger.warn('[getQuantityByReference] PH floor not found', {
        rowNum,
        phIndex: 2,
        availableFloors: phFloors.length,
        buildingId: building.id
      });
      return 0;
    }
  }
  
  // 물량 가져오기 - 물량입력 데이터(building.floorTrades)에서 가져옴
  let quantity = 0;

  if (floorLabel) {
    // 층별로 가져오기 - 물량입력 데이터에서 해당 층의 FloorTrade 찾기
    quantity = getQuantityFromFloor(building, floorLabel, field, subField, rangeFloorIdToPass);
  } else if (tradeGroup) {
    // 구분별로 가져오기 (버림, 기초 등) - 물량입력 데이터에서 해당 tradeGroup의 모든 FloorTrade 합산
    const trades = building.floorTrades.filter(ft => ft.tradeGroup === tradeGroup);
    trades.forEach(trade => {
      const tradeData = trade.trades[field];
      if (tradeData) {
        quantity += getQuantityValue(tradeData, subField);
      } else if (field === 'stripClean' && subField === 'areaM2') {
        // stripClean(해체/정리)은 DB에 저장되지 않는 파생값: 형틀합계(gangForm + alForm + euroForm) × 2
        const gangForm = getQuantityValue(trade.trades['gangForm'] || {}, 'areaM2');
        const alForm = getQuantityValue(trade.trades['alForm'] || {}, 'areaM2');
        const euroForm = getQuantityValue(trade.trades['euroForm'] || {}, 'areaM2');
        const formworkTotal = gangForm + alForm + euroForm;
        if (formworkTotal > 0) {
          quantity += formworkTotal * 2;
        }
      }
    });
  }
  
  return quantity * ratio;
}
