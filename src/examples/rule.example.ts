import * as exampleRuleContent from './exampleRule.json';

export const ruleExample = {
  _id: '12345678abcdefg',
  name: 'wintersupplement',
  filepath: 'general-supplements/wintersupplement.json',
  isPublished: true,
  __v: 0,
  ruleDraft: '987654321abcdefgh',
  reviewBranch: null,
  title: 'Winter Supplement',
};

export const ruleExample2 = {
  _id: '12345678abcdefg2',
  name: 'natalsupplement',
  title: 'Natal Supplement',
  filepath: 'health-supplements/natalsupplement.json',
  ruleDraft: 'abcdefg12345678',
  __v: 0,
};

export const ruleList = [
  { text: 'general-supplements', value: 'general-supplements' },
  { text: 'health-supplements', value: 'health-supplements' },
];

export const ruleInputMetadata = exampleRuleContent.nodes[0].content.fields;

export const ruleOutputMetadata = exampleRuleContent.nodes[1].content.fields;

export const ruleInputs = ruleInputMetadata.reduce(
  (acc, meta) => ({
    ...acc,
    [meta.field]: meta.defaultValue,
  }),
  {},
);

export const ruleOutputs = ruleOutputMetadata.reduce(
  (acc, meta) => ({
    ...acc,
    [meta.field]: meta.defaultValue,
  }),
  {},
);

export const ruleContentExample = exampleRuleContent;
