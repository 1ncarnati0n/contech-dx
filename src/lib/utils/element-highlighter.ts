/**
 * 화면 요소 하이라이트 유틸리티
 * VisualGuideOverlay와 연동
 */

import type { HighlightTarget, HighlightTargetKey } from '@/components/buildings/ProcessPlanChatbotTypes';
import { HIGHLIGHT_REGISTRY, getHighlightTarget, getHighlightTargets } from './highlight-registry';

const HIGHLIGHT_CLASS = 'process-plan-highlight';
const ACTIVE_HIGHLIGHT_CLASS = 'process-plan-highlight-active';

/**
 * 요소를 하이라이트합니다.
 */
export function highlightElement(selector: string): HTMLElement | null {
  const element = document.querySelector(selector) as HTMLElement;
  if (!element) {
    console.warn(`[highlightElement] Element not found: ${selector}`);
    return null;
  }

  // 하이라이트 클래스 추가
  element.classList.add(HIGHLIGHT_CLASS, ACTIVE_HIGHLIGHT_CLASS);

  // 스크롤하여 요소가 보이도록
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return element;
}

/**
 * 하이라이트를 제거합니다.
 */
export function removeHighlight(selector: string): void {
  const element = document.querySelector(selector) as HTMLElement;
  if (element) {
    element.classList.remove(HIGHLIGHT_CLASS, ACTIVE_HIGHLIGHT_CLASS);
  }
}

/**
 * 모든 하이라이트를 제거합니다.
 */
export function removeAllHighlights(): void {
  const highlightedElements = document.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
  highlightedElements.forEach(element => {
    element.classList.remove(HIGHLIGHT_CLASS, ACTIVE_HIGHLIGHT_CLASS);
  });
}

/**
 * 여러 타겟을 하이라이트합니다.
 */
export function highlightTargets(targets: HighlightTarget[]): HTMLElement[] {
  // 기존 하이라이트 제거
  removeAllHighlights();

  const elements: HTMLElement[] = [];

  // 각 타겟 하이라이트
  targets.forEach((target, index) => {
    if (target.selector) {
      const element = document.querySelector(target.selector) as HTMLElement;
      if (element) {
        element.classList.add(HIGHLIGHT_CLASS);
        if (index === 0) {
          element.classList.add(ACTIVE_HIGHLIGHT_CLASS);
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        elements.push(element);
      }
    }
  });

  return elements;
}

/**
 * 레지스트리 키로 하이라이트합니다.
 */
export function highlightByKey(key: HighlightTargetKey): HTMLElement | null {
  const target = getHighlightTarget(key);
  if (!target) {
    console.warn(`[highlightByKey] Target not found in registry: ${key}`);
    return null;
  }
  return highlightElement(target.selector);
}

/**
 * 여러 레지스트리 키로 하이라이트합니다.
 */
export function highlightByKeys(keys: HighlightTargetKey[]): HTMLElement[] {
  const targets = getHighlightTargets(keys);
  return highlightTargets(targets);
}

/**
 * 하이라이트 스타일 주입 (초기화 시 한 번 호출)
 */
export function injectHighlightStyles(): void {
  const styleId = 'process-plan-highlight-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      position: relative;
      z-index: 9999 !important;
      box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.3);
      border-radius: 4px;
      transition: box-shadow 0.3s ease;
    }

    .${ACTIVE_HIGHLIGHT_CLASS} {
      box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.5), 0 0 20px rgba(6, 182, 212, 0.3);
      animation: pulse-highlight 2s infinite;
    }

    @keyframes pulse-highlight {
      0%, 100% {
        box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.5), 0 0 20px rgba(6, 182, 212, 0.3);
      }
      50% {
        box-shadow: 0 0 0 6px rgba(6, 182, 212, 0.4), 0 0 30px rgba(6, 182, 212, 0.4);
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * 요소가 뷰포트 내에 있는지 확인
 */
export function isElementInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * 요소로 스크롤
 */
export function scrollToElement(selector: string): void {
  const element = document.querySelector(selector) as HTMLElement;
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
