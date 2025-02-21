import { Module } from '@nestjs/common';
import { RuleMappingController } from './ruleMapping.controller';
import { RuleMappingService } from './ruleMapping.service';
import { RuleDataModule } from '../ruleData/ruleData.module';

@Module({
  imports: [RuleDataModule],
  controllers: [RuleMappingController],
  providers: [RuleMappingService, RuleDataModule],
  exports: [RuleMappingService],
})
export class RuleMappingModule {}
