import { useState, useCallback } from 'react';

/**
 * 공정 모듈 확장/축소 상태 관리 커스텀 훅
 *
 * 🎯 Purpose: Manages which process modules are expanded/collapsed
 * Replaces ~50 lines of expansion state management
 *
 * 📦 State Structure:
 * - Map<buildingId, Set<moduleKey>>
 * - Each building has its own set of expanded module keys
 * - Keys format: "{category}" or "{category}-{floorLabel}"
 *
 * 🔑 Module Key Examples:
 * - "기준층" - Expands all standard floor items
 * - "옥탑층-PH1" - Expands specific rooftop floor items
 * - "지하층-B2" - Expands specific basement floor items
 *
 * @returns Object with state and control functions
 *
 * @example
 * const { expandedModules, toggleModule, expandAll, collapseAll } = useExpandedModules();
 *
 * // Toggle a specific module
 * toggleModule('building-123', '기준층');
 *
 * // Expand all modules for a building
 * expandAll('building-123', ['기준층', '셋팅층', '옥탑층']);
 *
 * // Collapse all
 * collapseAll('building-123');
 */
export function useExpandedModules() {
  const [expandedModules, setExpandedModules] = useState<Map<string, Set<string>>>(new Map());

  /**
   * Toggle expansion state of a specific module
   * If expanded → collapse, if collapsed → expand
   */
  const toggleModule = useCallback((buildingId: string, moduleKey: string) => {
    setExpandedModules(prev => {
      const newMap = new Map(prev);
      const expanded = newMap.get(buildingId) || new Set<string>();
      const newExpanded = new Set(expanded);

      if (newExpanded.has(moduleKey)) {
        newExpanded.delete(moduleKey);
      } else {
        newExpanded.add(moduleKey);
      }

      newMap.set(buildingId, newExpanded);
      return newMap;
    });
  }, []);

  /**
   * Expand all specified modules for a building
   * Useful for "Expand All" functionality
   */
  const expandAll = useCallback((buildingId: string, keys: string[]) => {
    setExpandedModules(prev => {
      const newMap = new Map(prev);
      newMap.set(buildingId, new Set(keys));
      return newMap;
    });
  }, []);

  /**
   * Collapse all modules for a building
   * Useful for "Collapse All" functionality
   */
  const collapseAll = useCallback((buildingId: string) => {
    setExpandedModules(prev => {
      const newMap = new Map(prev);
      newMap.set(buildingId, new Set());
      return newMap;
    });
  }, []);

  /**
   * Check if a specific module is expanded
   */
  const isExpanded = useCallback((buildingId: string, moduleKey: string): boolean => {
    const expanded = expandedModules.get(buildingId);
    return expanded ? expanded.has(moduleKey) : false;
  }, [expandedModules]);

  return { expandedModules, toggleModule, expandAll, collapseAll, isExpanded };
}
