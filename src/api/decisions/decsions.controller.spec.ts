import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { DecisionsController } from './decisions.controller';
import { DecisionsService } from './decisions.service';
import { EvaluateDecisionDto, EvaluateDecisionWithContentDto } from './dto/evaluate-decision.dto';

describe('DecisionsController', () => {
  let controller: DecisionsController;
  let service: DecisionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DecisionsController],
      providers: [
        {
          provide: DecisionsService,
          useValue: {
            runDecision: jest.fn(),
            runDecisionByFile: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DecisionsController>(DecisionsController);
    service = module.get<DecisionsService>(DecisionsService);
  });

  it('should call runDecision with correct parameters', async () => {
    const dto: EvaluateDecisionWithContentDto = {
      content: { value: 'content' },
      context: { value: 'context' },
      trace: false,
    };
    await controller.evaluateDecisionByContent(dto);
    expect(service.runDecision).toHaveBeenCalledWith(dto.content, dto.context, { trace: dto.trace });
  });

  it('should throw an error when runDecision fails', async () => {
    const dto: EvaluateDecisionWithContentDto = {
      content: { value: 'content' },
      context: { value: 'context' },
      trace: false,
    };
    (service.runDecision as jest.Mock).mockRejectedValue(new Error('Error'));
    await expect(controller.evaluateDecisionByContent(dto)).rejects.toThrow(HttpException);
  });

  it('should call runDecisionByFile with correct parameters', async () => {
    const dto: EvaluateDecisionDto = { context: { value: 'context' }, trace: false };
    const ruleFileName = 'rule';
    await controller.evaluateDecisionByFile(ruleFileName, dto);
    expect(service.runDecisionByFile).toHaveBeenCalledWith(ruleFileName, dto.context, { trace: dto.trace });
  });

  it('should throw an error when runDecisionByFile fails', async () => {
    const dto: EvaluateDecisionDto = { context: { value: 'context' }, trace: false };
    const ruleFileName = 'rule';
    (service.runDecisionByFile as jest.Mock).mockRejectedValue(new Error('Error'));
    await expect(controller.evaluateDecisionByFile(ruleFileName, dto)).rejects.toThrow(HttpException);
  });
});
