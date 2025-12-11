/**
 * 물량 데이터 참조 유틸리티
 * 물량입력 페이지의 데이터를 참조하여 수량을 가져옴
 */

import type { Building, FloorTrade } from '@/lib/types';

/**
 * 물량 데이터에서 값 가져오기
 */
export function getQuantityFromBuilding(
  building: Building,
  category: string, // '버림', '기초', '지하골조' 등
  field: 'gangForm' | 'alForm' | 'formwork' | 'stripClean' | 'rebar' | 'concrete',
  subField: string // 'areaM2', 'ton', 'volumeM3' 등
): number {
  // 구분에 맞는 FloorTrade 찾기
  const trade = building.floorTrades.find(ft => ft.tradeGroup === category);
  if (!trade) return 0;
  
  const tradeData = trade.trades[field];
  if (!tradeData) return 0;
  
  return (tradeData as any)[subField] || 0;
}

/**
 * 비율 계산으로 물량 가져오기
 */
export function getQuantityWithRatio(
  building: Building,
  category: string,
  field: 'gangForm' | 'alForm' | 'formwork' | 'stripClean' | 'rebar' | 'concrete',
  subField: string,
  ratio: number // 0.45, 0.55, 0.95 등
): number {
  const baseQuantity = getQuantityFromBuilding(building, category, field, subField);
  return baseQuantity * ratio;
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
  floorLabel: string, // '1F', '2F', 'B1', '코어1-3F' 등
  field: 'gangForm' | 'alForm' | 'formwork' | 'stripClean' | 'rebar' | 'concrete',
  subField: string
): number {
  // 층 찾기 (정확히 일치하거나, 코어 정보를 제거한 후 일치하는 경우)
  let floor = building.floors.find(f => f.floorLabel === floorLabel);
  
  // 정확히 일치하지 않으면 코어 정보를 제거한 후 매칭 시도
  if (!floor) {
    const cleanLabel = floorLabel.replace(/코어\d+-/, '');
    floor = building.floors.find(f => {
      const cleanFloorLabel = f.floorLabel.replace(/코어\d+-/, '');
      return cleanFloorLabel === cleanLabel;
    });
  }
  
  // 개별 층이 없으면 범위 형식의 기준층 찾기 (예: "7F" -> "2~14F 기준층" 또는 "코어1-2~14F 기준층")
  let rangeFloor: typeof floor | null = null;
  let individualFloorId: string | null = null;
  
  if (!floor) {
    const floorMatch = floorLabel.match(/(\d+)F/);
    if (floorMatch) {
      const floorNum = parseInt(floorMatch[1], 10);
      // 기준층 범위 형식 찾기 (코어 정보 포함/미포함 모두 처리)
      // FloorTradeTable과 동일한 로직 사용
      rangeFloor = building.floors.find(f => {
        if (f.floorClass === '기준층' && f.floorLabel.includes('~')) {
          // 코어 정보 제거 후 범위 추출
          const cleanLabel = f.floorLabel.replace(/코어\d+-/, '').replace(/\s*기준층\s*$/, '');
          const rangeMatch = cleanLabel.match(/(\d+)~(\d+)F/);
          if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10);
            const end = parseInt(rangeMatch[2], 10);
            // 12층과 13층 모두 동일하게 처리
            return floorNum >= start && floorNum <= end;
          }
        }
        return false;
      });
      
      // 범위 형식의 기준층을 찾았으면, FloorTradeTable과 동일한 방식으로 floor.id 생성
      // 예: rangeFloor.id가 "floor-123"이고 floorNum이 13이면 "floor-123-13F"
      if (rangeFloor) {
        individualFloorId = `${rangeFloor.id}-${floorNum}F`;
      }
    }
  }
  
  if (!floor && !rangeFloor) return 0;
  
  // 해당 층의 FloorTrade 찾기 (tradeGroup: '아파트' 우선, 없으면 다른 tradeGroup도 확인)
  // 범위 형식의 기준층인 경우 개별 층의 floor.id 사용
  const targetFloorId = individualFloorId || (floor ? floor.id : null);
  if (!targetFloorId) return 0;
  
  // 12층과 13층 모두 동일한 방식으로 찾기
  // 먼저 정확한 floorId로 찾기
  let trade = building.floorTrades.find(ft => 
    ft.floorId === targetFloorId && ft.tradeGroup === '아파트'
  );
  
  // '아파트' tradeGroup이 없으면 다른 tradeGroup도 확인
  if (!trade) {
    trade = building.floorTrades.find(ft => ft.floorId === targetFloorId);
  }
  
  // 범위 형식의 기준층인데 찾지 못한 경우, 원본 rangeFloor.id로도 시도 (하위 호환성)
  if (!trade && rangeFloor && individualFloorId) {
    trade = building.floorTrades.find(ft => 
      ft.floorId === rangeFloor!.id && ft.tradeGroup === '아파트'
    );
    if (!trade) {
      trade = building.floorTrades.find(ft => ft.floorId === rangeFloor!.id);
    }
  }
  
  if (!trade) return 0;
  
  const tradeData = trade.trades[field];
  if (!tradeData) return 0;
  
  return (tradeData as any)[subField] || 0;
}

/**
 * 엑셀 참조 패턴에 따른 물량 가져오기
 * 물량입력 데이터(building.floorTrades)를 기반으로 수량을 가져옵니다.
 * 엑셀 열 구조: B=갱폼, C=알폼, D=형틀, E=해체/정리, F=철근, G=콘크리트
 * 행 구조: 행 6=버림, 행 7=기초, 행 8=B2, 행 9=B1, 행 11=1층, 행 12=2층, 행 13=3층, 행 14=4층, 행 26=PH1층, 행 27=PH2층, 행 28=PH3층
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
    return parts.reduce((sum, part) => sum + getQuantityByReference(building, part), 0);
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
  
  // 열에 따른 필드 결정 (수정: B=갱폼, C=알폼, D=형틀, E=해체/정리, F=철근, G=콘크리트)
  let field: 'gangForm' | 'alForm' | 'formwork' | 'stripClean' | 'rebar' | 'concrete' | null = null;
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
  }
  
  if (!field) return 0;
  
  // 행 번호에 따른 구분 및 층 결정 (엑셀 구조에 맞게 수정)
  let tradeGroup = '';
  let floorLabel = '';
  
  if (rowNum === 6) {
    // 버림 (행 6)
    tradeGroup = '버림';
  } else if (rowNum === 7) {
    // 기초 (행 7)
    tradeGroup = '기초';
  } else if (rowNum === 8) {
    // B2 (행 8)
    tradeGroup = '지하골조';
    const basementFloors = building.floors.filter(f => f.levelType === '지하');
    if (basementFloors.length >= 2) {
      floorLabel = basementFloors[basementFloors.length - 1].floorLabel; // B2
    }
  } else if (rowNum === 9) {
    // B1 (행 9)
    tradeGroup = '지하골조';
    const basementFloors = building.floors.filter(f => f.levelType === '지하');
    if (basementFloors.length >= 1) {
      floorLabel = basementFloors[0].floorLabel; // B1
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
        // 일반층도 셋팅층과 동일한 tradeGroup 사용 (공정 타입은 PH층 사용)
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
        // 일반층도 셋팅층과 동일한 tradeGroup 사용 (공정 타입은 PH층 사용)
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
          floorLabel = floor.floorLabel;
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
      // 범위 형식의 기준층인 경우 개별 층의 floorLabel 생성
      if (floor.floorLabel.includes('~')) {
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
    // PH1층 (행 26)
    tradeGroup = 'PH층';
    const phFloors = building.floors.filter(f => f.floorLabel.includes('PH'));
    if (phFloors.length >= 1) {
      floorLabel = phFloors[0].floorLabel; // PH1층
    }
  } else if (rowNum === 27) {
    // PH2층 (행 27)
    tradeGroup = 'PH층';
    const phFloors = building.floors.filter(f => f.floorLabel.includes('PH'));
    if (phFloors.length >= 2) {
      floorLabel = phFloors[1].floorLabel; // PH2층
    }
  } else if (rowNum === 28) {
    // PH3층 (행 28)
    tradeGroup = 'PH층';
    const phFloors = building.floors.filter(f => f.floorLabel.includes('PH'));
    if (phFloors.length >= 3) {
      floorLabel = phFloors[2].floorLabel; // PH3층
    }
  }
  
  // 물량 가져오기 - 물량입력 데이터(building.floorTrades)에서 가져옴
  let quantity = 0;
  
  if (floorLabel) {
    // 층별로 가져오기 - 물량입력 데이터에서 해당 층의 FloorTrade 찾기
    quantity = getQuantityFromFloor(building, floorLabel, field, subField);
  } else if (tradeGroup) {
    // 구분별로 가져오기 (버림, 기초 등) - 물량입력 데이터에서 해당 tradeGroup의 모든 FloorTrade 합산
    const trades = building.floorTrades.filter(ft => ft.tradeGroup === tradeGroup);
    trades.forEach(trade => {
      const tradeData = trade.trades[field];
      if (tradeData) {
        quantity += (tradeData as any)[subField] || 0;
      }
    });
  }
  
  return quantity * ratio;
}

