import { Model } from 'mongoose';
import { Logger } from '@nestjs/common';
import { KlammService, GITHUB_RULES_REPO } from './klamm.service';
import { RuleDataService } from '../ruleData/ruleData.service';
import { RuleMappingService } from '../ruleMapping/ruleMapping.service';
import { DocumentsService } from '../documents/documents.service';
import { KlammSyncMetadataDocument } from './klammSyncMetadata.schema';
import { RuleData } from '../ruleData/ruleData.schema';
import { KlammRulePayload } from './klamm';

describe('KlammService', () => {
  let service: KlammService;
  let ruleDataService: RuleDataService;
  let ruleMappingService: RuleMappingService;
  let documentsService: DocumentsService;
  let klammSyncMetadata: Model<KlammSyncMetadataDocument>;

  beforeEach(async () => {
    ruleDataService = {
      getRuleDataByFilepath: jest.fn(),
    } as unknown as RuleDataService;
    ruleMappingService = {
      inputOutputSchemaFile: jest.fn(),
    } as unknown as RuleMappingService;
    documentsService = {
      getFileContent: jest.fn(),
    } as unknown as DocumentsService;
    klammSyncMetadata = {
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn(),
    } as unknown as Model<KlammSyncMetadataDocument>;

    service = new KlammService(ruleDataService, ruleMappingService, documentsService, klammSyncMetadata, new Logger());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize module correctly', async () => {
    jest
      .spyOn(service as any, '_getUpdatedFilesFromGithub')
      .mockResolvedValue({ updatedFilesSinceLastDeploy: ['file1.js'], lastCommitAsyncTimestamp: 0 });
    jest.spyOn(service as any, '_syncRules').mockResolvedValue(undefined);
    jest.spyOn(service as any, '_updateLastSyncTimestamp').mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(service['_getUpdatedFilesFromGithub']).toHaveBeenCalled();
    expect(service['_syncRules']).toHaveBeenCalledWith(['file1.js']);
    expect(service['_updateLastSyncTimestamp']).toHaveBeenCalled();
  });

  it('should handle error in onModuleInit', async () => {
    jest.spyOn(service as any, '_getUpdatedFilesFromGithub').mockRejectedValue(new Error('Error'));

    await service.onModuleInit();

    expect(service['_getUpdatedFilesFromGithub']).toHaveBeenCalled();
  });

  it('should sync rules correctly', async () => {
    const updatedFiles = ['file1.js', 'file2.js'];
    const mockRule = { name: 'rule1', filepath: 'file1.js' } as RuleData;
    jest.spyOn(ruleDataService, 'getRuleDataByFilepath').mockResolvedValue(mockRule);
    jest.spyOn(service as any, '_syncRuleWithKlamm').mockResolvedValue(undefined);

    await service['_syncRules'](updatedFiles);

    expect(ruleDataService.getRuleDataByFilepath).toHaveBeenCalledWith('file1.js');
    expect(service['_syncRuleWithKlamm']).toHaveBeenCalledWith(mockRule);
  });

  it('should handle error in _syncRules', async () => {
    const updatedFiles = ['file1.js'];
    jest.spyOn(ruleDataService, 'getRuleDataByFilepath').mockRejectedValue(new Error('Error'));

    await expect(service['_syncRules'](updatedFiles)).rejects.toThrow('Failed to sync rule from file file1.js');
  });

  it('should handle empty updatedFiles array', async () => {
    const updatedFiles: string[] = [];
    jest.spyOn(service as any, '_syncRuleWithKlamm').mockResolvedValue(undefined);

    await service['_syncRules'](updatedFiles);

    expect(service['_syncRuleWithKlamm']).not.toHaveBeenCalled();
  });

  it('should get updated files from GitHub correctly', async () => {
    const mockFiles = ['file1.js', 'file2.js'];
    const mockCommits = [{ url: 'commit1' }, { url: 'commit2' }];
    const mockCommitDetails = {
      files: [{ filename: 'rules/file1.js' }, { filename: 'rules/file2.js' }],
      commit: { author: { date: 1234567790 } },
    };
    jest.spyOn(service as any, '_getLastSyncTimestamp').mockResolvedValue(1234567890);
    jest
      .spyOn(service.axiosGithubInstance, 'get')
      .mockResolvedValueOnce({ data: mockCommits })
      .mockResolvedValueOnce({ data: mockCommitDetails })
      .mockResolvedValueOnce({ data: mockCommitDetails });

    const result = await service['_getUpdatedFilesFromGithub']();

    expect(service['_getLastSyncTimestamp']).toHaveBeenCalled();
    expect(service.axiosGithubInstance.get).toHaveBeenCalledWith(
      `${GITHUB_RULES_REPO}/commits?since=${new Date(1234567890).toISOString().split('.')[0]}Z&sha=dev`,
    );
    expect(result.updatedFilesSinceLastDeploy).toEqual(mockFiles);
  });

  it('should handle error in _getUpdatedFilesFromGithub', async () => {
    jest.spyOn(service as any, '_getLastSyncTimestamp').mockResolvedValue(1234567890);
    jest.spyOn(service.axiosGithubInstance, 'get').mockRejectedValue(new Error('Error'));

    await expect(service['_getUpdatedFilesFromGithub']()).rejects.toThrow('Error fetching updated files from GitHub');
  });

  it('should sync rule with Klamm correctly', async () => {
    const mockRule = { name: 'rule1', filepath: 'rule1.json', title: 'Rule 1' } as RuleData;
    const mockInputsOutputs = { inputs: [], outputs: [] };
    const mockChildRules = [];
    jest.spyOn(service as any, '_getInputOutputFieldsData').mockResolvedValue(mockInputsOutputs);
    jest.spyOn(service as any, '_getChildRules').mockResolvedValue(mockChildRules);
    jest.spyOn(service as any, '_addOrUpdateRuleInKlamm').mockResolvedValue(undefined);

    await service['_syncRuleWithKlamm'](mockRule);

    expect(service['_getInputOutputFieldsData']).toHaveBeenCalledWith(mockRule);
    expect(service['_getChildRules']).toHaveBeenCalledWith(mockRule);
    expect(service['_addOrUpdateRuleInKlamm']).toHaveBeenCalledWith({
      name: mockRule.name,
      label: mockRule.title,
      rule_inputs: mockInputsOutputs.inputs,
      rule_outputs: mockInputsOutputs.outputs,
      child_rules: mockChildRules,
    });
  });

  it('should handle error in _syncRuleWithKlamm', async () => {
    const mockRule = { name: 'rule1', filepath: 'rule1.json', title: 'Rule 1' } as RuleData;
    jest.spyOn(service as any, '_getInputOutputFieldsData').mockRejectedValue(new Error('Error'));

    await expect(service['_syncRuleWithKlamm'](mockRule)).rejects.toThrow('Error syncing rule1');
  });

  it('should get input/output fields data correctly', async () => {
    const mockRule = { name: 'rule1', filepath: 'file1.js' } as RuleData;
    const mockInputsOutputs = { inputs: [], resultOutputs: [] };
    jest.spyOn(ruleMappingService, 'inputOutputSchemaFile').mockResolvedValue(mockInputsOutputs);
    jest.spyOn(service as any, '_getAllKlammFields').mockResolvedValue([]);
    jest.spyOn(service as any, '_getFieldsFromIds').mockReturnValue([]);

    const result = await service['_getInputOutputFieldsData'](mockRule);

    expect(ruleMappingService.inputOutputSchemaFile).toHaveBeenCalledWith(mockRule.filepath, 'prod');
    expect(service['_getFieldsFromIds']).toHaveBeenCalledWith([], []);
    expect(result).toEqual({ inputs: [], outputs: [] });
  });

  it('should handle error in _getInputOutputFieldsData', async () => {
    const mockRule = { name: 'rule1', filepath: 'file1.js' } as RuleData;
    jest.spyOn(ruleMappingService, 'inputOutputSchemaFile').mockRejectedValue(new Error('Error'));

    await expect(service['_getInputOutputFieldsData'](mockRule)).rejects.toThrow(
      'Error getting input/output fields for rule rule1',
    );
  });

  it('should get fields from IDs correctly', async () => {
    const mockIds = [1, 2, 3];
    const mockFields = [
      { id: 1, name: 'field1', label: 'Field 1', description: 'Description 1' },
      { id: 2, name: 'field2', label: 'Field 2', description: 'Description 2' },
      { id: 3, name: 'field3', label: 'Field 3', description: 'Description 3' },
    ];
    jest.spyOn(service as any, '_getAllKlammFields').mockResolvedValue(mockFields);

    const result = service['_getFieldsFromIds'](mockFields, mockIds);

    expect(result).toEqual(mockFields);
  });

  it('should get child rules correctly', async () => {
    const mockRule = { name: 'rule1', filepath: 'file1.js' } as RuleData;
    const mockFileContent = Buffer.from(
      JSON.stringify({ nodes: [{ type: 'decisionNode', content: { key: 'key1' } }] }),
    );
    jest.spyOn(documentsService, 'getFileContent').mockResolvedValue(mockFileContent);
    jest.spyOn(service as any, '_getKlammRuleFromName').mockResolvedValue({});

    const result = await service['_getChildRules'](mockRule);

    expect(documentsService.getFileContent).toHaveBeenCalledWith(mockRule.filepath);
    expect(service['_getKlammRuleFromName']).toHaveBeenCalledWith('key1');
    expect(result).toEqual([{}]);
  });

  it('should handle error in _getChildRules', async () => {
    const mockRule = { name: 'rule1', filepath: 'file1.js' } as RuleData;
    jest.spyOn(documentsService, 'getFileContent').mockRejectedValue(new Error('Error'));

    await expect(service['_getChildRules'](mockRule)).rejects.toThrow('Error gettting child rules for rule1');
  });

  it('should add or update rule in Klamm correctly', async () => {
    const mockRulePayload = { name: 'rule1' } as KlammRulePayload;
    jest.spyOn(service as any, '_getKlammRuleFromName').mockResolvedValue({ id: 1 });
    jest.spyOn(service as any, '_updateRuleInKlamm').mockResolvedValue(undefined);

    await service['_addOrUpdateRuleInKlamm'](mockRulePayload);

    expect(service['_getKlammRuleFromName']).toHaveBeenCalledWith(mockRulePayload.name);
    expect(service['_updateRuleInKlamm']).toHaveBeenCalledWith(1, mockRulePayload);
  });

  it('should handle error in _addOrUpdateRuleInKlamm', async () => {
    const mockRulePayload = { name: 'rule1' } as KlammRulePayload;
    jest.spyOn(service as any, '_getKlammRuleFromName').mockRejectedValue(new Error('Error'));

    await expect(service['_addOrUpdateRuleInKlamm'](mockRulePayload)).rejects.toThrow('Error');
  });

  it('should get Klamm rule from name correctly', async () => {
    const mockRuleName = 'rule1';
    jest.spyOn(service.axiosKlammInstance, 'get').mockResolvedValue({ data: { data: [{}] } });

    const result = await service['_getKlammRuleFromName'](mockRuleName);

    expect(service.axiosKlammInstance.get).toHaveBeenCalledWith(`${process.env.KLAMM_API_URL}/api/brerules`, {
      params: { name: mockRuleName },
    });
    expect(result).toEqual({});
  });

  it('should handle error in _getKlammRuleFromName', async () => {
    const mockRuleName = 'rule1';
    jest.spyOn(service.axiosKlammInstance, 'get').mockRejectedValue(new Error('Error'));

    await expect(service['_getKlammRuleFromName'](mockRuleName)).rejects.toThrow('Error getting rule rule1 from Klamm');
  });

  it('should add rule in Klamm correctly', async () => {
    const mockRulePayload = { name: 'rule1' } as KlammRulePayload;
    jest.spyOn(service.axiosKlammInstance, 'post').mockResolvedValue(undefined);

    await service['_addRuleInKlamm'](mockRulePayload);

    expect(service.axiosKlammInstance.post).toHaveBeenCalledWith(
      `${process.env.KLAMM_API_URL}/api/brerules`,
      mockRulePayload,
    );
  });

  it('should handle error in _addRuleInKlamm', async () => {
    const mockRulePayload = { name: 'rule1' } as KlammRulePayload;
    jest.spyOn(service.axiosKlammInstance, 'post').mockRejectedValue(new Error('Error'));

    await expect(service['_addRuleInKlamm'](mockRulePayload)).rejects.toThrow('Error adding rule to Klamm');
  });

  it('should update rule in Klamm correctly', async () => {
    const mockRulePayload = { name: 'rule1' } as KlammRulePayload;
    const mockRuleId = 1;
    jest.spyOn(service.axiosKlammInstance, 'put').mockResolvedValue(undefined);

    await service['_updateRuleInKlamm'](mockRuleId, mockRulePayload);

    expect(service.axiosKlammInstance.put).toHaveBeenCalledWith(
      `${process.env.KLAMM_API_URL}/api/brerules/${mockRuleId}`,
      mockRulePayload,
    );
  });

  it('should update last sync timestamp correctly', async () => {
    jest.spyOn(klammSyncMetadata, 'findOneAndUpdate').mockResolvedValue(undefined);

    await service['_updateLastSyncTimestamp'](1234567890);

    expect(klammSyncMetadata.findOneAndUpdate).toHaveBeenCalledWith(
      { key: 'singleton' },
      { lastSyncTimestamp: 1234567890 },
      { upsert: true, new: true },
    );
  });

  it('should handle error in _updateLastSyncTimestamp', async () => {
    jest.spyOn(klammSyncMetadata, 'findOneAndUpdate').mockRejectedValue(new Error('Error'));

    await expect(service['_updateLastSyncTimestamp'](1234567890)).rejects.toThrow(
      'Failed to update last sync timestamp',
    );
  });

  it('should get last sync timestamp correctly', async () => {
    const mockTimestamp = 1234567890;
    jest.spyOn(klammSyncMetadata, 'findOne').mockResolvedValue({ lastSyncTimestamp: mockTimestamp });

    const result = await service['_getLastSyncTimestamp']();

    expect(klammSyncMetadata.findOne).toHaveBeenCalledWith({ key: 'singleton' });
    expect(result).toEqual(mockTimestamp);
  });

  it('should handle error in _getLastSyncTimestamp', async () => {
    jest.spyOn(klammSyncMetadata, 'findOne').mockRejectedValue(new Error('Error'));

    await expect(service['_getLastSyncTimestamp']()).rejects.toThrow('Failed to get last sync timestamp');
  });

  it('should get Klamm BRE fields correctly', async () => {
    const searchText = 'test';
    const mockData = ['field1', 'field2'];
    jest.spyOn(service.axiosKlammInstance, 'get').mockResolvedValue({ data: mockData });

    const result = await service.getKlammBREFields(searchText);

    expect(service.axiosKlammInstance.get).toHaveBeenCalledWith(
      `${process.env.KLAMM_API_URL}/api/brefields?search=${encodeURIComponent(searchText.trim())}`,
    );
    expect(result).toEqual(mockData);
  });

  it('should handle error in getKlammBREFields', async () => {
    const searchText = 'test';
    jest.spyOn(service.axiosKlammInstance, 'get').mockRejectedValue(new Error('Error'));

    await expect(service.getKlammBREFields(searchText)).rejects.toThrow('Error fetching from Klamm');
  });

  it('should get Klamm BRE field from name correctly', async () => {
    const fieldName = 'field1';
    const mockData = [{ id: 1, name: 'field1' }];
    jest.spyOn(service.axiosKlammInstance, 'get').mockResolvedValue({ data: { data: mockData } });

    const result = await service.getKlammBREFieldFromName(fieldName);

    expect(service.axiosKlammInstance.get).toHaveBeenCalledWith(`${process.env.KLAMM_API_URL}/api/brefields`, {
      params: { name: encodeURIComponent(fieldName.trim()) },
    });
    expect(result).toEqual(mockData[0]);
  });

  it('should handle error in getKlammBREFieldFromName', async () => {
    const fieldName = 'field1';
    jest.spyOn(service.axiosKlammInstance, 'get').mockRejectedValue(new Error('Error'));

    await expect(service.getKlammBREFieldFromName(fieldName)).rejects.toThrow('Error fetching from Klamm');
  });

  it('should throw InvalidFieldRequest error if field name does not exist', async () => {
    const fieldName = 'field1';
    jest.spyOn(service.axiosKlammInstance, 'get').mockResolvedValue({ data: { data: [] } });

    await expect(service.getKlammBREFieldFromName(fieldName)).rejects.toThrow('Field name does not exist');
  });
  it('should initialize axiosGithubInstance with auth header when GITHUB_TOKEN is set', () => {
    process.env.GITHUB_TOKEN = 'test-token';
    const newService = new KlammService(
      ruleDataService,
      ruleMappingService,
      documentsService,
      klammSyncMetadata,
      new Logger(),
    );
    expect(newService.axiosGithubInstance.defaults.headers).toHaveProperty('Authorization', 'Bearer test-token');
    delete process.env.GITHUB_TOKEN;
  });
  it('should handle case when no rule is found for changed file', async () => {
    const loggerSpy = jest.spyOn(service['logger'], 'warn');
    jest.spyOn(ruleDataService, 'getRuleDataByFilepath').mockResolvedValue(null);

    await service['_syncRules'](['nonexistent-file.js']);

    expect(loggerSpy).toHaveBeenCalledWith('No rule found for changed file: nonexistent-file.js');
  });

  describe('_getAllKlammFields', () => {
    it('should handle error when fetching fields from Klamm', async () => {
      jest.spyOn(service.axiosKlammInstance, 'get').mockRejectedValue(new Error('Network error'));

      await expect(service['_getAllKlammFields']()).rejects.toThrow('Error fetching fields from Klamm: Network error');
    });

    it('should successfully fetch all Klamm fields', async () => {
      const mockFields = [
        { id: 1, name: 'field1' },
        { id: 2, name: 'field2' },
      ];
      jest.spyOn(service.axiosKlammInstance, 'get').mockResolvedValue({
        data: { data: mockFields },
      });

      const result = await service['_getAllKlammFields']();

      expect(result).toEqual(mockFields);
      expect(service.axiosKlammInstance.get).toHaveBeenCalledWith(`${process.env.KLAMM_API_URL}/api/brerules`);
    });
  });

  it('should return 0 when no sync timestamp record exists', async () => {
    jest.spyOn(klammSyncMetadata, 'findOne').mockResolvedValue(null);

    const result = await service['_getLastSyncTimestamp']();

    expect(result).toBe(0);
    expect(klammSyncMetadata.findOne).toHaveBeenCalledWith({ key: 'singleton' });
  });
});
