import type { Annotation } from '../types';

const STORAGE_KEY = 'ifc-viewer-annotations';

/**
 * 주석 로컬 스토리지 유틸리티
 *
 * 주석을 LocalStorage에 저장하고 불러옵니다.
 * 추후 Supabase 등 원격 저장소로 확장 가능합니다.
 */

/**
 * 모든 주석 불러오기
 */
export function loadAnnotations(modelId?: string): Annotation[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const annotations: Annotation[] = JSON.parse(data);

    if (modelId) {
      return annotations.filter((a) => a.modelId === modelId);
    }

    return annotations;
  } catch (error) {
    console.warn('Failed to load annotations:', error);
    return [];
  }
}

/**
 * 주석 저장하기
 */
export function saveAnnotations(annotations: Annotation[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
  } catch (error) {
    console.warn('Failed to save annotations:', error);
  }
}

/**
 * 주석 추가하기
 */
export function addAnnotationToStorage(annotation: Annotation): Annotation[] {
  const annotations = loadAnnotations();
  annotations.push(annotation);
  saveAnnotations(annotations);
  return annotations;
}

/**
 * 주석 업데이트하기
 */
export function updateAnnotationInStorage(id: string, updates: Partial<Annotation>): Annotation[] {
  const annotations = loadAnnotations();
  const index = annotations.findIndex((a) => a.id === id);

  if (index !== -1) {
    annotations[index] = {
      ...annotations[index],
      ...updates,
      updatedAt: Date.now(),
    };
    saveAnnotations(annotations);
  }

  return annotations;
}

/**
 * 주석 삭제하기
 */
export function removeAnnotationFromStorage(id: string): Annotation[] {
  const annotations = loadAnnotations();
  const filtered = annotations.filter((a) => a.id !== id);
  saveAnnotations(filtered);
  return filtered;
}

/**
 * 모델의 모든 주석 삭제하기
 */
export function clearAnnotationsForModel(modelId: string): Annotation[] {
  const annotations = loadAnnotations();
  const filtered = annotations.filter((a) => a.modelId !== modelId);
  saveAnnotations(filtered);
  return filtered;
}

/**
 * 모든 주석 삭제하기
 */
export function clearAllAnnotations(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear annotations:', error);
  }
}

/**
 * 주석 내보내기 (JSON)
 */
export function exportAnnotations(modelId?: string): string {
  const annotations = loadAnnotations(modelId);
  return JSON.stringify(annotations, null, 2);
}

/**
 * 주석 가져오기 (JSON)
 */
export function importAnnotations(jsonString: string): Annotation[] {
  try {
    const imported: Annotation[] = JSON.parse(jsonString);
    const existing = loadAnnotations();

    // 중복 ID 제거하고 병합
    const merged = [...existing];
    for (const ann of imported) {
      if (!merged.find((a) => a.id === ann.id)) {
        merged.push(ann);
      }
    }

    saveAnnotations(merged);
    return merged;
  } catch (error) {
    console.warn('Failed to import annotations:', error);
    return loadAnnotations();
  }
}
