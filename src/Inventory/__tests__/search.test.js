// src/Inventory/__tests__/search.test.js
// Tests for fuzzy search functionality

import { fuzzyMatch, highlightMatches, searchItems } from '../utils/search';

describe('Search Utils', () => {
  describe('fuzzyMatch', () => {
    it('should return 1 for exact matches', () => {
      expect(fuzzyMatch('test', 'test')).toBe(1);
      expect(fuzzyMatch('Hello', 'hello')).toBe(1);
    });

    it('should return high score for substring matches', () => {
      const score = fuzzyMatch('test', 'testing');
      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThan(1);
    });

    it('should return lower score for fuzzy matches', () => {
      const score = fuzzyMatch('tst', 'test');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(0.5);
    });

    it('should return 0 for non-matches', () => {
      expect(fuzzyMatch('abc', 'xyz')).toBe(0);
      expect(fuzzyMatch('test', 'no')).toBe(0);
    });

    it('should handle empty inputs', () => {
      expect(fuzzyMatch('', 'test')).toBe(0);
      expect(fuzzyMatch('test', '')).toBe(0);
      expect(fuzzyMatch('', '')).toBe(0);
    });

    it('should be case insensitive', () => {
      expect(fuzzyMatch('Test', 'test')).toBe(1);
      expect(fuzzyMatch('ABC', 'abc')).toBe(1);
    });
  });

  describe('highlightMatches', () => {
    it('should highlight exact substring matches', () => {
      const result = highlightMatches('test', 'testing');
      expect(result).toContain('<span class="bg-yellow-200">test</span>');
    });

    it('should highlight fuzzy matches', () => {
      const result = highlightMatches('tst', 'test');
      expect(result).toContain('<span');
      expect(result).toContain('</span>');
    });

    it('should return original text for no matches', () => {
      const result = highlightMatches('xyz', 'test');
      expect(result).toBe('test');
    });

    it('should handle empty pattern', () => {
      const result = highlightMatches('', 'test');
      expect(result).toBe('test');
    });

    it('should use custom class name', () => {
      const result = highlightMatches('test', 'testing', 'custom-highlight');
      expect(result).toContain('custom-highlight');
    });
  });

  describe('searchItems', () => {
    const testItems = [
      {
        id: '1',
        title: 'JavaScript Tutorial',
        notes: 'Learn JS basics',
        tags: ['programming', 'web']
      },
      {
        id: '2',
        title: 'React Components',
        notes: 'Building UI components',
        tags: ['react', 'frontend']
      },
      {
        id: '3',
        title: 'Node.js Backend',
        notes: 'Server-side development',
        tags: ['nodejs', 'backend']
      }
    ];

    it('should search by title', () => {
      const results = searchItems(testItems, 'JavaScript');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });

    it('should search by notes', () => {
      const results = searchItems(testItems, 'components');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('2');
    });

    it('should search by tags', () => {
      const results = searchItems(testItems, 'backend');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('3');
    });

    it('should return all items for empty query', () => {
      const results = searchItems(testItems, '');
      expect(results).toHaveLength(3);
    });

    it('should return empty array for no matches', () => {
      const results = searchItems(testItems, 'xyz123');
      expect(results).toHaveLength(0);
    });

    it('should handle fuzzy matching', () => {
      const results = searchItems(testItems, 'Javas'); // partial "JavaScript"
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('1');
    });

    it('should respect threshold option', () => {
      const results = searchItems(testItems, 'js', { threshold: 0.5 });
      expect(results).toHaveLength(0); // "js" vs "JavaScript" should be below 0.5
    });

    it('should respect maxResults option', () => {
      const results = searchItems(testItems, 'e', { maxResults: 1 });
      expect(results).toHaveLength(1);
    });

    it('should sort by relevance score', () => {
      // Add an item with exact title match
      const itemsWithExact = [
        ...testItems,
        {
          id: '4',
          title: 'React',
          notes: 'React library',
          tags: []
        }
      ];
      
      const results = searchItems(itemsWithExact, 'React');
      // Exact title match should come first
      expect(results[0].id).toBe('4');
    });
  });
});