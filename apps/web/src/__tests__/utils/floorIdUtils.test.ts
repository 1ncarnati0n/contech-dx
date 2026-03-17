import {
  createSpecialFloorId,
  isSpecialFloorId,
  parseSpecialFloorId,
  createDummyFloorId,
  isDummyFloorId,
  parseDummyFloorId,
  createRangedFloorId,
  isRangedFloorId,
  parseRangedFloorId,
  isUUID,
  isValidFloorId,
  getFloorIdType,
} from '@/features/building/utils/floorIdUtils';

const SAMPLE_UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('floorIdUtils', () => {
  // ============================================
  // Special floor IDs (버림/기초)
  // ============================================

  describe('createSpecialFloorId', () => {
    it('should create a special floor ID with correct format', () => {
      expect(createSpecialFloorId(SAMPLE_UUID, '버림')).toBe(`group-${SAMPLE_UUID}-버림`);
    });

    it('should handle different trade groups', () => {
      expect(createSpecialFloorId(SAMPLE_UUID, '기초')).toBe(`group-${SAMPLE_UUID}-기초`);
    });
  });

  describe('isSpecialFloorId', () => {
    it('should return true for special floor IDs', () => {
      expect(isSpecialFloorId(`group-${SAMPLE_UUID}-버림`)).toBe(true);
    });

    it('should return false for non-special floor IDs', () => {
      expect(isSpecialFloorId(SAMPLE_UUID)).toBe(false);
      expect(isSpecialFloorId('dummy-2F')).toBe(false);
    });
  });

  describe('parseSpecialFloorId', () => {
    it('should parse a standard special floor ID', () => {
      const result = parseSpecialFloorId(`group-${SAMPLE_UUID}-버림`);
      expect(result).toEqual({ buildingId: SAMPLE_UUID, tradeGroup: '버림' });
    });

    it('should handle legacy format without buildingId', () => {
      const result = parseSpecialFloorId('group-버림');
      expect(result).toEqual({ buildingId: '', tradeGroup: '버림' });
    });

    it('should return null for non-special floor IDs', () => {
      expect(parseSpecialFloorId(SAMPLE_UUID)).toBeNull();
    });
  });

  // ============================================
  // Dummy floor IDs
  // ============================================

  describe('createDummyFloorId', () => {
    it('should create a dummy floor ID', () => {
      expect(createDummyFloorId(2)).toBe('dummy-2F');
      expect(createDummyFloorId(14)).toBe('dummy-14F');
    });
  });

  describe('isDummyFloorId', () => {
    it('should return true for dummy floor IDs', () => {
      expect(isDummyFloorId('dummy-2F')).toBe(true);
      expect(isDummyFloorId('dummy-14F')).toBe(true);
    });

    it('should return false for non-dummy floor IDs', () => {
      expect(isDummyFloorId(SAMPLE_UUID)).toBe(false);
      expect(isDummyFloorId(`group-${SAMPLE_UUID}-버림`)).toBe(false);
    });
  });

  describe('parseDummyFloorId', () => {
    it('should parse a valid dummy floor ID', () => {
      expect(parseDummyFloorId('dummy-2F')).toBe(2);
      expect(parseDummyFloorId('dummy-14F')).toBe(14);
    });

    it('should return null for invalid formats', () => {
      expect(parseDummyFloorId(SAMPLE_UUID)).toBeNull();
      expect(parseDummyFloorId('dummy-')).toBeNull();
      expect(parseDummyFloorId('dummy-abcF')).toBeNull();
    });
  });

  // ============================================
  // Ranged floor IDs (UUID-NF)
  // ============================================

  describe('createRangedFloorId', () => {
    it('should create a ranged floor ID', () => {
      expect(createRangedFloorId(SAMPLE_UUID, 3)).toBe(`${SAMPLE_UUID}-3F`);
    });
  });

  describe('isRangedFloorId', () => {
    it('should return true for valid ranged floor IDs', () => {
      expect(isRangedFloorId(`${SAMPLE_UUID}-3F`)).toBe(true);
      expect(isRangedFloorId(`${SAMPLE_UUID}-14F`)).toBe(true);
    });

    it('should return false for non-ranged floor IDs', () => {
      expect(isRangedFloorId(SAMPLE_UUID)).toBe(false);
      expect(isRangedFloorId('dummy-2F')).toBe(false);
      expect(isRangedFloorId(`group-${SAMPLE_UUID}-버림`)).toBe(false);
    });
  });

  describe('parseRangedFloorId', () => {
    it('should parse a valid ranged floor ID', () => {
      const result = parseRangedFloorId(`${SAMPLE_UUID}-3F`);
      expect(result).toEqual({ baseId: SAMPLE_UUID, floorNum: 3 });
    });

    it('should return null for non-ranged floor IDs', () => {
      expect(parseRangedFloorId(SAMPLE_UUID)).toBeNull();
      expect(parseRangedFloorId('dummy-2F')).toBeNull();
    });
  });

  // ============================================
  // General utilities
  // ============================================

  describe('isUUID', () => {
    it('should return true for valid UUIDs', () => {
      expect(isUUID(SAMPLE_UUID)).toBe(true);
      expect(isUUID('AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(isUUID('not-a-uuid')).toBe(false);
      expect(isUUID('dummy-2F')).toBe(false);
      expect(isUUID('')).toBe(false);
    });
  });

  describe('isValidFloorId', () => {
    it('should accept all valid floor ID formats', () => {
      expect(isValidFloorId(SAMPLE_UUID)).toBe(true);                         // regular
      expect(isValidFloorId(`${SAMPLE_UUID}-3F`)).toBe(true);                 // ranged
      expect(isValidFloorId('dummy-2F')).toBe(true);                          // dummy
      expect(isValidFloorId(`group-${SAMPLE_UUID}-버림`)).toBe(true);          // special
    });

    it('should reject invalid floor IDs', () => {
      expect(isValidFloorId('random-string')).toBe(false);
      expect(isValidFloorId('')).toBe(false);
    });
  });

  describe('getFloorIdType', () => {
    it('should correctly identify each floor ID type', () => {
      expect(getFloorIdType(SAMPLE_UUID)).toBe('regular');
      expect(getFloorIdType(`${SAMPLE_UUID}-3F`)).toBe('ranged');
      expect(getFloorIdType('dummy-2F')).toBe('dummy');
      expect(getFloorIdType(`group-${SAMPLE_UUID}-버림`)).toBe('special');
      expect(getFloorIdType('unknown-id')).toBe('unknown');
    });
  });
});
