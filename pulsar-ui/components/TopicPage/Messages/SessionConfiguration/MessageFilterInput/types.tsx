export type JsonType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
export type FilterSyntax = 'js' | 'python';

export type Filter = {
  syntax: FilterSyntax;
  value: string;
}

export type ChainEntry = {
  filter: Filter;
}

export type Chain = {
  filters: Record<string, ChainEntry>;
  disabledFilters: string[];
  mode: 'all' | 'any';
}
