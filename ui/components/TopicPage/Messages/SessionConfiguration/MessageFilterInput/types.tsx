export type JsonType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';

export type MessageFilter = {
  value: string | undefined;
}

export type MessageFilterChain = {
  filters: Record<string, MessageFilter>;
  disabledFilters: string[];
  mode: 'all' | 'any';
}
