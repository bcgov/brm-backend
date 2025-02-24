import { ObjectId } from 'mongodb';
import { Model, Types } from 'mongoose';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { DocumentsService } from '../documents/documents.service';
import { RuleData, RuleDataDocument } from './ruleData.schema';
import { RuleDraft, RuleDraftDocument } from './ruleDraft.schema';
import { deriveNameFromFilepath } from '../../utils/helpers';
import { RULE_VERSION } from './ruleVersion';
import { CategoryObject, PaginationDto } from './dto/pagination.dto';

const GITHUB_RULES_REPO = process.env.GITHUB_RULES_REPO || 'https://api.github.com/repos/bcgov/brms-rules';

@Injectable()
export class RuleDataService {
  private categories: Array<CategoryObject> = [];
  constructor(
    @InjectModel(RuleData.name) private ruleDataModel: Model<RuleDataDocument>,
    @InjectModel(RuleDraft.name) private ruleDraftModel: Model<RuleDraftDocument>,
    private documentsService: DocumentsService,
    private readonly logger: Logger,
  ) {}

  async onModuleInit() {
    this.logger.log('Syncing existing rules with any updates to the rules repository');
    const existingRules = await this.getAllRuleData();
    const { data: existingRuleData } = existingRules;
    this.updateCategories(existingRuleData);
    this.updateInReviewStatus(existingRuleData);
    this.addUnsyncedFiles(existingRuleData);
  }

  private updateCategories(ruleData: RuleData[]) {
    const filePathsArray = ruleData.map((filePath) => filePath.filepath);
    const splitFilePaths = filePathsArray.map((filepath) => {
      const parts = filepath.split('/');
      return parts.slice(0, -1);
    });
    const categorySet = [...new Set(splitFilePaths.flat())].sort((a, b) => a.localeCompare(b));
    this.categories = categorySet.map((category: string) => ({ text: category, value: category }));
  }

  async getAllRuleData(
    params?: PaginationDto,
  ): Promise<{ data: RuleData[]; total: number; categories: Array<CategoryObject> }> {
    try {
      const { page = 1, pageSize = 5000, sortField, sortOrder, filters, searchTerm } = params || {};
      const queryConditions: any[] = [];

      // search
      if (searchTerm) {
        queryConditions.push({
          $or: [{ title: { $regex: searchTerm, $options: 'i' } }, { filepath: { $regex: searchTerm, $options: 'i' } }],
        });
      }

      // filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) {
            if (key === 'filepath') {
              if (Array.isArray(value) && value.length > 0) {
                queryConditions.push({
                  $or: value.map((filter: string) => ({
                    filepath: {
                      $regex: new RegExp(`(^${filter}/|/${filter}/)`, 'i'),
                    },
                  })),
                });
              }
            } else if (Array.isArray(value)) {
              queryConditions.push({ [key]: { $in: value } });
            } else {
              queryConditions.push({ [key]: value });
            }
          }
        });
      }

      // Construct the final query using $and
      const query = queryConditions.length > 0 ? { $and: queryConditions } : {};

      // Prepare sort options
      const sortOptions: any = {};
      if (sortField && sortOrder) {
        sortOptions[sortField] = sortOrder === 'ascend' ? 1 : -1;
      }

      // Get total count of documents matching the query
      const total = await this.ruleDataModel.countDocuments(query);
      // Execute the query with pagination and sorting
      const data = await this.ruleDataModel
        .find(query)
        .sort(sortOptions)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean()
        .exec();

      return { data, total, categories: this.categories };
    } catch (error) {
      throw new Error(`Error getting all rule data: ${error.message}`);
    }
  }

  async getRuleDataWithDraft(ruleId: string): Promise<RuleDraft> {
    try {
      const { ruleDraft } = await this.ruleDataModel.findById(ruleId).populate('ruleDraft').exec();
      return ruleDraft as RuleDraft;
    } catch (error) {
      throw new Error(`Error getting draft for ${ruleId}: ${error.message}`);
    }
  }

  async getRuleDataWithDraftByFilepath(filepath: string): Promise<RuleDraft> {
    try {
      const { ruleDraft } = await this.ruleDataModel.findOne({ filepath }).populate('ruleDraft').exec();
      return ruleDraft as RuleDraft;
    } catch (error) {
      throw new Error(`Error getting draft for ${filepath}: ${error.message}`);
    }
  }

  async getRuleData(ruleId: string): Promise<RuleData> {
    try {
      const ruleData = await this.ruleDataModel.findOne({ _id: ruleId }).exec();
      if (!ruleData) {
        throw new Error('Rule data not found');
      }
      return ruleData;
    } catch (error) {
      throw new Error(`Error getting all rule data for ${ruleId}: ${error.message}`);
    }
  }

  async getRuleDataByFilepath(filepath: string): Promise<RuleData> {
    try {
      const ruleData = await this.ruleDataModel.findOne({ filepath }).exec();
      return ruleData;
    } catch (error) {
      throw new Error(`Error getting all rule data for ${filepath}: ${error.message}`);
    }
  }

  async _addOrUpdateDraft(ruleData: Partial<RuleData>): Promise<Partial<RuleData>> {
    // If there is a rule draft, update that document specifically
    // This is necessary because we don't store the draft on the ruleData object directly
    // Instead it is stored elsewhere and linked to the ruleData via its id
    if (ruleData.ruleDraft && typeof ruleData.ruleDraft === 'string') {
      ruleData.ruleDraft = new Types.ObjectId(`${ruleData.ruleDraft}`);
    }
    if (ruleData?.ruleDraft) {
      const newDraft = new this.ruleDraftModel(ruleData.ruleDraft);
      const savedDraft = await newDraft.save();
      ruleData.ruleDraft = savedDraft._id as Types.ObjectId;
    }
    return ruleData;
  }

  async createRuleData(ruleData: Partial<RuleData>): Promise<RuleData> {
    try {
      if (!ruleData._id) {
        const newRuleID = new ObjectId();
        ruleData._id = newRuleID.toHexString();
      }
      ruleData.name = deriveNameFromFilepath(ruleData.filepath);
      ruleData = await this._addOrUpdateDraft(ruleData);
      const newRuleData = new this.ruleDataModel(ruleData);
      const response = await newRuleData.save();
      const existingRules = await this.getAllRuleData();
      this.updateCategories(existingRules.data);
      return response;
    } catch (error) {
      this.logger.error(error.message);
      throw new Error(`Failed to add rule data: ${error.message}`);
    }
  }

  async updateRuleData(ruleId: string, updatedData: Partial<RuleData>): Promise<RuleData> {
    try {
      const existingRuleData = await this.ruleDataModel.findOne({ _id: ruleId }).exec();
      if (!existingRuleData) {
        throw new Error('Rule data not found');
      }
      if (updatedData.filepath) {
        updatedData.name = deriveNameFromFilepath(updatedData.filepath);
      }
      updatedData = await this._addOrUpdateDraft(updatedData);
      Object.assign(existingRuleData, updatedData);
      return await existingRuleData.save();
    } catch (error) {
      this.logger.error('Error updating rule', error.message);
      throw new Error(`Failed to update rule data: ${error.message}`);
    }
  }

  async deleteRuleData(ruleId: string): Promise<RuleData> {
    try {
      const deletedRuleData = await this.ruleDataModel.findOneAndDelete({ _id: ruleId }).exec();
      if (!deletedRuleData) {
        throw new Error('Rule data not found');
      }
      const existingRules = await this.getAllRuleData();
      this.updateCategories(existingRules.data);

      return deletedRuleData;
    } catch (error) {
      throw new Error(`Failed to delete rule data: ${error.message}`);
    }
  }

  /**
   * Remove current reviewBranch if it no longer exists (aka review branch has been merged in and removed)
   */
  async updateInReviewStatus(existingRules: RuleData[]) {
    try {
      // Get current branches from github
      const headers: Record<string, string> = {};
      if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
      }
      const branchesResponse = await axios.get(`${GITHUB_RULES_REPO}/branches`, { headers });
      const currentBranches = branchesResponse?.data.map(({ name }) => name);
      // Remove current reviewBranch if it no longer exists
      if (currentBranches) {
        existingRules.forEach(({ _id, reviewBranch }) => {
          if (reviewBranch && !currentBranches.includes(reviewBranch)) {
            this.updateRuleData(_id, { reviewBranch: null });
          }
        });
      }
    } catch (error) {
      this.logger.error('Error updating review status:', error.message);
    }
  }

  /**
   * Add rules to the db that exist in the repo, but not yet the db
   */
  async addUnsyncedFiles(existingRules: RuleData[]) {
    // Find rules not yet defined in db (but with an exisitng JSON file) and add them
    const jsonRuleDocuments = await this.documentsService.getAllJSONFiles();
    jsonRuleDocuments.forEach((filepath: string) => {
      const existingRule = existingRules.find((rule) => rule.filepath === filepath);
      if (!existingRule) {
        this.createRuleData({ filepath, isPublished: true });
      } else if (!existingRule.isPublished) {
        // Update status to isPublished if it isn't yet
        this.updateRuleData(existingRule._id, { isPublished: true });
      }
    });
  }

  /**
   * Retrieves the content for a rule from the "inReview" version of the rule
   *
   * @param ruleFilepath - The file path of the rule.
   * @returns A promise that resolves to a Buffer containing the rule content.
   * @throws Will throw an error if the file does not exist or if there is an issue retrieving the content.
   */
  async getRuleFileFromReview(ruleFilepath: string) {
    // Get the review branch name from the ruleData
    const ruleData = await this.getRuleDataByFilepath(ruleFilepath);
    if (!ruleData || !ruleData.reviewBranch) {
      throw new Error('No branch in review');
    }
    const { reviewBranch } = ruleData;
    try {
      // Get the file from the review branch
      const contentsUrl = `${GITHUB_RULES_REPO}/contents/rules/${ruleFilepath}`;
      const getFileResponse = await axios.get(contentsUrl, {
        params: { ref: reviewBranch }, // Ensure we're checking the correct branch
      });
      return getFileResponse.data;
    } catch (error: any) {
      if (error.response && error.response.status !== 404) {
        throw error; // Rethrow if error is not due to the file not existing
      }
      return null;
    }
  }

  /**
   * Retrieves the content for a rule from the specified file path and version.
   *
   * @param ruleFilepath - The file path of the rule.
   * @param version - The version of the rule to retrieve. Defaults to production version of rule
   * @returns A promise that resolves to a Buffer containing the rule content.
   * @throws Will throw an error if the file does not exist or if there is an issue retrieving the content.
   */
  async getContentForRule(
    ruleFilepath: string,
    version: keyof typeof RULE_VERSION = RULE_VERSION.inProduction,
  ): Promise<Buffer> {
    if (version === RULE_VERSION.draft) {
      const { content } = await this.getRuleDataWithDraftByFilepath(ruleFilepath);
      const jsonString = JSON.stringify(content);
      return Buffer.from(jsonString, 'utf-8');
    }
    if (version === RULE_VERSION.inReview) {
      const file = await this.getRuleFileFromReview(ruleFilepath);
      if (!file || !file.content) {
        throw new Error('File does not exist');
      }
      return Buffer.from(file.content, 'base64');
    }
    return await this.documentsService.getFileContent(ruleFilepath, version === RULE_VERSION.inDev);
  }

  /**
   * Retrieves the content for a rule from the specified file path.
   *
   * @param rulePath - The path to the rule file, which can include a version query parameter (e.g., '?version=draft').
   * @param isDev - Optional flag indicating whether to use the development version of the rule. Defaults to `false`.
   * @returns A promise that resolves to a Buffer containing the rule content.
   */
  async getContentForRuleFromFilepath(rulePath: string, isDev: boolean = false): Promise<Buffer> {
    try {
      const [filepath, version] = rulePath.split('?version='); // Rules can specify draft or inReview with a query param
      return this.getContentForRule(filepath, version || isDev ? RULE_VERSION.inDev : RULE_VERSION.inProduction);
    } catch (error) {
      throw new Error(`Failed to get rule content: ${error.message}`);
    }
  }
}
