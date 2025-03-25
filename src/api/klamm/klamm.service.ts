import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import axios, { AxiosInstance } from 'axios';
import { KlammField, KlammRulePayload, KlammRule } from './klamm';
import { deriveNameFromFilepath } from '../../utils/helpers';
import { RuleDataService } from '../ruleData/ruleData.service';
import { RuleMappingService } from '../ruleMapping/ruleMapping.service';
import { RuleData } from '../ruleData/ruleData.schema';
import { DocumentsService } from '../documents/documents.service';
import { KlammSyncMetadata, KlammSyncMetadataDocument } from './klammSyncMetadata.schema';

export const GITHUB_RULES_REPO = process.env.GITHUB_RULES_REPO;

export class InvalidFieldRequest extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFieldRequestError';
  }
}

@Injectable()
export class KlammService {
  axiosKlammInstance: AxiosInstance;
  axiosGithubInstance: AxiosInstance;

  constructor(
    private readonly ruleDataService: RuleDataService,
    private readonly ruleMappingService: RuleMappingService,
    private readonly documentsService: DocumentsService,
    @InjectModel(KlammSyncMetadata.name) private klammSyncMetadata: Model<KlammSyncMetadataDocument>,
    private readonly logger: Logger,
  ) {
    this.axiosKlammInstance = axios.create({
      headers: { Authorization: `Bearer ${process.env.KLAMM_API_AUTH_TOKEN}`, 'Content-Type': 'application/json' },
    });
    const headers: Record<string, string> = {};
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    this.axiosGithubInstance = axios.create({ headers });
  }

  async onModuleInit() {
    try {
      this.logger.log('Syncing existing rules with Klamm...');
      const { updatedFilesSinceLastDeploy, lastCommitAsyncTimestamp } = await this._getUpdatedFilesFromGithub();
      if (lastCommitAsyncTimestamp != undefined) {
        this.logger.log(
          `Files updated since last deploy up to ${new Date(lastCommitAsyncTimestamp)}:`,
          updatedFilesSinceLastDeploy,
        );
        await this._syncRules(updatedFilesSinceLastDeploy);
        this.logger.log('Completed syncing existing rules with Klamm');
        await this._updateLastSyncTimestamp(lastCommitAsyncTimestamp);
      } else {
        this.logger.log('Klamm file syncing up to date');
      }
    } catch (error) {
      this.logger.error('Unable to sync latest updates to Klamm:', error.message);
    }
  }

  async getKlammBREFields(searchText: string): Promise<string[]> {
    try {
      const sanitizedSearchText = encodeURIComponent(searchText.trim());
      const { data } = await this.axiosKlammInstance.get(
        `${process.env.KLAMM_API_URL}/api/brefields?search=${sanitizedSearchText}`,
      );
      return data;
    } catch (err) {
      throw new HttpException('Error fetching from Klamm', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getKlammBREFieldFromName(fieldName: string): Promise<KlammField[]> {
    try {
      const sanitizedFieldName = encodeURIComponent(fieldName.trim());
      const { data } = await this.axiosKlammInstance.get(`${process.env.KLAMM_API_URL}/api/brefields`, {
        params: { name: sanitizedFieldName },
      });
      if (!data?.data || data.data.length < 1) {
        throw new InvalidFieldRequest('Field name does not exist');
      }
      // Just gets first instance of a field - we shouldn't have multiple with the same name, although ideally we would make sure of that
      return data.data[0];
    } catch (error) {
      if (error instanceof InvalidFieldRequest) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Error fetching from Klamm', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async _syncRules(updatedFiles: string[]): Promise<void> {
    const errors: string[] = [];
    for (const ruleFilepath of updatedFiles) {
      try {
        const rule = await this.ruleDataService.getRuleDataByFilepath(ruleFilepath);
        if (rule) {
          await this._syncRuleWithKlamm(rule);
          this.logger.log(`Rule ${rule.name} synced`);
        } else {
          this.logger.warn(`No rule found for changed file: ${ruleFilepath}`);
        }
      } catch (error) {
        this.logger.error(`Failed to sync rule from file ${ruleFilepath}:`, error.message);
        errors.push(`Failed to sync rule from file ${ruleFilepath}: ${error.message}`);
      }
    }
    if (errors.length > 0) {
      throw new Error(`Errors occurred during rule sync: ${errors.join('; ')}`);
    }
  }

  async _getUpdatedFilesFromGithub(): Promise<{
    updatedFilesSinceLastDeploy: string[];
    lastCommitAsyncTimestamp: number;
  }> {
    try {
      // Get last updated time from from db
      const timestamp = await this._getLastSyncTimestamp();
      const date = new Date(timestamp);
      const formattedDate = date.toISOString().split('.')[0] + 'Z'; // Format required for github api
      this.logger.log(`Getting files from Github from ${formattedDate} onwards...`);
      // Fetch commits since the specified timestamp
      // The dev branch is used because the rules should always be updated on the dev branch before production
      // so this is an appropriate reference to sync from
      const commitsResponse = await this.axiosGithubInstance.get(
        `${GITHUB_RULES_REPO}/commits?since=${formattedDate}&sha=dev`,
      );
      const commits = commitsResponse.data.reverse();
      let lastCommitAsyncTimestamp;
      // Fetch details for each commit to get the list of changed files
      const updatedFiles = new Set<string>();
      for (const commit of commits) {
        const commitDetailsResponse = await this.axiosGithubInstance.get(commit.url);
        const commitDetails = commitDetailsResponse.data;
        if (commitDetails.files) {
          for (const file of commitDetails.files) {
            if (file.filename.startsWith('rules/')) {
              updatedFiles.add(file.filename.replace(/^rules\//, ''));
            }
          }
        }
        lastCommitAsyncTimestamp = new Date(commitDetails.commit.author.date).getTime() + 1000;
      }
      return { updatedFilesSinceLastDeploy: Array.from(updatedFiles), lastCommitAsyncTimestamp };
    } catch (error) {
      this.logger.error('Error fetching updated files from GitHub:', error);
      throw new Error('Error fetching updated files from GitHub');
    }
  }

  async _syncRuleWithKlamm(rule: RuleData) {
    try {
      // Get the inputs and outputs for the rule
      const { inputs, outputs } = await this._getInputOutputFieldsData(rule);
      // Get child rules of the rule
      const childRules = await this._getChildRules(rule);
      // Configure payload to add or update
      const payloadToAddOrUpdate = {
        name: rule.name,
        label: rule.title,
        rule_inputs: inputs,
        rule_outputs: outputs,
        child_rules: childRules,
      };
      // Add or update the rule in Klamm
      await this._addOrUpdateRuleInKlamm(payloadToAddOrUpdate);
    } catch (error) {
      this.logger.error(`Error syncing ${rule.name}`, error.message);
      throw new Error(`Error syncing ${rule.name}`);
    }
  }

  async _getInputOutputFieldsData(rule: RuleData): Promise<{ inputs: KlammField[]; outputs: KlammField[] }> {
    try {
      const ruleDir = 'prod'; // Currently sycning with prod rules
      const { inputs, resultOutputs } = await this.ruleMappingService.inputOutputSchemaFile(rule.filepath, ruleDir);
      const inputIds = inputs.map(({ id }) => Number(id));
      const outputIds = resultOutputs.map(({ id }) => Number(id));
      const klammFields: KlammField[] = await this._getAllKlammFields();
      const inputResults = this._getFieldsFromIds(klammFields, inputIds);
      const outputResults = this._getFieldsFromIds(klammFields, outputIds);
      return { inputs: inputResults, outputs: outputResults };
    } catch (error) {
      this.logger.error(`Error getting input/output fields for rule ${rule.name}`, error.message);
      throw new Error(`Error getting input/output fields for rule ${rule.name}`);
    }
  }

  _getFieldsFromIds(klammFields: KlammField[], ids: number[]): KlammField[] {
    const fieldObjects: KlammField[] = [];
    klammFields.forEach((fieldObject) => {
      if (ids.includes(fieldObject.id)) {
        fieldObjects.push(fieldObject);
      }
    });
    return fieldObjects;
  }

  async _getAllKlammFields(): Promise<KlammField[]> {
    try {
      const response = await this.axiosKlammInstance.get(`${process.env.KLAMM_API_URL}/api/brerules`);
      return response.data.data;
    } catch (error) {
      this.logger.error('Error fetching fields from Klamm', error.message);
      throw new Error(`Error fetching fields from Klamm: ${error.message}`);
    }
  }

  async _getChildRules(rule: RuleData) {
    try {
      const fileContent = await this.documentsService.getFileContent(rule.filepath);
      const ruleContent = JSON.parse(fileContent.toString());
      const childNodeNames: string[] = ruleContent.nodes
        .filter(({ type, content }) => type === 'decisionNode' && content?.key)
        .map(({ content: { key } }) => deriveNameFromFilepath(key));
      const promises = childNodeNames.map((childNodeName) => this._getKlammRuleFromName(childNodeName));
      const results = await Promise.all(promises);
      return results.map((response) => response);
    } catch (error) {
      this.logger.error(`Error gettting child rules for ${rule.name}:`, error.message);
      throw new Error(`Error gettting child rules for ${rule.name}`);
    }
  }

  async _addOrUpdateRuleInKlamm(rulePayload: KlammRulePayload) {
    // Check if rule exists already and update it if it does, add it if it doesn't
    const existingRule = await this._getKlammRuleFromName(rulePayload.name);
    if (existingRule) {
      this._updateRuleInKlamm(existingRule.id, rulePayload);
    } else {
      this._addRuleInKlamm(rulePayload);
    }
  }

  async _getKlammRuleFromName(ruleName: string): Promise<KlammRule> {
    try {
      const { data } = await this.axiosKlammInstance.get(`${process.env.KLAMM_API_URL}/api/brerules`, {
        params: { name: ruleName },
      });
      return data.data[0];
    } catch (error) {
      this.logger.error(`Error getting rule ${ruleName} from Klamm:`, error.message);
      throw new Error(`Error getting rule ${ruleName} from Klamm`);
    }
  }

  async _addRuleInKlamm(rulePayload: KlammRulePayload) {
    try {
      await this.axiosKlammInstance.post(`${process.env.KLAMM_API_URL}/api/brerules`, rulePayload);
    } catch (error) {
      this.logger.error('Error adding rule to Klamm:', error.message);
      throw new Error('Error adding rule to Klamm');
    }
  }

  async _updateRuleInKlamm(currentKlamRuleId: number, rulePayload: KlammRulePayload) {
    try {
      await this.axiosKlammInstance.put(`${process.env.KLAMM_API_URL}/api/brerules/${currentKlamRuleId}`, rulePayload);
    } catch (error) {
      this.logger.error(`Error updating rule ${currentKlamRuleId} in Klamm:`, error.message);
    }
  }

  async _updateLastSyncTimestamp(lastSyncTimestamp: number): Promise<void> {
    try {
      await this.klammSyncMetadata.findOneAndUpdate(
        { key: 'singleton' },
        { lastSyncTimestamp },
        { upsert: true, new: true },
      );
    } catch (error) {
      this.logger.error('Failed to update last sync timestamp', error.message);
      throw new Error('Failed to update last sync timestamp');
    }
  }

  private async _getLastSyncTimestamp(): Promise<number> {
    try {
      const record = await this.klammSyncMetadata.findOne({ key: 'singleton' });
      return record ? record.lastSyncTimestamp : 0;
    } catch (error) {
      this.logger.error('Failed to get last sync timestamp:', error.message);
      throw new Error('Failed to get last sync timestamp');
    }
  }
}
