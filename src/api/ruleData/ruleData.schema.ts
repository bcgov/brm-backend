import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RuleDraftDocument } from './ruleDraft.schema';
import { ApiProperty } from '@nestjs/swagger';
import { ruleExample } from '../../examples/rule.example';

@Schema()
export class RuleData {
  @ApiProperty({
    description: 'The rule ID within the BRM App',
    example: ruleExample._id,
  })
  @Prop({ required: true })
  _id: string;

  @ApiProperty({
    description: 'A unique name derived from the filepath',
    example: ruleExample.name,
  })
  @Prop({ unique: true })
  name: string;

  @ApiProperty({
    description: 'The title of the rule',
    example: ruleExample.title,
  })
  @Prop()
  title: string;

  @ApiProperty({
    description: 'The filepath of the JSON file containing the rule',
    example: ruleExample.filepath,
  })
  @Prop({ required: true })
  filepath: string;

  @ApiProperty({
    description: 'Id for the draft of updated rule content',
    example: ruleExample.ruleDraft,
  })
  @Prop({ type: Types.ObjectId })
  ruleDraft?: RuleDraftDocument | Types.ObjectId;

  @ApiProperty({
    description: 'The name of the branch on github associated with this file',
    example: ruleExample.reviewBranch,
  })
  @Prop()
  reviewBranch?: string;

  @ApiProperty({
    description: 'If the rule has been published',
    example: ruleExample.isPublished,
  })
  @Prop()
  isPublished?: boolean;
}

export type RuleDataDocument = RuleData & Document;

export const RuleDataSchema = SchemaFactory.createForClass(RuleData);
