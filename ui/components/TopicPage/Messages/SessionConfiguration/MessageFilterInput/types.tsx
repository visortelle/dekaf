export type JsonType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';

export type Filter = {
  value: string | undefined;
}

export type ChainEntry = {
  filter: Filter;
}

export type Chain = {
  filters: Record<string, ChainEntry>;
  disabledFilters: string[];
  mode: 'all' | 'any';
}
