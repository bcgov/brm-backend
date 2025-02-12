import csvParser from 'csv-parser';
import { formatValue, filterKeys } from './helpers';
import { ScenarioData, Variable } from '../api/scenarioData/scenarioData.schema';

/**
 * Parses CSV file to an array of arrays
 * @param file csv file
 * @returns array of arrays
 */
export const parseCSV = async (file: Express.Multer.File | undefined): Promise<string[][]> => {
  return new Promise((resolve, reject) => {
    const results: string[][] = [];
    const stream = csvParser({ headers: false });

    stream.on('data', (data) => results.push(Object.values(data)));
    stream.on('end', () => resolve(results));
    stream.on('error', (error) => reject(error));

    stream.write(file.buffer);
    stream.end();
  });
};

export const getScenariosFromParsedCSV = (parsedData: string[][], filepath: string): ScenarioData[] => {
  if (!parsedData || parsedData.length === 0) {
    throw new Error('CSV content is empty or invalid');
  }

  const headers = parsedData[0];

  const inputKeys = extractKeys(headers, 'Input: ') || [];
  const expectedResultsKeys = extractKeys(headers, 'Expected Result: ') || [];

  const scenarios: ScenarioData[] = [];

  parsedData.slice(1).forEach((row) => {
    const scenarioTitle = row[0];

    const inputs = formatVariables(row, inputKeys, 2);
    const expectedResultsStartIndex = 2 + inputKeys.length;
    const expectedResults = formatVariables(row, expectedResultsKeys, expectedResultsStartIndex, true);

    const scenario: ScenarioData = {
      title: scenarioTitle,
      ruleID: '',
      variables: inputs,
      filepath: filepath,
      expectedResults: expectedResults,
    };

    scenarios.push(scenario);
  });

  return scenarios;
};

/**
 * Extracts keys from headers based on a given prefix.
 * @param headers The CSV headers.
 * @param prefix The prefix to filter and remove from headers.
 * @returns An array of extracted keys.
 */
export const extractKeys = (headers: string[], prefix: string): string[] => {
  return headers.filter((header) => header.startsWith(prefix)).map((header) => header.replace(prefix, ''));
};

/**
 * Formats the variables from a CSV row based on provided keys.
 * @param row The CSV row data.
 * @param keys The keys to extract values for.
 * @param startIndex The start index in the row to begin extraction.
 * @param filterEmpty Whether to filter out empty values.
 * @returns An array of formatted variables.
 */
export const formatVariables = (row: string[], keys: string[], startIndex: number, filterEmpty = false): Variable[] => {
  const result: { [key: string]: any } = {};
  filterKeys(keys).forEach((key, index) => {
    const value = row[startIndex + index] ? formatValue(row[startIndex + index]) : null;
    if (filterEmpty && (value === null || value === undefined || value === '')) {
      return;
    }

    const parts = key.match(/^([^\[]+)(?:\[(\d+)\])?(.*)$/);
    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      const valueToArray = value.slice(1, value.length - 1).split(', ');
      result[key] = valueToArray;
    } else if (parts) {
      const [, baseKey, arrayIndex, remainingKey] = parts;

      if (!result[baseKey]) {
        result[baseKey] = arrayIndex ? [] : {};
      }

      if (arrayIndex) {
        const idx = parseInt(arrayIndex, 10) - 1;
        if (!result[baseKey][idx]) {
          result[baseKey][idx] = {};
        }
        if (remainingKey) {
          result[baseKey][idx][remainingKey] = value;
        } else {
          result[baseKey][idx] = value;
        }
      } else if (remainingKey) {
        result[baseKey][remainingKey] = value;
      } else {
        result[baseKey] = value;
      }
    } else {
      result[key] = value;
    }
  });

  return Object.entries(result).map(([name, value]) => ({
    name,
    value: Array.isArray(value) ? value.filter((v) => v !== undefined) : value,
    type: Array.isArray(value) ? 'array' : typeof value,
  }));
};

/**
 * Generates a cartesian product of arrays.
 * @param arrays The arrays to generate the product from.
 * @returns The generated product.
 */
export const cartesianProduct = <T>(arrays: T[][]): T[][] => {
  return arrays.reduce((a, b) => a.flatMap((d) => b.map((e) => [...d, e])), [[]]);
};

/**
 * Generates a cartesian product of arrays in a more memory-efficient way, with the ability to adjust the maximum number of combinations.
 * @param arrays The arrays to generate the product from.
 * @param limit The maximum number of combinations to generate.
 * @returns The generated product.
 */
export const complexCartesianProduct = <T>(arrays: T[][], limit: number = 3000): T[][] => {
  const result: T[][] = [];
  const maxIndex = arrays.map((arr) => arr.length - 1);
  const indices = new Array(arrays.length).fill(0);

  while (indices[0] <= maxIndex[0] && result.length < limit) {
    result.push(indices.map((index, i) => arrays[i][index]));

    let currentDimension = indices.length - 1;
    while (currentDimension >= 0) {
      if (indices[currentDimension] < maxIndex[currentDimension]) {
        indices[currentDimension]++;
        break;
      } else {
        indices[currentDimension] = 0;
        currentDimension--;
      }
    }

    if (currentDimension < 0) break;
  }

  return result;
};

/**
 * Generates random combinations of items from an array with varying lengths.
 * @param arr The input array to generate combinations from.
 * @param limit The maximum number of combinations to generate (default: 1000).
 * @returns Array of combinations, each containing 1 to n items from the input array.
 */
export const generateCombinationsWithLimit = (arr: string[], limit: number = 1000): string[][] => {
  const result: string[][] = [];
  if (arr.length == 0) return result;
  const getRandomItems = (items: string[], minCount: number = 1): string[] => {
    const count = Math.floor(Math.random() * (items.length - minCount + 1)) + minCount;
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  while (result.length < limit) {
    const combination = getRandomItems(arr);

    // Check for combination uniqueness
    const combinationStr = JSON.stringify(combination.sort());
    if (!result.some((existing) => JSON.stringify(existing.sort()) === combinationStr)) {
      result.push(combination);
    }

    // Break if no more unique combinations
    if (result.length === Math.pow(2, arr.length) - 1) break;
  }

  return result;
};
