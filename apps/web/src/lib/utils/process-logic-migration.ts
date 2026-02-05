/**
 * 공정 로직 데이터 마이그레이션 유틸리티
 *
 * 기존 localStorage 데이터를 새로운 프리셋 형식으로 변환합니다.
 */

import type { ProcessLogicPreset, ProcessCategory } from '@/lib/types';
import type { ProcessModule } from '@/lib/data/process-modules';
import { BUILT_IN_FORMULAS } from '@/lib/data/built-in-formulas';

const LEGACY_STORAGE_KEY_PREFIX = 'contech-process-logic-';
const BACKUP_STORAGE_KEY_PREFIX = 'contech-process-logic-backup-';
const MIGRATED_FLAG_KEY = 'contech-process-logic-migrated';

/**
 * modules에서 각 카테고리의 equipmentCalculationBase 값을 추출
 */
function getEquipmentBaseByCategory(modules: ProcessModule[]): Record<ProcessCategory, number> {
  const defaults: Record<ProcessCategory, number> = {
    '버림': 650,
    '기초': 650,
    '주동 지하층': 500,
    '셋팅층': 400,
    '기준층': 320,
    '최상층': 230,
    'PH층': 230,
    '옥탑층': 230,
    '지하주차장': 500,
    '일반층': 200,
  };

  for (const module of modules) {
    // 해당 카테고리의 콘크리트 타설 항목 찾기
    const concreteItem = module.items.find(
      (item) => item.equipmentCalculationBase !== undefined
    );
    if (concreteItem && concreteItem.equipmentCalculationBase !== undefined) {
      defaults[module.category] = concreteItem.equipmentCalculationBase;
    }
  }

  return defaults;
}

/**
 * 프로젝트 ID에 해당하는 마이그레이션 플래그 확인
 */
export function isMigrated(projectId: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const migratedProjects = localStorage.getItem(MIGRATED_FLAG_KEY);
    if (!migratedProjects) return false;

    const parsed = JSON.parse(migratedProjects) as string[];
    return parsed.includes(projectId);
  } catch {
    return false;
  }
}

/**
 * 마이그레이션 완료 플래그 설정
 */
function setMigrated(projectId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const migratedProjects = localStorage.getItem(MIGRATED_FLAG_KEY);
    const parsed = migratedProjects ? (JSON.parse(migratedProjects) as string[]) : [];

    if (!parsed.includes(projectId)) {
      parsed.push(projectId);
      localStorage.setItem(MIGRATED_FLAG_KEY, JSON.stringify(parsed));
    }
  } catch (error) {
    console.error('Failed to set migration flag:', error);
  }
}

/**
 * 레거시 데이터를 기본 프리셋으로 마이그레이션
 *
 * @param projectId 프로젝트 ID
 * @returns 마이그레이션 성공 여부 및 생성된 프리셋
 */
export function migrateToPreset(projectId: string): {
  success: boolean;
  preset?: ProcessLogicPreset;
  message?: string;
} {
  if (typeof window === 'undefined') {
    return { success: false, message: 'Window is undefined' };
  }

  // 이미 마이그레이션 완료된 경우
  if (isMigrated(projectId)) {
    return { success: false, message: 'Already migrated' };
  }

  try {
    const legacyKey = `${LEGACY_STORAGE_KEY_PREFIX}${projectId}`;
    const legacyData = localStorage.getItem(legacyKey);

    if (!legacyData) {
      // 레거시 데이터가 없으면 마이그레이션 불필요
      setMigrated(projectId);
      return { success: false, message: 'No legacy data found' };
    }

    // 레거시 데이터 파싱
    const modules = JSON.parse(legacyData) as ProcessModule[];

    // 기본 프리셋 생성
    const now = new Date().toISOString();
    const defaultPreset: ProcessLogicPreset = {
      id: `preset-migrated-${projectId}`,
      name: '기존 설정 (자동 마이그레이션)',
      description: '이전 버전에서 자동으로 마이그레이션된 설정입니다.',
      projectId,
      isDefault: true,
      modules,
      formulas: BUILT_IN_FORMULAS,
      equipmentBases: getEquipmentBaseByCategory(modules),
      createdBy: 'system',
      createdAt: now,
      updatedAt: now,
    };

    // 프리셋 목록에 추가
    const presetsKey = 'contech-process-presets';
    const existingPresets = localStorage.getItem(presetsKey);
    const presets = existingPresets ? (JSON.parse(existingPresets) as ProcessLogicPreset[]) : [];

    presets.push(defaultPreset);
    localStorage.setItem(presetsKey, JSON.stringify(presets));

    // 활성 프리셋으로 설정
    const activePresetKey = `contech-active-preset-${projectId}`;
    localStorage.setItem(activePresetKey, defaultPreset.id);

    // 레거시 데이터 백업 (삭제하지 않음)
    const backupKey = `${BACKUP_STORAGE_KEY_PREFIX}${projectId}`;
    localStorage.setItem(backupKey, legacyData);

    // 마이그레이션 완료 플래그 설정
    setMigrated(projectId);

    console.log(`[Migration] 프로젝트 ${projectId} 데이터 마이그레이션 완료`);

    return {
      success: true,
      preset: defaultPreset,
      message: 'Migration completed successfully',
    };
  } catch (error) {
    console.error('[Migration] Failed to migrate legacy data:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 여러 프로젝트의 레거시 데이터를 일괄 마이그레이션
 *
 * @returns 마이그레이션 결과 목록
 */
export function migrateAllProjects(): {
  migrated: string[];
  failed: string[];
} {
  if (typeof window === 'undefined') {
    return { migrated: [], failed: [] };
  }

  const migrated: string[] = [];
  const failed: string[] = [];

  try {
    // localStorage에서 모든 레거시 키 찾기
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LEGACY_STORAGE_KEY_PREFIX) && !key.includes('backup')) {
        const projectId = key.replace(LEGACY_STORAGE_KEY_PREFIX, '');

        const result = migrateToPreset(projectId);
        if (result.success) {
          migrated.push(projectId);
        } else if (result.message !== 'Already migrated' && result.message !== 'No legacy data found') {
          failed.push(projectId);
        }
      }
    }

    console.log(`[Migration] 일괄 마이그레이션 완료: ${migrated.length}개 성공, ${failed.length}개 실패`);

    return { migrated, failed };
  } catch (error) {
    console.error('[Migration] Failed to migrate all projects:', error);
    return { migrated, failed };
  }
}

/**
 * 백업된 레거시 데이터 복원
 *
 * @param projectId 프로젝트 ID
 * @returns 복원 성공 여부
 */
export function restoreBackup(projectId: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const backupKey = `${BACKUP_STORAGE_KEY_PREFIX}${projectId}`;
    const backup = localStorage.getItem(backupKey);

    if (!backup) {
      console.warn(`[Migration] No backup found for project ${projectId}`);
      return false;
    }

    const legacyKey = `${LEGACY_STORAGE_KEY_PREFIX}${projectId}`;
    localStorage.setItem(legacyKey, backup);

    // 마이그레이션 플래그 제거
    const migratedProjects = localStorage.getItem(MIGRATED_FLAG_KEY);
    if (migratedProjects) {
      const parsed = JSON.parse(migratedProjects) as string[];
      const updated = parsed.filter((id) => id !== projectId);
      localStorage.setItem(MIGRATED_FLAG_KEY, JSON.stringify(updated));
    }

    console.log(`[Migration] 백업 복원 완료: ${projectId}`);
    return true;
  } catch (error) {
    console.error('[Migration] Failed to restore backup:', error);
    return false;
  }
}
