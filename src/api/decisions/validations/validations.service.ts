import { Injectable } from '@nestjs/common';
import { ValidationError } from './validation.error';

@Injectable()
export class ValidationService {
  validateInputs(ruleContent: any, context: Record<string, any>): void {
    if (typeof ruleContent !== 'object' || !Array.isArray(ruleContent.fields)) {
      return;
    }

    const errors: string[] = [];

    for (const field of ruleContent.fields) {
      try {
        this.validateField(field, context);
      } catch (e) {
        errors.push(e.message);
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(`${errors.join('; ')}`);
    }
  }

  private validateField(field: any, context: Record<string, any>): void {
    if (!field.field || typeof field.field !== 'string') {
      throw new ValidationError(`Invalid field definition: ${JSON.stringify(field)}`);
    }

    if (!(field.field in context)) {
      return;
    }

    const input = context[field.field];

    if (input === null || input === undefined) {
      return;
    }

    this.validateType(field, input);
    this.validateCriteria(field, input);

    if (Array.isArray(field.childFields)) {
      for (const childField of field.childFields) {
        this.validateField(childField, input);
      }
    }
  }

  private validateType(field: any, input: any): void {
    const { dataType, type, validationType } = field;
    const actualType = typeof input;

    switch (type || dataType) {
      case 'number-input':
        if (typeof input !== 'number' && validationType !== '[=nums]') {
          throw new ValidationError(`Input ${field.field} should be a number, but got ${actualType}`);
        } else if (validationType === '[=nums]' && !Array.isArray(input)) {
          throw new ValidationError(`Input ${field.field} should be an array of numbers, but got ${actualType}`);
        }
        break;
      case 'date':
        if (validationType === '[=dates]') {
          if (!Array.isArray(input) || !input.every((date) => !isNaN(Date.parse(date)))) {
            throw new ValidationError(
              `Input ${field.field} should be an array of valid date strings, but got ${JSON.stringify(input)}`,
            );
          }
        } else if (typeof input !== 'string' || isNaN(Date.parse(input))) {
          throw new ValidationError(`Input ${field.field} should be a valid date string, but got ${input}`);
        }
        break;
      case 'text-input':
        if (typeof input !== 'string' && validationType !== '[=texts]') {
          throw new ValidationError(`Input ${field.field} should be a string, but got ${actualType}`);
        } else if (validationType === '[=texts]' && !Array.isArray(input)) {
          throw new ValidationError(`Input ${field.field} should be an array of strings, but got ${actualType}`);
        }
        break;
      case 'true-false':
        if (typeof input !== 'boolean') {
          throw new ValidationError(`Input ${field.field} should be a boolean, but got ${actualType}`);
        }
        break;
      case 'object-array':
        if (!Array.isArray(input) || !input.every((obj) => typeof obj === 'object')) {
          throw new ValidationError(`Input ${field.field} should be an array of objects, but got ${actualType}`);
        }
        break;
      default:
        throw new ValidationError(`Unsupported data type: ${dataType}`);
    }
  }

  private validateCriteria(field: any, input: any): void {
    const { dataType, type } = field;

    switch (type || dataType) {
      case 'number-input':
        this.validateNumberCriteria(field, input);
        break;
      case 'date':
        this.validateDateCriteria(field, input);
        break;
      case 'text-input':
        this.validateTextCriteria(field, input);
        break;
    }
  }

  private validateNumberCriteria(field: any, input: number | number[]): void {
    const { validationCriteria, validationType } = field;
    const numberValues = validationCriteria
      ? validationCriteria
          .replace(/[\[\]]/g, '')
          .split(',')
          .map((val: string) => parseFloat(val.trim()))
      : [];

    const validationValue = parseFloat(validationCriteria) || 0;
    const [minValue, maxValue] =
      numberValues.length > 1 ? [numberValues[0], numberValues[numberValues.length - 1]] : [0, 10];

    const numberInput = typeof input === 'number' ? parseFloat(input.toFixed(2)) : null;

    switch (validationType) {
      case '==':
        if (numberInput !== parseFloat(validationValue.toFixed(2))) {
          throw new ValidationError(`Input ${field.field} must equal ${validationValue}`);
        }
        break;
      case '!=':
        if (numberInput === parseFloat(validationValue.toFixed(2))) {
          throw new ValidationError(`Input ${field.field} must not equal ${validationValue}`);
        }
        break;
      case '>=':
        if (numberInput < parseFloat(validationValue.toFixed(2))) {
          throw new ValidationError(`Input ${field.field} must be greater than or equal to ${validationValue}`);
        }
        break;
      case '<=':
        if (numberInput > parseFloat(validationValue.toFixed(2))) {
          throw new ValidationError(`Input ${field.field} must be less than or equal to ${validationValue}`);
        }
        break;
      case '>':
        if (numberInput <= parseFloat(validationValue.toFixed(2))) {
          throw new ValidationError(`Input ${field.field} must be greater than ${validationValue}`);
        }
        break;
      case '<':
        if (numberInput >= parseFloat(validationValue.toFixed(2))) {
          throw new ValidationError(`Input ${field.field} must be less than ${validationValue}`);
        }
        break;
      case '(num)':
        if (numberInput <= minValue || numberInput >= maxValue) {
          throw new ValidationError(`Input ${field.field} must be between ${minValue} and ${maxValue} (exclusive)`);
        }
        break;
      case '[num]':
        if (numberInput < minValue || numberInput > maxValue) {
          throw new ValidationError(`Input ${field.field} must be between ${minValue} and ${maxValue} (inclusive)`);
        }
        break;
      case '[=num]':
        if (!numberValues.includes(numberInput)) {
          throw new ValidationError(`Input ${field.field} must be one of: ${numberValues.join(', ')}`);
        }
        break;
      case '[=nums]':
        if (!Array.isArray(input) || !input.every((inp: number) => numberValues.includes(parseFloat(inp.toFixed(2))))) {
          throw new ValidationError(
            `Input ${field.field} must be an array with values from: ${numberValues.join(', ')}`,
          );
        }
        break;
    }
  }

  private validateDateCriteria(field: any, input: string | string[]): void {
    const { validationCriteria, validationType } = field;
    const parseValue = (value: string) => {
      const cleanValue = value?.trim()?.replace(/[\[\]()]/g, '');
      return cleanValue?.toLowerCase() === 'today' ? new Date() : new Date(cleanValue);
    };

    const dateValues = validationCriteria
      ? validationCriteria
          .replace(/[\[\]]/g, '')
          .split(',')
          .map((val: string) => parseValue(val).getTime())
      : [];

    const dateValidationValue = parseValue(validationCriteria).getTime();
    const [minDate, maxDate] =
      dateValues.length > 1
        ? [dateValues[0], dateValues[dateValues.length - 1]]
        : [new Date().getTime(), new Date().setFullYear(new Date().getFullYear() + 1)];

    const dateInput = typeof input === 'string' ? parseValue(input).getTime() : null;

    switch (validationType) {
      case '==':
        if (dateInput !== dateValidationValue) {
          throw new ValidationError(`Input ${field.field} must equal ${new Date(dateValidationValue).toISOString()}`);
        }
        break;
      case '!=':
        if (dateInput === dateValidationValue) {
          throw new ValidationError(
            `Input ${field.field} must not equal ${new Date(dateValidationValue).toISOString()}`,
          );
        }
        break;
      case '>=':
        if (dateInput < dateValidationValue) {
          throw new ValidationError(
            `Input ${field.field} must be on or after ${new Date(dateValidationValue).toISOString()}`,
          );
        }
        break;
      case '<=':
        if (dateInput > dateValidationValue) {
          throw new ValidationError(
            `Input ${field.field} must be on or before ${new Date(dateValidationValue).toISOString()}`,
          );
        }
        break;
      case '>':
        if (dateInput <= dateValidationValue) {
          throw new ValidationError(
            `Input ${field.field} must be after ${new Date(dateValidationValue).toISOString()}`,
          );
        }
        break;
      case '<':
        if (dateInput >= dateValidationValue) {
          throw new ValidationError(
            `Input ${field.field} must be before ${new Date(dateValidationValue).toISOString()}`,
          );
        }
        break;
      case '(date)':
        if (dateInput <= minDate || dateInput >= maxDate) {
          throw new ValidationError(
            `Input ${field.field} must be between ${new Date(minDate).toISOString()} and ${new Date(maxDate).toISOString()} (exclusive)`,
          );
        }
        break;
      case '[date]':
        if (dateInput < minDate || dateInput > maxDate) {
          throw new ValidationError(
            `Input ${field.field} must be between ${new Date(minDate).toISOString()} and ${new Date(maxDate).toISOString()} (inclusive)`,
          );
        }
        break;
      case '[=date]':
        if (!dateValues.includes(dateInput)) {
          throw new ValidationError(
            `Input ${field.field} must be one of: ${dateValues.map((d) => new Date(d).toISOString()).join(', ')}`,
          );
        }
        break;
      case '[=dates]':
        if (!Array.isArray(input) || !input.every((inp: string) => dateValues.includes(new Date(inp).getTime()))) {
          throw new ValidationError(
            `Input ${field.field} must be an array with dates from: ${dateValues.map((d) => new Date(d).toISOString()).join(', ')}`,
          );
        }
        break;
    }
  }

  private normalizeText(text: string): string {
    return text
      ?.trim()
      ?.replace(/[\[\]()'"''""]/g, '')
      ?.replace(/\s+/g, ' ');
  }

  private validateTextCriteria(field: any, input: string | string[]): void {
    const { validationCriteria, validationType } = field;

    switch (validationType) {
      case '==':
        if (input !== validationCriteria) {
          throw new ValidationError(`Input ${field.field} must equal "${validationCriteria}"`);
        }
        break;
      case '!=':
        if (input === validationCriteria) {
          throw new ValidationError(`Input ${field.field} must not equal "${validationCriteria}"`);
        }
        break;
      case 'regex':
        if (typeof input === 'string') {
          try {
            const regex = new RegExp(validationCriteria);
            if (!regex.test(input)) {
              throw new ValidationError(`Input ${field.field} must match the pattern: ${validationCriteria}`);
            }
          } catch (e) {
            throw new ValidationError(`Invalid regex pattern for ${field.field}: ${validationCriteria}`);
          }
          break;
        }
      case '[=text]':
        if (typeof input === 'string') {
          const validTexts = validationCriteria
            .replace(/[\[\]]/g, '')
            .split(',')
            .map((val: string) => val.trim());
          if (!validTexts.includes(input.trim())) {
            throw new ValidationError(`Input ${field.field} must be one of: ${validTexts.join(', ')}`);
          }
          break;
        }
      case '[=texts]':
        const validTextArray = validationCriteria
          .replace(/[\[\]]/g, '')
          .split(',')
          .map((val: string) => this.normalizeText(val));

        const inputArray = Array.isArray(input)
          ? input.map((val) => this.normalizeText(val))
          : input
              .replace(/[\[\]]/g, '')
              .split(',')
              .map((val) => this.normalizeText(val));

        if (!inputArray.every((inp: string) => validTextArray.includes(inp))) {
          throw new ValidationError(
            `Input ${field.field} must be one or many of the values from: ${validTextArray.join(', ')}`,
          );
        }
        break;
    }
  }

  validateOutput(outputSchema: any, output: any): void {
    this.validateField(outputSchema, { output });
  }
}
