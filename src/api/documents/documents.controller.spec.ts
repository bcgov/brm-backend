import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

describe('DocumentsController', () => {
  let documentsController: DocumentsController;
  let documentsService: DocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
          useValue: {
            getFileContent: jest.fn(),
            getAllJSONFiles: jest.fn(),
          },
        },
      ],
    }).compile();

    documentsController = module.get<DocumentsController>(DocumentsController);
    documentsService = module.get<DocumentsService>(DocumentsService);
  });
  describe('getAllDocuments', () => {
    it('should return all JSON files', async () => {
      const mockFiles = ['file1.json', 'file2.json'];
      jest.spyOn(documentsService, 'getAllJSONFiles').mockResolvedValue(mockFiles);

      const result = await documentsController.getAllDocuments();

      expect(result).toEqual(mockFiles);
      expect(documentsService.getAllJSONFiles).toHaveBeenCalled();
    });

    it('should throw an error when getAllJSONFiles fails', async () => {
      const mockError = new Error('Failed to get files');
      jest.spyOn(documentsService, 'getAllJSONFiles').mockRejectedValue(mockError);

      await expect(documentsController.getAllDocuments()).rejects.toThrow(mockError);
    });
  });

  describe('getRuleFile', () => {
    it('should return file content', async () => {
      const ruleFileName = 'test.json';
      const mockFileContent = Buffer.from(JSON.stringify({ key: 'value' }));
      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      jest.spyOn(documentsService, 'getFileContent').mockResolvedValueOnce(mockFileContent);

      await documentsController.getRuleFile(ruleFileName, 'false', res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', `attachment; filename=${ruleFileName}`);
      expect(res.send).toHaveBeenCalledWith(mockFileContent);
    });

    it('should throw an error when file not found', async () => {
      const ruleFileName = 'test.json';
      const mockError = new Error('File not found');
      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      jest.spyOn(documentsService, 'getFileContent').mockRejectedValueOnce(mockError);

      await expect(documentsController.getRuleFile(ruleFileName, 'false', res)).rejects.toThrow(
        new HttpException(mockError.message, HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });

    it('should throw HttpException when response handling fails', async () => {
      const ruleFileName = 'test.json';
      const mockFileContent = Buffer.from(JSON.stringify({ key: 'value' }));
      const res = {
        setHeader: jest.fn(),
        send: jest.fn().mockImplementation(() => {
          throw new Error('Failed to send response');
        }),
      } as unknown as Response;

      jest.spyOn(documentsService, 'getFileContent').mockResolvedValueOnce(mockFileContent);

      await expect(documentsController.getRuleFile(ruleFileName, 'false', res)).rejects.toThrow(
        new HttpException('Failed to send response', HttpStatus.INTERNAL_SERVER_ERROR),
      );

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', `attachment; filename=${ruleFileName}`);
    });
  });
});
