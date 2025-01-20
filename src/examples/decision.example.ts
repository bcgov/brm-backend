import { ruleOutputs } from './rule.example';

export const decisionExample = {
  performance: '2.656583ms',
  result: ruleOutputs,
  trace: {
    'bd7103da-9a6e-4fbd-ba14-12008e3cd61c': {
      id: 'bd7103da-9a6e-4fbd-ba14-12008e3cd61c',
      name: 'Should Calculate Supplement',
      input: {
        $: {
          $nodes: {
            IsEligible: {
              isEligible: true,
            },
            'Winter Supplement Request': {
              familyComposition: 'single',
              familyUnitInPayForDecember: true,
              numberOfChildren: 4,
            },
          },
          familyComposition: 'single',
          familyUnitInPayForDecember: true,
          isEligible: true,
          numberOfChildren: 4,
        },
        $nodes: {
          IsEligible: {
            isEligible: true,
          },
          'Winter Supplement Request': {
            familyComposition: 'single',
            familyUnitInPayForDecember: true,
            numberOfChildren: 4,
          },
        },
        familyComposition: 'single',
        familyUnitInPayForDecember: true,
        isEligible: true,
        numberOfChildren: 4,
      },
      output: {
        $: {
          $nodes: {
            IsEligible: {
              isEligible: true,
            },
            'Winter Supplement Request': {
              familyComposition: 'single',
              familyUnitInPayForDecember: true,
              numberOfChildren: 4,
            },
          },
          familyComposition: 'single',
          familyUnitInPayForDecember: true,
          isEligible: true,
          numberOfChildren: 4,
        },
        $nodes: {
          IsEligible: {
            isEligible: true,
          },
          'Winter Supplement Request': {
            familyComposition: 'single',
            familyUnitInPayForDecember: true,
            numberOfChildren: 4,
          },
        },
        familyComposition: 'single',
        familyUnitInPayForDecember: true,
        isEligible: true,
        numberOfChildren: 4,
      },
      performance: '207.958µs',
      traceData: {
        statements: [
          {
            id: '38203cc4-5089-4ed7-b19c-58a99b65e545',
          },
        ],
      },
    },
    'd5e41add-1cb0-4e32-8667-ffd548e523bf': {
      id: 'd5e41add-1cb0-4e32-8667-ffd548e523bf',
      name: 'Child Calculation',
      input: {
        familyComposition: 'single',
        familyUnitInPayForDecember: true,
        isEligible: true,
        numberOfChildren: 4,
      },
      output: {
        childrenAmount: 80,
      },
      performance: '55.417µs',
      traceData: {
        index: 0,
        reference_map: {},
        rule: {
          _id: '722b3945-02f5-4210-a9e4-b496d7d9438b',
          'numberOfChildren[4513898e-c063-4670-a99a-804148934985]': '',
        },
      },
    },
    '7b088ca1-2314-45ec-835c-c38e66f7cb5c': {
      id: '7b088ca1-2314-45ec-835c-c38e66f7cb5c',
      name: 'IsEligible',
      input: {
        familyComposition: 'single',
        familyUnitInPayForDecember: true,
        numberOfChildren: 4,
      },
      output: {
        isEligible: true,
      },
      performance: '1.365208ms',
      traceData: {
        isEligible: {
          result: 'true',
        },
      },
    },
    '84cf05d5-9ef3-4e83-bb7c-2b686e6b7815': {
      id: '84cf05d5-9ef3-4e83-bb7c-2b686e6b7815',
      name: 'Total Supplement',
      input: {
        baseAmount: 120,
        childrenAmount: 80,
      },
      output: {
        supplementAmount: 200,
      },
      performance: '11.792µs',
      traceData: {
        index: 0,
        reference_map: {},
        rule: {
          _id: 'aa135592-8426-42ae-8d23-4512caeea78e',
          'baseAmount[6abe1cb3-a3da-4770-abdc-25de26f96a88]': '',
          'childrenAmount[dc3e0c07-45e0-4220-ba8e-f3d654be8f0a]': '',
        },
      },
    },
    '8ac97728-c53d-441b-8c4f-cbce96bbbfb1': {
      id: '8ac97728-c53d-441b-8c4f-cbce96bbbfb1',
      name: 'Winter Supplement Request',
      input: null,
      output: null,
    },
    '86049028-7a4f-4b79-a1b1-025b98061ee0': {
      id: '86049028-7a4f-4b79-a1b1-025b98061ee0',
      name: 'Winter Supplement Response',
      input: null,
      output: null,
    },
    'c3ab217c-22fa-4896-8f29-4a359e12f483': {
      id: 'c3ab217c-22fa-4896-8f29-4a359e12f483',
      name: 'Spouse Calculation',
      input: {
        familyComposition: 'single',
        familyUnitInPayForDecember: true,
        isEligible: true,
        numberOfChildren: 4,
      },
      output: {
        baseAmount: 120,
      },
      performance: '18.042µs',
      traceData: {
        index: 0,
        reference_map: {},
        rule: {
          _id: '741c1d33-0606-4b95-a64b-b27bb9800820',
          'familyComposition[3991b5b8-b68c-493d-a31b-226a0756ff28]': '"single"',
          'numberOfChildren[33d4d4d1-a243-4d7f-8e0c-f73faaeb6cc1]': '$ > 0',
        },
      },
    },
  },
};

export const decisionResultExample = {
  inputs: {
    familyComposition: 'single',
    familyUnitInPayForDecember: true,
    numberOfChildren: 4,
  },
  outputs: {
    baseAmount: 120,
    childrenAmount: 80,
    supplementAmount: 200,
    isEligible: true,
  },
  expectedResults: {
    baseAmount: 120,
    childrenAmount: 80,
    isEligible: true,
    supplementAmount: 200,
  },
  result: {
    baseAmount: 120,
    childrenAmount: 80,
    isEligible: true,
    supplementAmount: 200,
  },
  resultMatch: true,
};
