import { calculateFormula } from '@/features/building/quantity/TradeInputCell';

describe('calculateFormula', () => {
  describe('basic arithmetic', () => {
    it('should evaluate simple addition', () => {
      expect(calculateFormula('=1+2')).toBe(3);
    });

    it('should evaluate subtraction', () => {
      expect(calculateFormula('=10-3')).toBe(7);
    });

    it('should evaluate multiplication', () => {
      expect(calculateFormula('=4*5')).toBe(20);
    });

    it('should evaluate division', () => {
      expect(calculateFormula('=10/4')).toBe(2.5);
    });

    it('should evaluate mixed operations', () => {
      expect(calculateFormula('=2+3*4')).toBe(14);
    });

    it('should handle parentheses', () => {
      expect(calculateFormula('=(2+3)*4')).toBe(20);
    });
  });

  describe('prefix handling', () => {
    it('should work with = prefix', () => {
      expect(calculateFormula('=100+200')).toBe(300);
    });

    it('should work without = prefix', () => {
      expect(calculateFormula('100+200')).toBe(300);
    });

    it('should handle whitespace', () => {
      expect(calculateFormula('= 100 + 200 ')).toBe(300);
    });
  });

  describe('decimal numbers', () => {
    it('should handle decimals', () => {
      expect(calculateFormula('=1.5+2.5')).toBe(4);
    });

    it('should handle decimal multiplication', () => {
      expect(calculateFormula('=3.14*2')).toBeCloseTo(6.28);
    });
  });

  describe('safety / sanitization', () => {
    it('should reject alphabetic characters', () => {
      expect(calculateFormula('=alert(1)')).toBeNull();
    });

    it('should reject strings with letters', () => {
      expect(calculateFormula('=abc')).toBeNull();
    });

    it('should reject semicolons', () => {
      expect(calculateFormula('=1;2')).toBeNull();
    });

    it('should reject template literals', () => {
      expect(calculateFormula('=`test`')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should return null for empty input', () => {
      expect(calculateFormula('')).toBeNull();
      expect(calculateFormula('=')).toBeNull();
    });

    it('should return null for division by zero (Infinity)', () => {
      expect(calculateFormula('=1/0')).toBeNull();
    });

    it('should handle negative numbers', () => {
      expect(calculateFormula('=-5+10')).toBe(5);
    });

    it('should handle nested parentheses', () => {
      expect(calculateFormula('=((2+3)*(4+1))')).toBe(25);
    });
  });
});
