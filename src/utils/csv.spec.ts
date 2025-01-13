import {
  complexCartesianProduct,
  generateCombinationsWithLimit,
  parseCSV,
  extractKeys,
  formatVariables,
  cartesianProduct,
} from './csv';

describe('CSV Utility Functions', () => {
  describe('complexCartesianProduct', () => {
    it('should generate correct combinations for simple input', () => {
      const input = [
        [1, 2],
        ['a', 'b'],
      ];
      const result = complexCartesianProduct<number | string>(input);
      expect(result).toEqual([
        [1, 'a'],
        [1, 'b'],
        [2, 'a'],
        [2, 'b'],
      ]);
    });

    it('should respect the limit parameter', () => {
      const input = [
        [1, 2, 3],
        ['a', 'b', 'c'],
        [true, false],
      ];
      const result = complexCartesianProduct<number | string | boolean>(input, 5);
      expect(result.length).toBe(5);
    });

    it('should handle empty input arrays', () => {
      const input: any[][] = [];
      const result = complexCartesianProduct(input);
      expect(result).toEqual([]);
    });

    it('should handle input with empty sub-arrays', () => {
      const input = [[1, 2], ['a', 'b'], []];
      const result = complexCartesianProduct<number | string>(input);
      expect(result).toEqual([
        [1, 'a'],
        [1, 'b'],
        [2, 'a'],
        [2, 'b'],
      ]);
    });

    it('should handle large input without exceeding memory limits', () => {
      const largeInput = Array(10).fill([1, 2, 3, 4, 5]);
      const result = complexCartesianProduct<number>(largeInput, 1000000);
      expect(result.length).toBe(1000000);
    });
  });

  describe('generateCombinationsWithLimit', () => {
    const limit = 10;
    it('should generate combinations from input array', () => {
      const input = ['a', 'b', 'c'];
      const result = generateCombinationsWithLimit(input, limit);

      // Check that results are arrays of strings from input
      expect(result.length).toBeGreaterThan(0);
      expect(
        result.every((combo) => {
          return Array.isArray(combo) && combo.length > 0 && combo.every((item) => input.includes(item));
        }),
      ).toBe(true);
    });

    it('should respect the limit parameter', () => {
      const input = ['a', 'b', 'c', 'd', 'e'];
      const result = generateCombinationsWithLimit(input, limit);
      expect(result.length).toBeLessThanOrEqual(limit);
    });

    it('should generate unique combinations', () => {
      const input = ['a', 'b', 'c'];
      const result = generateCombinationsWithLimit(input, limit);

      const uniqueCombos = new Set(result.map((combo) => JSON.stringify(combo.sort())));
      expect(uniqueCombos.size).toBe(result.length);
    });

    it('should handle empty input array', () => {
      const input: string[] = [];
      const result = generateCombinationsWithLimit(input, limit);
      expect(result).toEqual([]);
    });

    it('should handle single element input array', () => {
      const input = ['a'];
      const result = generateCombinationsWithLimit(input, limit);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(['a']);
    });

    it('should generate combinations of varying lengths', () => {
      const input = ['a', 'b', 'c', 'd'];
      const result = generateCombinationsWithLimit(input, limit);
      const hasVariableLengths = result.some((combo) => combo.length !== result[0].length);
      expect(hasVariableLengths).toBe(true);
    });
  });

  describe('parseCSV', () => {
    it('should parse CSV file to array of arrays', async () => {
      const file = { buffer: Buffer.from('a,b,c\n1,2,3\n4,5,6') } as Express.Multer.File;
      const result = await parseCSV(file);
      expect(result).toEqual([
        ['a', 'b', 'c'],
        ['1', '2', '3'],
        ['4', '5', '6'],
      ]);
    });
  });
  describe('parseCSV', () => {
    it('should parse CSV file to array of arrays', async () => {
      const file = { buffer: Buffer.from('a,b,c\n1,2,3\n4,5,6') } as Express.Multer.File;
      const result = await parseCSV(file);
      expect(result).toEqual([
        ['a', 'b', 'c'],
        ['1', '2', '3'],
        ['4', '5', '6'],
      ]);
    });
  });
  describe('extractKeys', () => {
    it('should extract keys based on prefix', () => {
      const headers = ['prefix_key1', 'prefix_key2', 'other_key'];
      const prefix = 'prefix_';
      const result = extractKeys(headers, prefix);
      expect(result).toEqual(['key1', 'key2']);
    });
  });
  describe('formatVariables', () => {
    it('should format variables from a CSV row', () => {
      const row = ['value1', 'value2'];
      const keys = ['key1', 'key2'];
      const startIndex = 0;
      const result = formatVariables(row, keys, startIndex);
      expect(result).toEqual([
        { name: 'key1', value: 'value1', type: 'string' },
        { name: 'key2', value: 'value2', type: 'string' },
      ]);
    });
    it('should format array values correctly', () => {
      const row = ['[1, 2, 3]', 'value2'];
      const keys = ['arrayKey', 'key2'];
      const startIndex = 0;
      const result = formatVariables(row, keys, startIndex);
      expect(result).toEqual([
        { name: 'arrayKey', value: ['1', '2', '3'], type: 'array' },
        { name: 'key2', value: 'value2', type: 'string' },
      ]);
    });
    it('should handle nested array indices', () => {
      const row = ['value1', 'value2', 'value3'];
      const keys = ['key1[1]', 'key2[2]', 'key3'];
      const startIndex = 0;
      const result = formatVariables(row, keys, startIndex);
      expect(result).toEqual([
        { name: 'key1', value: ['value1'], type: 'array' },
        { name: 'key2', value: ['value2'], type: 'array' },
        { name: 'key3', value: 'value3', type: 'string' },
      ]);
    });
    it('should filter out empty values when filterEmpty is true', () => {
      const row = ['value1', '', 'value2'];
      const keys = ['key1', 'key2', 'key3'];
      const startIndex = 0;
      const result = formatVariables(row, keys, startIndex, true);
      expect(result).toEqual([
        { name: 'key1', value: 'value1', type: 'string' },
        { name: 'key3', value: 'value2', type: 'string' },
      ]);
    });
  });
  describe('cartesianProduct', () => {
    it('should generate cartesian product of arrays', () => {
      const input = [
        [1, 2],
        ['a', 'b'],
      ];
      const result = cartesianProduct<number | string>(input);
      expect(result).toEqual([
        [1, 'a'],
        [1, 'b'],
        [2, 'a'],
        [2, 'b'],
      ]);
    });
  });
});
