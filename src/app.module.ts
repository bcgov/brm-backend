import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { GithubAuthModule } from './auth/github-auth/github-auth.module';
import { RuleDataModule } from './api/ruleData/ruleData.module';
import { RuleMappingModule } from './api/ruleMapping/ruleMapping.module';
import { KlammModule } from './api/klamm/klamm.module';
import { DecisionsController } from './api/decisions/decisions.controller';
import { DecisionsService } from './api/decisions/decisions.service';
import { DocumentsController } from './api/documents/documents.controller';
import { DocumentsService } from './api/documents/documents.service';
import { ScenarioData, ScenarioDataSchema } from './api/scenarioData/scenarioData.schema';
import { ScenarioDataController } from './api/scenarioData/scenarioData.controller';
import { ScenarioDataService } from './api/scenarioData/scenarioData.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Make the ConfigModule globally available
      load: [
        () => ({
          RULES_DIRECTORY: process.env.RULES_DIRECTORY || 'rules',
        }),
      ],
    }),
    MongooseModule.forRoot(process.env.MONGODB_URL),
    MongooseModule.forFeature([{ name: ScenarioData.name, schema: ScenarioDataSchema }]),
    GithubAuthModule,
    RuleDataModule,
    RuleMappingModule,
    KlammModule,
  ],
  controllers: [DecisionsController, DocumentsController, ScenarioDataController],
  providers: [Logger, DecisionsService, DocumentsService, ScenarioDataService],
})
export class AppModule {}
