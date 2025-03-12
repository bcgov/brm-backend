/**
 * Replace special characters in strings
 * @param input
 * @param replacement
 * @returns replaced string
 */
export const replaceSpecialCharacters = (input: string, replacement: string): string => {
  const specialChars = /[\n\r\t\f,]/g;
  return input.replace(specialChars, (match) => {
    if (match === ',') {
      return '-';
    }
    return replacement;
  });
};

/**
 * Compares two objects for equality
 * @param obj1 first object
 * @param obj2 second object
 * @returns true if equal, false otherwise
 */

export const isEqual = (obj1: any, obj2: any) => {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key) || !isEqual(obj1[key], obj2[key])) return false;
  }

  return true;
};

/**
 * Reduces an array of objects to a single object with cleaned keys and values mapped
 * @param arr Array of objects to reduce
 * @param keyName Name of the key to use for the reduced object keys
 * @param valueName Name of the key to use for the reduced object values
 * @param replacement Replacement string for special characters
 * @returns Reduced and cleaned object
 */
export const reduceToCleanObj = (
  arr: { [key: string]: any }[] | undefined | null,
  keyName: string,
  valueName: string,
  replacement: string = '',
): Record<string, any> => {
  if (!Array.isArray(arr)) {
    return {};
  }

  return arr.reduce((acc: Record<string, any>, obj: { [key: string]: any }) => {
    if (obj && typeof obj === 'object') {
      const cleanedKey = replaceSpecialCharacters(obj[keyName], replacement);
      acc[cleanedKey] = obj[valueName];
    }
    return acc;
  }, {});
};

//Filter out keys that have square brackets with the same base part (parent objects)
export const filterKeys = (keyArray: string[]) => {
  return keyArray.filter((key) => {
    const baseKey = key.split('[')[0];
    if (!key.includes('[')) {
      return !keyArray.some((otherKey) => otherKey.includes(baseKey + '['));
    }
    return true;
  });
};

/**
 * Extracts unique keys from a specified property.
 * @param object The object to extract keys from.
 * @param property The property to extract keys from ('inputs', 'outputs', 'expectedResults', etc.).
 * @returns An array of unique keys.
 */
export const extractUniqueKeys = (object: Record<string, any>, property: string): string[] => {
  const uniqueKeyArray = Array.from(
    new Set(
      Object.values(object).flatMap((each) => {
        if (each[property]) {
          return Object.keys(each[property]);
        }
        return [];
      }),
    ),
  );
  return filterKeys(uniqueKeyArray);
};

/**
 * Formats a value based on its type.
 * @param value The value to format.
 * @returns The formatted value.
 */
export const formatValue = (value: string): boolean | number | string | null => {
  if (value.toLowerCase() === 'true') {
    return true;
  } else if (value.toLowerCase() === 'false') {
    return false;
    // Check if the value matches the format yyyy-mm-dd
  } else if (/\d{4}-\d{2}-\d{2}/.test(value)) {
    return value;
  }
  const numberValue = parseFloat(value);
  if (!isNaN(numberValue)) {
    return numberValue;
  }
  if (value === '') {
    return null;
  }
  return value;
};

/**
 * Gets the "name" from the filepath
 * @param filepath
 * @returns The name
 */
export const deriveNameFromFilepath = (filepath: string): string => {
  return filepath.split('/').pop().replace('.json', '');
};

/**
 * Extract variables from template literals like `this is a variable name: ${variableName}`
 * @param expression Template string to extract variables from
 * @returns Array of variable names found in template literals
 */
export const extractTemplateVariables = (expression: string): string[] => {
  const templateVarRegex = /\${([a-zA-Z_][a-zA-Z0-9_]*)}/g;
  const matches = [];
  let match: RegExpExecArray | null;

  while ((match = templateVarRegex.exec(expression)) !== null) {
    matches.push(match[1]);
  }

  return matches;
};

/**
 * Extract variables from expressions including ternary operators and other patterns
 * @param expression code string to extract variables from
 * @returns Array of variable names found in the expression
 */
export const extractExpressionVariables = (expression: string): string[] => {
  if (!expression) return [];

  const variableRegex = /[a-zA-Z_][a-zA-Z0-9_]*/g;
  const keywords = new Set([
    'if',
    'else',
    'return',
    'var',
    'let',
    'const',
    'function',
    'true',
    'false',
    'null',
    'undefined',
    'this',
    'new',
    'class',
    'switch',
    'case',
    'default',
    'break',
    'continue',
    'for',
    'while',
    'do',
    'in',
    'of',
    'try',
    'catch',
    'finally',
    'typeof',
    'instanceof',
    'void',
    'delete',
    'throw',
    'with',
    'root',
    'and',
    'or',
    'not',
    'is',
    'in',
    'keys',
    'values',
    'split',
  ]);
  const functionNames = new Set([
    'none',
    'map',
    'flatMap',
    'filter',
    'some',
    'all',
    'one',
    'count',
    'contains',
    'flatten',
    'sum',
    'avg',
    'min',
    'max',
    'mean',
    'mode',
    'len',
    'date',
    'startOf',
    'endOf',
    'duration',
    'time',
    'year',
    'month',
    'monthOfYear',
    'dayOfWeek',
    'dayOfMonth',
    'dayOfYear',
    'weekOfMonth',
    'weekOfYear',
    'seasonOfYear',
    'monthString',
    'weekdayString',
    'dateString',
    'upper',
    'lower',
    'startsWith',
    'endsWith',
    'matches',
    'extract',
    'string',
    'number',
    'bool',
    'array',
    'object',
    'abs',
    'ceil',
    'floor',
    'round',
    'rand',
    'isNumeric',
    'extract',
    'type',
    'trim',
    'fuzzyMatch',
  ]);
  const templateVars = extractTemplateVariables(expression);

  const extractSpecialPatternVariables = (expr: string): string[] => {
    const specialVars: string[] = [];
    const funcCallRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    let match: RegExpExecArray | null;
    while ((match = funcCallRegex.exec(expr)) !== null) {
      const name = match[1];
      if (!functionNames.has(name) && !keywords.has(name)) {
        specialVars.push(name);
      }
    }
    const propAccessRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\.[a-zA-Z_][a-zA-Z0-9_]*/g;
    while ((match = propAccessRegex.exec(expr)) !== null) {
      if (match[1] !== '#' && !keywords.has(match[1])) {
        specialVars.push(match[1]);
      }
    }
    return specialVars;
  };

  // Find property names used in object literals
  // example: { key: value }
  const findPropertyAssignments = (expr: string): Set<string> => {
    const properties = new Set<string>();
    const objectRegex = /{([^{}]*?)}/g;
    let objMatch: RegExpExecArray | null;
    while ((objMatch = objectRegex.exec(expr)) !== null) {
      const inner = objMatch[1];
      const propRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
      let propMatch: RegExpExecArray | null;
      while ((propMatch = propRegex.exec(inner)) !== null) {
        properties.add(propMatch[1]);
      }
    }
    return properties;
  };

  const propertyAssignments = findPropertyAssignments(expression);

  // Identify ranges for all string literals
  // includes: (backticks, single and double quotes)
  const stringRanges: [number, number][] = [];
  let inString: boolean = false;
  let stringStart = 0;
  let currentQuote = '';
  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];
    const prevChar = i > 0 ? expression[i - 1] : '';
    if (!inString && (char === '`' || char === "'" || char === '"')) {
      inString = true;
      currentQuote = char;
      stringStart = i;
    } else if (inString && char === currentQuote && prevChar !== '\\') {
      stringRanges.push([stringStart, i]);
      inString = false;
      currentQuote = '';
    }
  }
  if (inString) {
    stringRanges.push([stringStart, expression.length - 1]);
  }
  const isInString = (pos: number): boolean => stringRanges.some(([start, end]) => pos > start && pos < end);

  const matches: string[] = [];
  let varMatch: RegExpExecArray | null;
  while ((varMatch = variableRegex.exec(expression)) !== null) {
    const name = varMatch[0];
    const pos = varMatch.index;
    const isHashProp = pos > 1 && expression[pos - 2] === '#' && expression[pos - 1] === '.';
    if (
      !keywords.has(name) &&
      !functionNames.has(name) &&
      !isInString(pos) &&
      !isHashProp &&
      !propertyAssignments.has(name)
    ) {
      matches.push(name);
    }
  }

  // Combine and return unique variables
  return Array.from(new Set([...matches, ...extractSpecialPatternVariables(expression), ...templateVars]));
};
