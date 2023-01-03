export type JsonType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';

export type Filter = {
  value: string | undefined;
  description: string | undefined;
}

export type ChainEntry = {
  filter: Filter;
}

export type MessageFilters = {
  [userName: string]: Record<string, ChainEntry>
}

export type Chain = {
  filters: MessageFilters;
  disabledFilters: string[];
  mode: 'all' | 'any';
}
