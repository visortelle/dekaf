import {TopicType} from "../../Message/ReprocessMessage/types";

export type JsonType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';

export type Collection = {
  id: string,
  name: string,
  filters: Record<string, Filter>,
}

export type CollectionInfo = {
  id: string;
  name: string;
}

export type Filter = {
  value: string | undefined;
  description: string;
  name: string;
  scope?: {
    tenant?: string;
    namespace?: string;
    topicName?: string;
    topicType?: TopicType;
  }
}

export type ChainEntry = {
  filter: Filter;
}

export type Chain = {
  filters: Record<string, ChainEntry>;
  disabledFilters: string[];
  mode: 'all' | 'any';
}
