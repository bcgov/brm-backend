import { Test, TestingModule } from '@nestjs/testing';
import { RuleDataController } from './ruleData.controller';
import { RuleDataService } from './ruleData.service';
import { RuleData } from './ruleData.schema';
import { mockRuleData, mockRuleDataServiceProviders } from './ruleData.service.spec';

describe('RuleDataController', () => {
  let controller: RuleDataController;
  let service: RuleDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RuleDataController],
      providers: mockRuleDataServiceProviders,
    }).compile();

    controller = module.get<RuleDataController>(RuleDataController);
    service = module.get<RuleDataService>(RuleDataService);
  });

  it('should return all rules data', async () => {
    const ruleDataResult: RuleData[] = [mockRuleData];
    const result = { data: ruleDataResult, total: 1, categories: [] };
    jest.spyOn(service, 'getAllRuleData').mockImplementation(() => Promise.resolve(result));

    expect(await controller.getAllRulesData()).toStrictEqual(result);
  });

  it('should return a rule draft for a given ruleId', async () => {
    const ruleId = 'testRuleId';
    const mockRuleDraft = { _id: 'sadasd', content: {} };
    jest.spyOn(service, 'getRuleDataWithDraft').mockImplementation(() => Promise.resolve(mockRuleDraft));

    expect(await controller.getRuleDraft(ruleId)).toBe(mockRuleDraft);
    expect(service.getRuleDataWithDraft).toHaveBeenCalledWith(ruleId);
  });

  it('should return a rule data', async () => {
    const ruleId = 'testId';
    jest.spyOn(service, 'getRuleData').mockImplementation(() => Promise.resolve(mockRuleData));

    expect(await controller.getRuleData(ruleId)).toBe(mockRuleData);
  });

  it('should create a rule data', async () => {
    jest.spyOn(service, 'createRuleData').mockImplementation(() => Promise.resolve(mockRuleData));

    expect(await controller.createRuleData(mockRuleData)).toBe(mockRuleData);
  });

  it('should update a rule data', async () => {
    const ruleId = 'testId';
    jest.spyOn(service, 'updateRuleData').mockImplementation(() => Promise.resolve(mockRuleData));

    expect(await controller.updateRuleData(ruleId, mockRuleData)).toBe(mockRuleData);
  });

  it('should delete a rule data', async () => {
    const ruleId = 'testId';
    jest.spyOn(service, 'deleteRuleData').mockImplementation(() => Promise.resolve(mockRuleData));

    expect(await controller.deleteRuleData(ruleId)).toBeUndefined();
  });
});
