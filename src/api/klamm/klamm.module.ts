import { Module, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RuleDataModule } from '../ruleData/ruleData.module';
import { RuleMappingModule } from '../ruleMapping/ruleMapping.module';
import { KlammSyncMetadata, KlammSyncMetadataSchema } from './klammSyncMetadata.schema';
import { KlammController } from './klamm.controller';
import { KlammService } from './klamm.service';

@Module({
  imports: [
    RuleDataModule,
    RuleMappingModule,
    MongooseModule.forFeature([{ name: KlammSyncMetadata.name, schema: KlammSyncMetadataSchema }]),
  ],
  controllers: [KlammController],
  providers: [KlammService, Logger],
})
export class KlammModule {}
