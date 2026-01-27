import { MemoryCache, createCacheKey, DEFAULT_TTL, SHORT_TTL, LONG_TTL } from '@/lib/services/cache';

// Mock logger to avoid console output during tests
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('MemoryCache', () => {
  let cache: MemoryCache<string>;

  beforeEach(() => {
    cache = new MemoryCache<string>({ name: 'test-cache' });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('set and get', () => {
    it('should store and retrieve data', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for non-existent key', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should return null for expired entry', () => {
      cache.set('key1', 'value1', 1000); // 1 second TTL

      // Advance time by 1.5 seconds
      jest.advanceTimersByTime(1500);

      expect(cache.get('key1')).toBeNull();
    });

    it('should return data before TTL expires', () => {
      cache.set('key1', 'value1', 5000); // 5 second TTL

      // Advance time by 4 seconds
      jest.advanceTimersByTime(4000);

      expect(cache.get('key1')).toBe('value1');
    });
  });

  describe('invalidate', () => {
    it('should remove specific key', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.invalidate('key1');

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });
  });

  describe('invalidateAll', () => {
    it('should remove all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.invalidateAll();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.size()).toBe(0);
    });
  });

  describe('getOrFetch', () => {
    it('should return cached value if available', async () => {
      cache.set('key1', 'cached-value');
      const fetcher = jest.fn().mockResolvedValue('fetched-value');

      const result = await cache.getOrFetch('key1', fetcher);

      expect(result).toBe('cached-value');
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should call fetcher and cache result if not cached', async () => {
      const fetcher = jest.fn().mockResolvedValue('fetched-value');

      const result = await cache.getOrFetch('key1', fetcher);

      expect(result).toBe('fetched-value');
      expect(fetcher).toHaveBeenCalled();
      expect(cache.get('key1')).toBe('fetched-value');
    });
  });

  describe('keys and size', () => {
    it('should return all keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      expect(cache.keys()).toEqual(['key1', 'key2']);
    });

    it('should return correct size', () => {
      expect(cache.size()).toBe(0);
      cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      cache.set('key1', 'value1', 1000);
      cache.set('key2', 'value2', 5000);

      jest.advanceTimersByTime(2000);
      cache.cleanup();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });
  });
});

describe('createCacheKey', () => {
  it('should create key with prefix and params', () => {
    expect(createCacheKey('projects', 'list', 1)).toBe('projects:list:1');
  });

  it('should filter out undefined params', () => {
    expect(createCacheKey('projects', 'list', undefined, 'active')).toBe('projects:list:active');
  });

  it('should work with prefix only', () => {
    expect(createCacheKey('projects')).toBe('projects:');
  });
});

describe('TTL constants', () => {
  it('should have correct values', () => {
    expect(DEFAULT_TTL).toBe(5 * 60 * 1000); // 5 minutes
    expect(SHORT_TTL).toBe(1 * 60 * 1000);   // 1 minute
    expect(LONG_TTL).toBe(15 * 60 * 1000);   // 15 minutes
  });
});
