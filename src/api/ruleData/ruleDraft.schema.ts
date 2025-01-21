import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiSchema, ApiProperty } from '@nestjs/swagger';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ruleContentExample } from '../../examples/rule.example';

@Schema()
@ApiSchema({ description: 'Draft of updated rule content' })
export class RuleDraft {
  @ApiProperty({
    description: 'The content of a rule draft.',
    example: ruleContentExample,
  })
  @Prop({ type: MongooseSchema.Types.Mixed })
  content: object;
}

export type RuleDraftDocument = RuleDraft & Document;

export const RuleDraftSchema = SchemaFactory.createForClass(RuleDraft);
