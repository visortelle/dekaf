export type TableFilterDescriptor =
  StringFilterDescriptor |
  BooleanFilterDescriptor |
  NumberFilterDescriptor |
  SingleOptionFilterDescriptor;

export type TableFilterValue =
  StringFilterValue |
  BooleanFilterValue |
  NumberFilterValue |
  SingleOptionFilterValue;

export type StringFilterDescriptor = {
  type: 'string',
  defaultValue: StringFilterValue
};
export type StringFilterValue = {
  type: 'string';
  value: string
};

export type NumberFilterDescriptor = {
  type: 'number',
  defaultValue: NumberFilterValue
};
export type NumberFilterOperation = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
export type NumberFilterValue = {
  type: 'number';
  op: NumberFilterOperation;
  value: number
};

export type Option = { value: string; label: string };
export type SingleOptionFilterDescriptor = {
  type: 'singleOption';
  options: Option[];
  defaultValue: SingleOptionFilterValue;
};
export type SingleOptionFilterValue = {
  type: 'singleOption';
  value: string
};

export type BooleanFilterDescriptor = {
  type: 'boolean';
  defaultValue: BooleanFilterValue;
};
export type BooleanFilterValue = {
  type: 'boolean';
  value: boolean
};
