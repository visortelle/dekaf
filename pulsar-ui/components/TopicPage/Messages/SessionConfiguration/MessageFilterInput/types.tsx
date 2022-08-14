export type JsonType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
export type FilterLanguage = 'js' | 'python';

export type Filter = {
  language: FilterLanguage;
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
