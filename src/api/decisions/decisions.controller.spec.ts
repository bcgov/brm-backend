import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { DecisionsController } from './decisions.controller';
import { DecisionsService } from './decisions.service';
import { EvaluateDecisionDto, EvaluateDecisionWithContentDto } from './dto/evaluate-decision.dto';
import { ValidationError } from './validations/validation.error';

describe('DecisionsController', () => {
  let controller: DecisionsController;
  let service: DecisionsService;
  const ruleDir = 'prod';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DecisionsController],
      providers: [
        {
          provide: DecisionsService,
          useValue: {
            runDecisionByContent: jest.fn(),
            runDecisionByFile: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DecisionsController>(DecisionsController);
    service = module.get<DecisionsService>(DecisionsService);
  });

  it('should call runDecisionByContent with correct parameters', async () => {
    const dto: EvaluateDecisionWithContentDto = {
      ruleContent: JSON.stringify({ nodes: [], edges: [] }),
      context: { value: 'context' },
      trace: false,
      ruleDir,
    };
    await controller.evaluateDecisionByContent(dto);
    expect(service.runDecisionByContent).toHaveBeenCalledWith(
      JSON.parse(dto.ruleContent),
      dto.context,
      {
        trace: dto.trace,
        undefined,
      },
      ruleDir,
    );
  });

  it('should throw an error when runDecision fails', async () => {
    const dto: EvaluateDecisionWithContentDto = {
      ruleContent: JSON.stringify({ nodes: [], edges: [] }),
      context: { value: 'context' },
      trace: false,
      ruleDir,
    };
    (service.runDecisionByContent as jest.Mock).mockRejectedValue(new Error('Error'));
    await expect(controller.evaluateDecisionByContent(dto)).rejects.toThrow(HttpException);
  });

  it('should throw a ValidationError when runDecision fails', async () => {
    const dto: EvaluateDecisionWithContentDto = {
      ruleContent: JSON.stringify({ nodes: [], edges: [] }),
      context: { value: 'context' },
      trace: false,
      ruleDir,
    };
    (service.runDecisionByContent as jest.Mock).mockRejectedValue(new ValidationError('Error'));

    await expect(controller.evaluateDecisionByContent(dto)).rejects.toThrow(HttpException);
    await expect(controller.evaluateDecisionByContent(dto)).rejects.toThrow(
      new HttpException('Error', HttpStatus.BAD_REQUEST),
    );
  });

  it('should call runDecisionByFile with correct parameters', async () => {
    const dto: EvaluateDecisionDto = { context: { value: 'context' }, trace: false, ruleDir };
    const ruleFileName = 'rule';
    await controller.evaluateDecisionByFile(ruleFileName, dto);
    expect(service.runDecisionByFile).toHaveBeenCalledWith(ruleFileName, dto.context, { trace: dto.trace }, ruleDir);
  });

  it('should throw an error when runDecisionByFile fails', async () => {
    const dto: EvaluateDecisionDto = { context: { value: 'context' }, trace: false, ruleDir };
    const ruleFileName = 'rule';
    (service.runDecisionByFile as jest.Mock).mockRejectedValue(new Error('Error'));
    await expect(controller.evaluateDecisionByFile(ruleFileName, dto)).rejects.toThrow(HttpException);
  });
});
