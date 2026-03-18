import type { ProcessModule } from '@/features/building/data/process-modules';

/**
 * 최상층 모듈에서 거푸집 해체/정리 항목 제거
 * (7개 → 6개 항목으로 마이그레이션)
 *
 * @param modules - 마이그레이션할 프로세스 모듈 배열
 * @returns 마이그레이션된 모듈과 마이그레이션 여부
 */
export function migrateTopFloorModules(modules: ProcessModule[]): {
  modules: ProcessModule[];
  migrated: boolean;
} {
  let migrated = false;

  const newModules = modules.map((module) => {
    // 최상층이 아니면 그대로 반환
    if (module.category !== '최상층') {
      return module;
    }

    // 최상층인데 7개 항목이 아니면 그대로 반환 (이미 마이그레이션됨)
    if (module.items.length !== 7) {
      return module;
    }

    // 7번째 항목이 거푸집 해체/정리인지 확인
    const lastItem = module.items[6];
    if (
      !lastItem.workItem.includes('거푸집') ||
      !lastItem.workItem.includes('해체')
    ) {
      return module;
    }

    // 7번째 항목 제거
    migrated = true;
    return {
      ...module,
      items: module.items.slice(0, 6),
    };
  });

  return { modules: newModules, migrated };
}

/**
 * 지하주차장 모듈에서 버림/기초 항목 제거
 * (버림 2개 + 기초 4개 제거, B2/B1만 유지)
 *
 * @param modules - 마이그레이션할 프로세스 모듈 배열
 * @returns 마이그레이션된 모듈과 마이그레이션 여부
 */
export function migrateParkingModules(modules: ProcessModule[]): {
  modules: ProcessModule[];
  migrated: boolean;
} {
  let migrated = false;

  const newModules = modules.map((module) => {
    // 지하주차장이 아니면 그대로 반환
    if (module.category !== '지하주차장') {
      return module;
    }

    // 버림/기초 항목이 없으면 이미 마이그레이션됨
    const hasBlindingOrFoundation = module.items.some(
      (item) => item.floorLabel === '버림' || item.floorLabel === '기초'
    );

    if (!hasBlindingOrFoundation) {
      return module;
    }

    // 버림/기초 항목 제거 (B2, B1만 유지)
    migrated = true;
    return {
      ...module,
      items: module.items.filter(
        (item) => item.floorLabel !== '버림' && item.floorLabel !== '기초'
      ),
    };
  });

  return { modules: newModules, migrated };
}
