import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ZenEngine, ZenEvaluateOptions } from '@gorules/zen-engine';
import { RuleContent } from '../ruleMapping/ruleMapping.interface';
import { FileNotFoundError } from '../../utils/readFile';
import { ValidationService } from './validations/validations.service';
import { ValidationError } from './validations/validation.error';
import { RuleDataService } from '../ruleData/ruleData.service';

@Injectable()
export class DecisionsService {
  engine: ZenEngine;
  devEngine: ZenEngine;

  constructor(
    private ruleDataService: RuleDataService,
    private readonly logger: Logger,
  ) {
    // Create a loader function for linked rules
    // This is where we will load different versions of the rules if necessary
    const loader = (isDev: boolean) => async (key: string) => {
      return this.ruleDataService.getContentForRuleFromFilepath(key, isDev);
    };
    // Create the engines for running the rules (one for dev and one for prod)
    this.engine = new ZenEngine({ loader: loader(true) });
    this.devEngine = new ZenEngine({ loader: loader(false) });
  }

  async runDecisionByContent(ruleContent: RuleContent, context: object, options: ZenEvaluateOptions, isDev: boolean) {
    const validator = new ValidationService();
    const ruleInputs = ruleContent?.nodes?.filter((node) => node.type === 'inputNode')[0]?.content;
    try {
      validator.validateInputs(ruleInputs, context);
      const engine = isDev ? this.devEngine : this.engine;
      const decision = engine.createDecision(ruleContent);
      return await decision.evaluate(context, options);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(`Invalid input: ${error.message}`);
      } else {
        this.logger.warn(error.message);
        throw new Error(`Failed to run decision: ${error.message}`);
      }
    }
  }

  async runDecisionByFile(ruleFileName: string, context: object, options: ZenEvaluateOptions, isDev: boolean) {
    try {
      const decisionFile = this.ruleDataService.getContentForRuleFromFilepath(ruleFileName, isDev);
      const content: RuleContent = JSON.parse(decisionFile.toString()); // Convert file buffer to rulecontent
      return this.runDecisionByContent(content, context, options, isDev);
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        throw new HttpException('Rule not found', HttpStatus.NOT_FOUND);
      } else {
        throw new HttpException(`Failed to run decision: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  /** Run the decision by content if it exists, otherwise run by filename */
  async runDecision(
    ruleContent: RuleContent,
    ruleFileName: string,
    context: object,
    options: ZenEvaluateOptions,
    isDev: boolean = false,
  ) {
    if (ruleContent) {
      return await this.runDecisionByContent(ruleContent, context, options, isDev);
    } else {
      return await this.runDecisionByFile(ruleFileName, context, options, isDev);
    }
  }
}
