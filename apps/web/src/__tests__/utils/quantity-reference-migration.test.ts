import { parseLegacyReference } from '@/lib/utils/quantity-reference-migration';
import type { SemanticQuantityReference } from '@/lib/types/process-quantity';

describe('parseLegacyReference', () => {
  describe('category references (버림, 기초)', () => {
    it('should parse D6 as blinding formwork', () => {
      const result = parseLegacyReference('D6', '버림');
      expect(result).toEqual<SemanticQuantityReference>({
        tradeField: 'formwork',
        subField: 'areaM2',
        ratio: 1,
        sourceType: 'category',
        tradeGroup: '버림',
      });
    });

    it('should parse G6 as blinding concrete', () => {
      const result = parseLegacyReference('G6', '버림');
      expect(result).toEqual<SemanticQuantityReference>({
        tradeField: 'concrete',
        subField: 'volumeM3',
        ratio: 1,
        sourceType: 'category',
        tradeGroup: '버림',
      });
    });

    it('should parse F7 as foundation rebar', () => {
      const result = parseLegacyReference('F7', '기초');
      expect(result).toEqual<SemanticQuantityReference>({
        tradeField: 'rebar',
        subField: 'ton',
        ratio: 1,
        sourceType: 'category',
        tradeGroup: '기초',
      });
    });

    it('should parse G7 as foundation concrete', () => {
      const result = parseLegacyReference('G7', '기초');
      expect(result).toEqual<SemanticQuantityReference>({
        tradeField: 'concrete',
        subField: 'volumeM3',
        ratio: 1,
        sourceType: 'category',
        tradeGroup: '기초',
      });
    });
  });

  describe('floor references with ratio', () => {
    it('should parse B14*0.45 as gangForm floor reference', () => {
      const result = parseLegacyReference('B14*0.45', '기준층');
      expect(result).toEqual<SemanticQuantityReference>({
        tradeField: 'gangForm',
        subField: 'areaM2',
        ratio: 0.45,
        sourceType: 'floor',
      });
    });

    it('should parse F14*0.5 as rebar floor reference', () => {
      const result = parseLegacyReference('F14*0.5', '기준층');
      expect(result).toEqual<SemanticQuantityReference>({
        tradeField: 'rebar',
        subField: 'ton',
        ratio: 0.5,
        sourceType: 'floor',
      });
    });

    it('should parse C11*0.55 as alForm floor reference', () => {
      const result = parseLegacyReference('C11*0.55', '셋팅층');
      expect(result).toEqual<SemanticQuantityReference>({
        tradeField: 'alForm',
        subField: 'areaM2',
        ratio: 0.55,
        sourceType: 'floor',
      });
    });

    it('should parse G14 as concrete floor reference (ratio=1)', () => {
      const result = parseLegacyReference('G14', '기준층');
      expect(result).toEqual<SemanticQuantityReference>({
        tradeField: 'concrete',
        subField: 'volumeM3',
        ratio: 1,
        sourceType: 'floor',
      });
    });

    it('should parse D8*0.95 as formwork floor reference', () => {
      const result = parseLegacyReference('D8*0.95', '주동 지하층');
      expect(result).toEqual<SemanticQuantityReference>({
        tradeField: 'formwork',
        subField: 'areaM2',
        ratio: 0.95,
        sourceType: 'floor',
      });
    });

    it('should parse U column as euroForm', () => {
      const result = parseLegacyReference('U14', '기준층');
      expect(result).toEqual<SemanticQuantityReference>({
        tradeField: 'euroForm',
        subField: 'areaM2',
        ratio: 1,
        sourceType: 'floor',
      });
    });
  });

  describe('combined B1+B2 references', () => {
    it('should parse F_B1B2_COMBINED as combined rebar', () => {
      const result = parseLegacyReference('F_B1B2_COMBINED', '지하층(층고6.5m이상)');
      expect(result).toEqual<SemanticQuantityReference>({
        tradeField: 'rebar',
        subField: 'ton',
        ratio: 1,
        sourceType: 'combined',
        combineFloors: ['B1', 'B2'],
      });
    });

    it('should parse D_B1B2_COMBINED as combined formwork', () => {
      const result = parseLegacyReference('D_B1B2_COMBINED', '지하층(층고6.5m이상)');
      expect(result).toEqual<SemanticQuantityReference>({
        tradeField: 'formwork',
        subField: 'areaM2',
        ratio: 1,
        sourceType: 'combined',
        combineFloors: ['B1', 'B2'],
      });
    });

    it('should parse G_B1B2_COMBINED as combined concrete', () => {
      const result = parseLegacyReference('G_B1B2_COMBINED', '지하층(층고6.5m이상)');
      expect(result).toEqual<SemanticQuantityReference>({
        tradeField: 'concrete',
        subField: 'volumeM3',
        ratio: 1,
        sourceType: 'combined',
        combineFloors: ['B1', 'B2'],
      });
    });
  });

  describe('edge cases', () => {
    it('should return null for undefined reference', () => {
      expect(parseLegacyReference(undefined, '기준층')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseLegacyReference('', '기준층')).toBeNull();
    });

    it('should return null for composite references (E14+E16)', () => {
      expect(parseLegacyReference('E14+E16', '기준층')).toBeNull();
    });

    it('should return null for invalid column letter', () => {
      expect(parseLegacyReference('X14', '기준층')).toBeNull();
    });

    it('should return null for unparseable patterns', () => {
      expect(parseLegacyReference('invalid', '기준층')).toBeNull();
    });
  });
});
