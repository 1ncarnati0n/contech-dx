import {
  getTradeCategory,
  getTradeValue,
  setTradeCategory,
  deleteTradeCategory,
  setTradeValue,
  deleteTradeValue,
  parseTradeField,
  getTradeValueByPath,
  setTradeValueByPath,
  isTradeFieldData,
  isTradeData,
  getQuantityValue,
  isValidQuantitySubField,
} from '@/lib/utils/tradeDataHelpers';
import type { TradeData } from '@/lib/types';

describe('tradeDataHelpers', () => {
  // ============================================
  // Basic getters/setters
  // ============================================

  describe('getTradeCategory', () => {
    it('should return the category data', () => {
      const trades: TradeData = { gangForm: { areaM2: 100 } };
      expect(getTradeCategory(trades, 'gangForm')).toEqual({ areaM2: 100 });
    });

    it('should return undefined for missing category', () => {
      const trades: TradeData = {};
      expect(getTradeCategory(trades, 'gangForm')).toBeUndefined();
    });
  });

  describe('getTradeValue', () => {
    it('should return the sub-field value', () => {
      const trades: TradeData = { gangForm: { areaM2: 100 } };
      expect(getTradeValue(trades, 'gangForm', 'areaM2')).toBe(100);
    });

    it('should return undefined for missing category', () => {
      expect(getTradeValue({}, 'gangForm', 'areaM2')).toBeUndefined();
    });

    it('should return undefined for missing sub-field', () => {
      const trades: TradeData = { gangForm: {} };
      expect(getTradeValue(trades, 'gangForm', 'areaM2')).toBeUndefined();
    });
  });

  describe('setTradeCategory', () => {
    it('should set the category data', () => {
      const trades: TradeData = {};
      setTradeCategory(trades, 'gangForm', { areaM2: 200 });
      expect(trades.gangForm).toEqual({ areaM2: 200 });
    });
  });

  describe('deleteTradeCategory', () => {
    it('should remove the category', () => {
      const trades: TradeData = { gangForm: { areaM2: 100 } };
      deleteTradeCategory(trades, 'gangForm');
      expect(trades.gangForm).toBeUndefined();
    });
  });

  describe('setTradeValue', () => {
    it('should set a sub-field value', () => {
      const trades: TradeData = {};
      setTradeValue(trades, 'rebar', 'ton', 50);
      expect(trades.rebar).toEqual({ ton: 50 });
    });

    it('should create the category if missing', () => {
      const trades: TradeData = {};
      setTradeValue(trades, 'concrete', 'volumeM3', 30);
      expect(trades.concrete).toEqual({ volumeM3: 30 });
    });

    it('should preserve existing sub-fields', () => {
      const trades: TradeData = { rebar: { ton: 50 } };
      setTradeValue(trades, 'rebar', 'wall', 25);
      expect(trades.rebar).toEqual({ ton: 50, wall: 25 });
    });
  });

  describe('deleteTradeValue', () => {
    it('should remove a sub-field value', () => {
      const trades: TradeData = { rebar: { ton: 50, wall: 25 } };
      deleteTradeValue(trades, 'rebar', 'wall');
      expect(trades.rebar).toEqual({ ton: 50 });
    });

    it('should handle missing category gracefully', () => {
      const trades: TradeData = {};
      deleteTradeValue(trades, 'rebar', 'wall');
      expect(trades.rebar).toBeUndefined();
    });
  });

  // ============================================
  // Path-based access
  // ============================================

  describe('parseTradeField', () => {
    it('should parse dotted path', () => {
      expect(parseTradeField('gangForm.areaM2')).toEqual({ category: 'gangForm', subField: 'areaM2' });
    });

    it('should handle single segment', () => {
      expect(parseTradeField('gangForm')).toEqual({ category: 'gangForm' });
    });
  });

  describe('getTradeValueByPath', () => {
    it('should get value by dotted path', () => {
      const trades: TradeData = { gangForm: { areaM2: 100 } };
      expect(getTradeValueByPath(trades, 'gangForm.areaM2')).toBe(100);
    });

    it('should return undefined for missing path', () => {
      expect(getTradeValueByPath({}, 'gangForm.areaM2')).toBeUndefined();
    });
  });

  describe('setTradeValueByPath', () => {
    it('should set value by dotted path', () => {
      const trades: TradeData = {};
      setTradeValueByPath(trades, 'gangForm.areaM2', 100);
      expect(trades.gangForm).toEqual({ areaM2: 100 });
    });

    it('should delete sub-field when value is null', () => {
      const trades: TradeData = { gangForm: { areaM2: 100 } };
      setTradeValueByPath(trades, 'gangForm.areaM2', null);
      expect(trades.gangForm?.areaM2).toBeUndefined();
    });

    it('should delete entire category when value is null and no sub-field', () => {
      const trades: TradeData = { gangForm: { areaM2: 100 } };
      setTradeValueByPath(trades, 'gangForm', null);
      expect(trades.gangForm).toBeUndefined();
    });
  });

  // ============================================
  // Type guards
  // ============================================

  describe('isTradeFieldData', () => {
    it('should accept valid trade field data', () => {
      expect(isTradeFieldData({ areaM2: 100 })).toBe(true);
      expect(isTradeFieldData({ ton: 50, wall: 25 })).toBe(true);
      expect(isTradeFieldData({})).toBe(true);
    });

    it('should reject non-objects', () => {
      expect(isTradeFieldData(null)).toBe(false);
      expect(isTradeFieldData(42)).toBe(false);
      expect(isTradeFieldData('string')).toBe(false);
      expect(isTradeFieldData([])).toBe(false);
    });

    it('should reject objects with non-number values for known keys', () => {
      expect(isTradeFieldData({ areaM2: 'not a number' })).toBe(false);
    });
  });

  describe('isTradeData', () => {
    it('should accept valid trade data', () => {
      expect(isTradeData({ gangForm: { areaM2: 100 } })).toBe(true);
      expect(isTradeData({})).toBe(true);
    });

    it('should reject non-objects', () => {
      expect(isTradeData(null)).toBe(false);
      expect(isTradeData(42)).toBe(false);
    });
  });

  // ============================================
  // Quantity helpers
  // ============================================

  describe('isValidQuantitySubField', () => {
    it('should accept valid quantity sub-fields', () => {
      expect(isValidQuantitySubField('areaM2')).toBe(true);
      expect(isValidQuantitySubField('ton')).toBe(true);
      expect(isValidQuantitySubField('volumeM3')).toBe(true);
    });

    it('should reject invalid sub-fields', () => {
      expect(isValidQuantitySubField('wall')).toBe(false);
      expect(isValidQuantitySubField('unknown')).toBe(false);
    });
  });

  describe('getQuantityValue', () => {
    it('should return the quantity value', () => {
      expect(getQuantityValue({ areaM2: 100 }, 'areaM2')).toBe(100);
    });

    it('should return 0 for undefined trade data', () => {
      expect(getQuantityValue(undefined, 'areaM2')).toBe(0);
    });

    it('should return 0 for missing sub-field', () => {
      expect(getQuantityValue({}, 'areaM2')).toBe(0);
    });

    it('should return 0 for invalid sub-field', () => {
      expect(getQuantityValue({ wall: 25 }, 'wall')).toBe(0);
    });
  });
});
