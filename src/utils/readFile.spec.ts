import { readFileSafely, FileNotFoundError } from './readFile';
import * as fs from 'fs';

jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('File Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readFileSafely', () => {
    it('should throw FileNotFoundError if path traversal detected', async () => {
      const mockInvalidFileName = '../traversal.txt';

      await expect(readFileSafely('rules', mockInvalidFileName)).rejects.toThrow(
        new FileNotFoundError('Path traversal detected'),
      );
    });

    it('should throw FileNotFoundError if file does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      await expect(readFileSafely('rules', 'nonexistentFile.txt')).rejects.toThrow(
        new FileNotFoundError('File not found'),
      );
    });
  });
});
