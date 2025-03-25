import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { readFileSafely, FileNotFoundError } from '../../utils/readFile';
import * as fsPromises from 'fs/promises';
import { Dirent } from 'fs';
import * as path from 'path';

jest.mock('../../utils/readFile', () => ({
  readFileSafely: jest.fn(),
  FileNotFoundError: class FileNotFoundError extends Error {},
}));

jest.mock('fs/promises');
const RULES_DIRECTORY = '../../../rules-repo/rules';

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(RULES_DIRECTORY),
          },
        },
        DocumentsService,
      ],
    }).compile();
    service = module.get<DocumentsService>(DocumentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw a 404 error if the file does not exist', async () => {
    (readFileSafely as jest.Mock).mockRejectedValue(new Error('File not found'));

    await expect(service.getFileContent('path/to/nonexistent/file')).rejects.toThrow(
      new HttpException('File not found', HttpStatus.NOT_FOUND),
    );
  });

  it('should return file content if the file exists', async () => {
    const mockContent = Buffer.from('file content');
    (readFileSafely as jest.Mock).mockResolvedValue(mockContent);

    const result = await service.getFileContent('path/to/existing/file');

    expect(result).toBe(mockContent);
    expect(readFileSafely).toHaveBeenCalledWith(service.baseRulesDirectory, 'path/to/existing/file');
  });

  it('should throw a 500 error if reading the file fails', async () => {
    const errorMessage = 'Read error';
    (readFileSafely as jest.Mock).mockRejectedValue(new Error(errorMessage));

    await expect(service.getFileContent('path/to/existing/file')).rejects.toThrow(
      new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR),
    );
  });

  describe('getAllJSONFiles', () => {
    it('should return a list of JSON files from directory and subdirectories', async () => {
      const mockDirentFactory = (name: string, isDir: boolean): Dirent =>
        ({
          name,
          isDirectory: () => isDir,
          isFile: () => !isDir,
          isBlockDevice: () => false,
          isCharacterDevice: () => false,
          isFIFO: () => false,
          isSocket: () => false,
          isSymbolicLink: () => false,
        }) as Dirent;

      const mockFiles = [
        mockDirentFactory('file1.json', false),
        mockDirentFactory('subdir', true),
        mockDirentFactory('file2.txt', false),
        mockDirentFactory('file3.JSON', false),
      ];

      const mockSubdirFiles = [mockDirentFactory('file4.json', false), mockDirentFactory('file5.txt', false)];

      (fsPromises.readdir as jest.Mock).mockImplementation((dirPath) => {
        if (dirPath.endsWith('subdir')) {
          return Promise.resolve(mockSubdirFiles);
        }
        return Promise.resolve(mockFiles);
      });

      const result = await service.getAllJSONFiles();

      expect(result).toEqual(['file1.json', 'subdir/file4.json', 'file3.JSON']);

      expect(fsPromises.readdir).toHaveBeenCalledTimes(2);
      expect(fsPromises.readdir).toHaveBeenCalledWith(RULES_DIRECTORY, { withFileTypes: true });
      expect(fsPromises.readdir).toHaveBeenCalledWith(path.join(RULES_DIRECTORY, 'subdir'), { withFileTypes: true });
    });

    it('should throw HttpException when directory reading fails', async () => {
      (fsPromises.readdir as jest.Mock).mockRejectedValue(new Error('Failed to read directory'));

      await expect(service.getAllJSONFiles()).rejects.toThrow(
        new HttpException('Error reading directory', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });

    it('should handle empty directories', async () => {
      (fsPromises.readdir as jest.Mock).mockResolvedValue([]);

      const result = await service.getAllJSONFiles();

      expect(result).toEqual([]);
      expect(fsPromises.readdir).toHaveBeenCalledTimes(1);
      expect(fsPromises.readdir).toHaveBeenCalledWith(RULES_DIRECTORY, { withFileTypes: true });
    });

    it('should ignore non-JSON files', async () => {
      const mockDirentFactory = (name: string): Dirent =>
        ({
          name,
          isDirectory: () => false,
          isFile: () => true,
          isBlockDevice: () => false,
          isCharacterDevice: () => false,
          isFIFO: () => false,
          isSocket: () => false,
          isSymbolicLink: () => false,
        }) as Dirent;

      const mockFiles = [
        mockDirentFactory('file1.txt'),
        mockDirentFactory('file2.png'),
        mockDirentFactory('file3.doc'),
      ];

      (fsPromises.readdir as jest.Mock).mockResolvedValue(mockFiles);

      const result = await service.getAllJSONFiles();

      expect(result).toEqual([]);
      expect(fsPromises.readdir).toHaveBeenCalledTimes(1);
      expect(fsPromises.readdir).toHaveBeenCalledWith(RULES_DIRECTORY, { withFileTypes: true });
    });
  });

  describe('getFileContent', () => {
    it('should throw a 404 error if the file does not exist', async () => {
      (readFileSafely as jest.Mock).mockRejectedValue(new FileNotFoundError('File not found'));

      await expect(service.getFileContent('path/to/nonexistent/file')).rejects.toThrow(
        new HttpException('File not found', HttpStatus.NOT_FOUND),
      );
    });

    it('should return file content if the file exists', async () => {
      const mockContent = Buffer.from('file content');
      (readFileSafely as jest.Mock).mockResolvedValue(mockContent);

      const result = await service.getFileContent('path/to/existing/file');

      expect(result).toBe(mockContent);
      expect(readFileSafely).toHaveBeenCalledWith(RULES_DIRECTORY, 'path/to/existing/file');
    });

    it('should throw a 500 error if reading the file fails', async () => {
      const errorMessage = 'Read error';
      (readFileSafely as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(service.getFileContent('path/to/existing/file')).rejects.toThrow(
        new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });
});
