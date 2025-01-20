export const klammResponseExamples = {
  breFields: {
    data: [
      {
        id: 1,
        name: 'isEligible',
        label: 'Is Eligible',
        data_type: {
          id: 5,
          name: 'true-false',
          short_description: 'True/False',
          bre_value_type: {
            id: 7,
            name: 'Boolean',
          },
        },
      },
    ],
  },
  breRules: [
    {
      id: 17,
      name: 'wintersupplement',
      label: 'Winter Supplement',
      description: null,
      internal_description: null,
      rule_inputs: [
        {
          id: 19,
          name: 'familyUnitInPayForDecember',
          label: 'Family Unit In Pay For December',
          help_text: null,
          data_type_id: 5,
          description: 'Family Unit in receipt of assistance for the month of december.',
          data_validation_id: null,
          pivot: {
            bre_rule_id: 17,
            bre_field_id: 19,
            created_at: '2024-10-29T16:07:35.000000Z',
            updated_at: '2024-10-29T16:07:35.000000Z',
          },
        },
        {
          id: 16,
          name: 'familyComposition',
          label: 'Family Composition',
          help_text: null,
          data_type_id: 1,
          description: null,
          created_at: '2024-08-30T22:56:49.000000Z',
          updated_at: '2024-09-18T17:38:10.000000Z',
          data_validation_id: 20,
          pivot: {
            bre_rule_id: 17,
            bre_field_id: 16,
            created_at: '2024-10-22T21:57:57.000000Z',
            updated_at: '2024-10-22T21:57:57.000000Z',
          },
        },
      ],
      rule_outputs: [
        {
          id: 6,
          name: 'childrenAmount',
          label: 'Children Amount',
          help_text: null,
          data_type_id: 10,
          description: null,
          created_at: '2024-08-30T22:56:49.000000Z',
          updated_at: '2024-08-30T22:56:49.000000Z',
          data_validation_id: null,
          pivot: {
            bre_rule_id: 17,
            bre_field_id: 6,
            created_at: '2024-10-22T21:57:57.000000Z',
            updated_at: '2024-10-22T21:57:57.000000Z',
          },
        },
      ],
      parent_rules: [],
      child_rules: [],
      icmcdw_fields: [],
    },
  ],
};
