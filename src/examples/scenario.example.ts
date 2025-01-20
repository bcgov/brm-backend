import { ruleExample } from './rule.example';

export const variableExamples = [
  {
    name: 'numberOfChildren',
    value: 4,
    type: 'number',
    _id: '673fb8ffba3406edda2fdc2d',
  },
  {
    name: 'familyComposition',
    value: 'single',
    type: 'string',
    _id: '673fb8ffba3406edda2fdc2e',
  },
  {
    name: 'familyUnitInPayForDecember',
    value: true,
    type: 'boolean',
    _id: '673fb8ffba3406edda2fdc2f',
  },
];

export const expectedResultsExample = [
  {
    name: 'baseAmount',
    value: 120,
    type: 'number',
    _id: '67899ac720bf8b927ca569af',
  },
  {
    name: 'childrenAmount',
    value: 80,
    type: 'number',
    _id: '67899ac720bf8b927ca569b0',
  },
  {
    name: 'isEligible',
    value: true,
    type: 'boolean',
    _id: '67899ac720bf8b927ca569b1',
  },
  {
    name: 'supplementAmount',
    value: 200,
    type: 'number',
    _id: '67899ac720bf8b927ca569b2',
  },
];

export const scenarioExample = {
  _id: '673e6ae3ba3406edda2fc25e',
  title: 'Testing Winter Supplement',
  ruleID: ruleExample._id,
  variables: variableExamples,
  expectedResults: expectedResultsExample,
  filepath: ruleExample.filepath,
  __v: 1,
};

export const scenarioCSVExample = `Scenario,Results Match Expected (Pass/Fail),Input: familyComposition,Input: familyUnitInPayForDecember,Input: numberOfChildren,Expected Result: baseAmount,Expected Result: childrenAmount,Expected Result: isEligible,Expected Result: supplementAmount,Result: baseAmount,Result: childrenAmount,Result: isEligible,Result: supplementAmount,Error?
Testing Winter Supplement,Pass,single,true,4,120,80,true,200,120,80,true,200,`;
