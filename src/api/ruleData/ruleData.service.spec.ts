import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { DocumentsService } from '../documents/documents.service';
import { RuleDataService } from './ruleData.service';
import { RuleData } from './ruleData.schema';
import { RuleDraft } from './ruleDraft.schema';
import axios from 'axios';

export const mockRuleData = {
  _id: 'testId',
  name: 'title',
  title: 'Title',
  filepath: 'title.json',
};
const mockRuleDraft = { content: { nodes: [], edges: [] } };

class MockRuleDataModel {
  constructor(private data: RuleData) {}
  save = jest.fn().mockResolvedValue(this.data);
  static find = jest.fn().mockReturnThis();
  static findById = jest.fn().mockReturnThis();
  static findOne = jest.fn().mockReturnThis();
  static findOneAndDelete = jest.fn().mockReturnThis();
  static countDocuments = jest.fn().mockResolvedValue(1);
  static sort = jest.fn().mockReturnThis();
  static skip = jest.fn().mockReturnThis();
  static limit = jest.fn().mockReturnThis();
  static lean = jest.fn().mockReturnThis();
  static exec = jest.fn().mockResolvedValue([mockRuleData]);
}

export const mockRuleDataServiceProviders = [
  RuleDataService,
  {
    provide: getModelToken(RuleDraft.name),
    useFactory: () => ({}),
  },
  {
    provide: getModelToken(RuleData.name),
    useValue: MockRuleDataModel,
  },
  {
    provide: DocumentsService,
    useValue: {
      getAllJSONFiles: jest.fn().mockResolvedValue(['doc1.json', 'doc2.json']),
    },
  },
  Logger,
];

describe('RuleDataService', () => {
  let service: RuleDataService;
  let documentsService: DocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: mockRuleDataServiceProviders,
    }).compile();

    service = module.get<RuleDataService>(RuleDataService);
    documentsService = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllRuleData', () => {
    it('should get all rule data with default pagination', async () => {
      const result = await service.getAllRuleData();
      expect(result).toEqual({
        data: [mockRuleData],
        total: 1,
        categories: expect.any(Array),
      });
      expect(MockRuleDataModel.find).toHaveBeenCalledWith({});
      expect(MockRuleDataModel.sort).toHaveBeenCalledWith({});
      expect(MockRuleDataModel.skip).toHaveBeenCalledWith(0);
      expect(MockRuleDataModel.limit).toHaveBeenCalledWith(5000);
    });

    it('should handle search term', async () => {
      await service.getAllRuleData({ page: 1, pageSize: 10, searchTerm: 'test' });
      expect(MockRuleDataModel.find).toHaveBeenCalledWith({
        $and: [
          {
            $or: [{ title: { $regex: 'test', $options: 'i' } }, { filepath: { $regex: 'test', $options: 'i' } }],
          },
        ],
      });
    });

    it('should handle filters', async () => {
      await service.getAllRuleData({
        page: 1,
        pageSize: 10,
        filters: { filepath: ['category'] },
      });
      expect(MockRuleDataModel.find).toHaveBeenCalledWith({
        $and: [
          {
            $or: [
              {
                filepath: {
                  $regex: new RegExp('(^category/|/category/)', 'i'),
                },
              },
            ],
          },
        ],
      });
    });

    it('should handle sorting', async () => {
      await service.getAllRuleData({
        page: 1,
        pageSize: 10,
        sortField: 'title',
        sortOrder: 'descend',
      });
      expect(MockRuleDataModel.sort).toHaveBeenCalledWith({ title: -1 });
    });

    it('should handle pagination', async () => {
      await service.getAllRuleData({ page: 2, pageSize: 20 });
      expect(MockRuleDataModel.skip).toHaveBeenCalledWith(20);
      expect(MockRuleDataModel.limit).toHaveBeenCalledWith(20);
    });

    it('should handle errors', async () => {
      MockRuleDataModel.find.mockImplementationOnce(() => {
        throw new Error('Test error');
      });
      await expect(service.getAllRuleData()).rejects.toThrow('Error getting all rule data: Test error');
    });
  });

  it('should return a rule draft for a given ruleId', async () => {
    const mockDataWithDraft = { ...mockRuleData, ruleDraft: mockRuleDraft };
    MockRuleDataModel.findById = jest.fn().mockImplementation(() => ({
      populate: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(mockDataWithDraft),
      })),
    }));
    expect(await service.getRuleDataWithDraft(mockRuleData._id)).toEqual(mockDataWithDraft.ruleDraft);
  });

  it('should get data for a rule', async () => {
    MockRuleDataModel.findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockRuleData) });
    expect(await service.getRuleData(mockRuleData._id)).toEqual(mockRuleData);
  });

  it('should get data for a rule by filepath', async () => {
    MockRuleDataModel.findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockRuleData) });
    expect(await service.getRuleDataByFilepath(mockRuleData.filepath)).toEqual(mockRuleData);
  });

  it('should create rule data', async () => {
    expect(await service.createRuleData(mockRuleData)).toEqual(mockRuleData);
  });

  it('should update rule data', async () => {
    const newData = { title: 'New Title', isPublished: true };
    const modelInstance = new MockRuleDataModel(mockRuleData);
    MockRuleDataModel.findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(modelInstance) });
    modelInstance.save = jest.fn().mockResolvedValue({ ...mockRuleData, ...newData });
    expect(await service.updateRuleData(mockRuleData._id, newData)).toEqual({ ...mockRuleData, ...newData });
  });

  it('should delete rule data', async () => {
    MockRuleDataModel.findOneAndDelete = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockRuleData) });
    expect(await service.deleteRuleData(mockRuleData._id)).toEqual(mockRuleData);
  });

  it('should correctly remove inReview statuses when branches no longer exist', async () => {
    const ruleWithBranchToRemove: RuleData = {
      _id: 'testId1',
      name: 'title1',
      title: 'Title 1',
      filepath: 'title1.json',
      reviewBranch: 'myoldbranch',
    };
    const ruleWithBranchToKeep: RuleData = {
      _id: 'testId2',
      name: 'title2',
      title: 'Title 2',
      filepath: 'title2.json',
      reviewBranch: 'branch2',
    };
    const ruleWithoutBranch: RuleData = {
      _id: 'testId3',
      name: 'title3',
      title: 'Title 3',
      filepath: 'path/title3.json',
    };
    const mockedbranches = { data: [{ name: 'branch1' }, { name: ruleWithBranchToKeep.reviewBranch }] };
    jest.spyOn(axios, 'get').mockResolvedValue(mockedbranches);
    jest
      .spyOn(service, 'updateRuleData')
      .mockImplementation((ruleId: string, rData: RuleData) => Promise.resolve(rData));

    await service.updateInReviewStatus([ruleWithBranchToRemove, ruleWithBranchToKeep, ruleWithoutBranch]);

    expect(service.updateRuleData).toHaveBeenCalledTimes(1);
    expect(service.updateRuleData).toHaveBeenCalledWith(ruleWithBranchToRemove._id, { reviewBranch: null });
  });

  it('should add unsynced files correctly', async () => {
    const unsyncedFiles = ['file1.txt', 'file2.txt'];
    jest.spyOn(documentsService, 'getAllJSONFiles').mockResolvedValue(unsyncedFiles);
    jest.spyOn(service, 'createRuleData').mockImplementation((rData: RuleData) => Promise.resolve(rData));

    await service.addUnsyncedFiles([mockRuleData]);

    expect(documentsService.getAllJSONFiles).toHaveBeenCalled();
    expect(service.createRuleData).toHaveBeenCalledTimes(unsyncedFiles.length);
  });

  it('should handle adding duplicate files gracefully', async () => {
    const unsyncedFiles = ['file1.txt', mockRuleData.filepath];
    jest.spyOn(documentsService, 'getAllJSONFiles').mockResolvedValue(unsyncedFiles);
    jest.spyOn(service, 'createRuleData').mockImplementation((rData: RuleData) => Promise.resolve(rData));
    jest
      .spyOn(service, 'updateRuleData')
      .mockImplementation((ruleId: string, rData: RuleData) => Promise.resolve(rData));

    await service.addUnsyncedFiles([mockRuleData]);

    expect(documentsService.getAllJSONFiles).toHaveBeenCalled();
    expect(service.createRuleData).toHaveBeenCalledTimes(1);
    expect(service.updateRuleData).toHaveBeenCalledTimes(1);
  });
  describe('onModuleInit', () => {
    it('should initialize categories, update review status, and add unsynced files', async () => {
      const mockGetAllRuleData = jest.spyOn(service, 'getAllRuleData').mockResolvedValue({
        data: [mockRuleData],
        total: 1,
        categories: [],
      });
      const mockUpdateInReviewStatus = jest.spyOn(service, 'updateInReviewStatus').mockResolvedValue();
      const mockAddUnsyncedFiles = jest.spyOn(service, 'addUnsyncedFiles').mockResolvedValue();

      await service.onModuleInit();

      expect(mockGetAllRuleData).toHaveBeenCalled();
      expect(mockUpdateInReviewStatus).toHaveBeenCalledWith([mockRuleData]);
      expect(mockAddUnsyncedFiles).toHaveBeenCalledWith([mockRuleData]);
      expect(service['categories']).toEqual([]);
    });
  });

  describe('updateCategories', () => {
    it('should correctly update categories from filepaths', () => {
      const testRules = [
        { _id: 'testId1', name: 'title1', title: 'Title 1', filepath: 'category1/subcategory/file1.json' },
        { _id: 'testId2', name: 'title2', title: 'Title 2', filepath: 'category1/file2.json' },
        { _id: 'testId3', name: 'title3', title: 'Title 3', filepath: 'category2/file3.json' },
      ];

      service['updateCategories'](testRules);

      expect(service['categories']).toEqual([
        { text: 'category1', value: 'category1' },
        { text: 'category2', value: 'category2' },
        { text: 'subcategory', value: 'subcategory' },
      ]);
    });

    it('should handle empty rule data', () => {
      service['updateCategories']([]);
      expect(service['categories']).toEqual([]);
    });
  });

  describe('_addOrUpdateDraft', () => {
    it('should handle undefined ruleDraft', async () => {
      const testRuleData = {
        _id: 'testId',
      };

      const result = await service['_addOrUpdateDraft'](testRuleData);
      expect(result).toEqual(testRuleData);
    });
  });

  describe('getAllRuleData with additional cases', () => {
    it('should handle array filters correctly', async () => {
      await service.getAllRuleData({
        page: 1,
        pageSize: 10,
        filters: { filepath: ['docs/category1', 'docs/category2'] },
      });

      expect(MockRuleDataModel.find).toHaveBeenCalledWith({
        $and: [
          {
            $or: [
              {
                filepath: {
                  $regex: new RegExp('(^docs/category1/|/docs/category1/)', 'i'),
                },
              },
              {
                filepath: {
                  $regex: new RegExp('(^docs/category2/|/docs/category2/)', 'i'),
                },
              },
            ],
          },
        ],
      });
    });

    it('should handle single value filters', async () => {
      await service.getAllRuleData({
        page: 1,
        pageSize: 10,
        filters: { filepath: ['docs/general'] },
      });

      expect(MockRuleDataModel.find).toHaveBeenCalledWith({
        $and: [
          {
            $or: [
              {
                filepath: {
                  $regex: new RegExp('(^docs/general/|/docs/general/)', 'i'),
                },
              },
            ],
          },
        ],
      });
    });

    it('should ignore null or undefined filter values', async () => {
      await service.getAllRuleData({
        page: 1,
        pageSize: 10,
        filters: {},
      });

      expect(MockRuleDataModel.find).toHaveBeenCalledWith({});
    });
  });

  describe('getRuleDataWithDraft', () => {
    it('should handle error when getting draft', async () => {
      MockRuleDataModel.findById.mockImplementationOnce(() => ({
        populate: jest.fn().mockImplementationOnce(() => ({
          exec: jest.fn().mockRejectedValueOnce(new Error('Draft not found')),
        })),
      }));

      await expect(service.getRuleDataWithDraft('testId')).rejects.toThrow(
        'Error getting draft for testId: Draft not found',
      );
    });
  });

  describe('getRuleData', () => {
    it('should throw error when rule data not found', async () => {
      MockRuleDataModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getRuleData('nonexistentId')).rejects.toThrow('Rule data not found');
    });
  });

  describe('getRuleDataByFilepath', () => {
    it('should handle errors when getting rule by filepath', async () => {
      MockRuleDataModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      await expect(service.getRuleDataByFilepath('test/path.json')).rejects.toThrow(
        'Error getting all rule data for test/path.json: Database error',
      );
    });
  });

  describe('createRuleData', () => {
    it('should generate new _id if not provided', async () => {
      const testData = {
        filepath: 'test/path.json',
        title: 'Test Rule',
      };

      const result = await service.createRuleData(testData);
      expect(result._id).toBeDefined();
      expect(typeof result._id).toBe('string');
    });

    it('should derive name from filepath', async () => {
      const testData = {
        filepath: 'test/new-rule.json',
        title: 'Test Rule',
      };

      const result = await service.createRuleData(testData);
      expect(result.name).toBe('new-rule');
    });
  });
});
