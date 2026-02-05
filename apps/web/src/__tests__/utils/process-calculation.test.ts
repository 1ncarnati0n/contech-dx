import {
  calculateTotalWorkers,
  calculateDailyInputWorkers,
  calculateWorkDaysWithRounding,
  calculateEquipmentCount,
  calculateTotalWorkDays,
  calculateDailyInputWorkersByEquipment,
  calculateDailyInputWorkersByWorkDays,
  calculateIndirectWorkers,
  calculateIndirectEquipment,
} from '@/lib/utils/process-calculation';

describe('process-calculation', () => {
  describe('calculateTotalWorkers', () => {
    it('should ceil the result', () => {
      // 100/30 = 3.33... → 4
      expect(calculateTotalWorkers(100, 30)).toBe(4);
    });

    it('should return 0 for zero productivity', () => {
      expect(calculateTotalWorkers(100, 0)).toBe(0);
    });

    it('should handle exact division', () => {
      // 100/25 = 4
      expect(calculateTotalWorkers(100, 25)).toBe(4);
    });

    it('should handle very small quantities', () => {
      // 1/30 = 0.033... → 1
      expect(calculateTotalWorkers(1, 30)).toBe(1);
    });
  });

  describe('calculateDailyInputWorkers', () => {
    it('should ceil the result', () => {
      // 10/3 = 3.33... → 4
      expect(calculateDailyInputWorkers(10, 3)).toBe(4);
    });

    it('should return 0 for zero equipment', () => {
      expect(calculateDailyInputWorkers(10, 0)).toBe(0);
    });

    it('should handle exact division', () => {
      // 12/3 = 4
      expect(calculateDailyInputWorkers(12, 3)).toBe(4);
    });

    it('should handle single equipment', () => {
      expect(calculateDailyInputWorkers(10, 1)).toBe(10);
    });
  });

  describe('calculateWorkDaysWithRounding', () => {
    it('should floor when decimal < 0.5', () => {
      // 100 / (10 * 3) = 3.33 → floor → 3
      expect(calculateWorkDaysWithRounding(100, 10, 3)).toBe(3);
    });

    it('should ceil when decimal >= 0.5', () => {
      // 110 / (10 * 2) = 5.5 → ceil → 6
      expect(calculateWorkDaysWithRounding(110, 10, 2)).toBe(6);
    });

    it('should return minimum 1', () => {
      expect(calculateWorkDaysWithRounding(1, 100, 10)).toBe(1);
    });

    it('should handle zero inputs safely', () => {
      expect(calculateWorkDaysWithRounding(100, 0, 10)).toBe(1);
      expect(calculateWorkDaysWithRounding(100, 10, 0)).toBe(1);
    });

    it('should handle exact 0.5 boundary', () => {
      // 150 / (10 * 3) = 5.0 → ceil → 5
      expect(calculateWorkDaysWithRounding(150, 10, 3)).toBe(5);
    });

    it('should handle decimal just below 0.5', () => {
      // 149 / (10 * 3) = 4.966... → decimal = 0.966 (>= 0.5) → ceil → 5
      expect(calculateWorkDaysWithRounding(149, 10, 3)).toBe(5);
    });

    it('should handle decimal just above 0.5', () => {
      // 151 / (10 * 3) = 5.033... → decimal = 0.033 (< 0.5) → floor → 5
      expect(calculateWorkDaysWithRounding(151, 10, 3)).toBe(5);
    });
  });

  describe('calculateEquipmentCount', () => {
    it('should ceil and limit to max', () => {
      // 400/250 = 1.6 → ceil(min(2, 1.6)) = 2
      expect(calculateEquipmentCount(400, 250, 2)).toBe(2);
    });

    it('should return 1 for zero base', () => {
      expect(calculateEquipmentCount(100, 0, 2)).toBe(1);
    });

    it('should respect max limit', () => {
      // 1000/100 = 10, but max is 2
      expect(calculateEquipmentCount(1000, 100, 2)).toBe(2);
    });

    it('should return equipment count less than max when appropriate', () => {
      // 150/100 = 1.5 → ceil → 2, max is 5 → 2
      expect(calculateEquipmentCount(150, 100, 5)).toBe(2);
    });

    it('should return minimum 1', () => {
      expect(calculateEquipmentCount(10, 1000, 5)).toBe(1);
    });
  });

  describe('calculateTotalWorkDays', () => {
    it('should add direct and indirect days with ceiling', () => {
      // 5.3 + 2.7 = 8.0 → ceil → 8
      expect(calculateTotalWorkDays(5.3, 2.7)).toBe(8);
    });

    it('should ceil fractional results', () => {
      // 5.1 + 2.1 = 7.2 → ceil → 8
      expect(calculateTotalWorkDays(5.1, 2.1)).toBe(8);
    });

    it('should handle zero indirect days', () => {
      expect(calculateTotalWorkDays(5.5, 0)).toBe(6);
    });

    it('should handle exact integers', () => {
      expect(calculateTotalWorkDays(5, 3)).toBe(8);
    });
  });

  describe('calculateDailyInputWorkersByEquipment', () => {
    it('should multiply equipment count by workers per unit', () => {
      expect(calculateDailyInputWorkersByEquipment(2, 5)).toBe(10);
    });

    it('should handle zero equipment', () => {
      expect(calculateDailyInputWorkersByEquipment(0, 5)).toBe(0);
    });

    it('should handle zero workers per unit', () => {
      expect(calculateDailyInputWorkersByEquipment(2, 0)).toBe(0);
    });
  });

  describe('calculateDailyInputWorkersByWorkDays', () => {
    it('should ceil the division result', () => {
      // 10/3 = 3.33... → 4
      expect(calculateDailyInputWorkersByWorkDays(10, 3)).toBe(4);
    });

    it('should return 0 for zero work days', () => {
      expect(calculateDailyInputWorkersByWorkDays(10, 0)).toBe(0);
    });

    it('should handle exact division', () => {
      expect(calculateDailyInputWorkersByWorkDays(12, 4)).toBe(3);
    });
  });

  describe('calculateIndirectWorkers', () => {
    it('should calculate indirect workers with default 30% ratio', () => {
      // 10 * 0.3 = 3.0 → ceil → 3
      expect(calculateIndirectWorkers(10)).toBe(3);
    });

    it('should calculate indirect workers with custom ratio', () => {
      // 10 * 0.5 = 5.0 → ceil → 5
      expect(calculateIndirectWorkers(10, 0.5)).toBe(5);
    });

    it('should ceil fractional results', () => {
      // 15 * 0.3 = 4.5 → ceil → 5
      expect(calculateIndirectWorkers(15)).toBe(5);
    });

    it('should return 0 for zero direct workers', () => {
      expect(calculateIndirectWorkers(0)).toBe(0);
    });

    it('should handle very small ratios', () => {
      // 10 * 0.01 = 0.1 → ceil → 1
      expect(calculateIndirectWorkers(10, 0.01)).toBe(1);
    });

    it('should handle 100% ratio', () => {
      // 8 * 1.0 = 8.0 → ceil → 8
      expect(calculateIndirectWorkers(8, 1.0)).toBe(8);
    });
  });

  describe('calculateIndirectEquipment', () => {
    it('should calculate indirect equipment with default 30% ratio', () => {
      // 5 * 0.3 = 1.5 → ceil → 2
      expect(calculateIndirectEquipment(5)).toBe(2);
    });

    it('should calculate indirect equipment with custom ratio', () => {
      // 6 * 0.5 = 3.0 → ceil → 3
      expect(calculateIndirectEquipment(6, 0.5)).toBe(3);
    });

    it('should ceil fractional results', () => {
      // 10 * 0.3 = 3.0 → ceil → 3
      expect(calculateIndirectEquipment(10)).toBe(3);
    });

    it('should return 0 for zero direct equipment', () => {
      expect(calculateIndirectEquipment(0)).toBe(0);
    });

    it('should handle single equipment unit', () => {
      // 1 * 0.3 = 0.3 → ceil → 1
      expect(calculateIndirectEquipment(1)).toBe(1);
    });

    it('should handle very small ratios', () => {
      // 100 * 0.01 = 1.0 → ceil → 1
      expect(calculateIndirectEquipment(100, 0.01)).toBe(1);
    });
  });

  describe('Edge cases and consistency', () => {
    it('should maintain consistency across related calculations', () => {
      const quantity = 1000;
      const dailyProductivity = 30;
      const equipmentCount = 2;

      const totalWorkers = calculateTotalWorkers(quantity, dailyProductivity);
      const dailyWorkers = calculateDailyInputWorkers(totalWorkers, equipmentCount);
      const workDays = calculateWorkDaysWithRounding(quantity, dailyProductivity, dailyWorkers);

      // All results should be positive integers
      expect(totalWorkers).toBeGreaterThan(0);
      expect(dailyWorkers).toBeGreaterThan(0);
      expect(workDays).toBeGreaterThanOrEqual(1);
      expect(Number.isInteger(totalWorkers)).toBe(true);
      expect(Number.isInteger(dailyWorkers)).toBe(true);
      expect(Number.isInteger(workDays)).toBe(true);
    });

    it('should handle very large quantities', () => {
      const result = calculateTotalWorkers(10000, 50);
      expect(result).toBe(200);
    });

    it('should handle very small productivities', () => {
      const result = calculateTotalWorkers(100, 0.5);
      expect(result).toBe(200);
    });
  });
});
