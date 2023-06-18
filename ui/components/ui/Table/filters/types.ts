export type TableFilterDescriptor =
  StringFilterDescriptor |
  BooleanFilterDescriptor |
  NumberFilterDescriptor |
  OptionFilterDescriptor;

export type TableFilterValue =
  StringFilterValue |
  BooleanFilterValue |
  NumberFilterValue |
  OptionFilterValue;

export type StringFilterDescriptor = { type: 'string' };
export type StringFilterValue = { type: 'string'; value: string };

export type NumberFilterDescriptor = { type: 'number' };
export type NumberFilterOperation = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
export type NumberFilterValue = { type: 'number'; op: NumberFilterOperation; value: number };

export type OptionFilterOption = { value: string; label: string };
export type OptionFilterDescriptor = { type: 'singleOption'; options: OptionFilterOption[], mode: 'single' | 'multiple' };
export type OptionFilterValue = { type: 'singleOption'; value: string };

export type BooleanFilterDescriptor = { type: 'boolean' };
export type BooleanFilterValue = { type: 'boolean'; value: boolean };
