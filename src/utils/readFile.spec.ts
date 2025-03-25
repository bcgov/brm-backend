import { readFileSafely, FileNotFoundError } from './readFile';
import * as fs from 'fs';

jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

const RULES_DIRECTORY = '../../../rules-repo/rules';

describe('File Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readFileSafely', () => {
    it('should throw FileNotFoundError if path traversal detected', async () => {
      const mockInvalidFileName = '../traversal.txt';

      await expect(readFileSafely(RULES_DIRECTORY, mockInvalidFileName)).rejects.toThrow(
        new FileNotFoundError('Path traversal detected'),
      );
    });

    it('should throw FileNotFoundError if file does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      await expect(readFileSafely(RULES_DIRECTORY, 'nonexistentFile.txt')).rejects.toThrow(
        new FileNotFoundError('File not found'),
      );
    });
  });
});
