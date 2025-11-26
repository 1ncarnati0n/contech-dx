/**
 * Mock Storage Service
 * LocalStorage 기반 Mock 데이터 관리
 * 
 * Note: Gantt-related mock storage has been removed.
 * This file is kept for future extensions.
 */

// Check if running in browser
const isBrowser = typeof window !== 'undefined';

// Storage Keys (for future use)
const STORAGE_KEYS = {
  // Add new storage keys here as needed
};

// ============================================
// Clear All Mock Data
// ============================================

export function clearAllMockData(): void {
  if (!isBrowser) return;
  console.log('✅ All mock data cleared');
}


