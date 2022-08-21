import { partition } from "lodash";
import { MessageDescriptor } from "./types";

export type SortKey =
  'publishTime' |
  'key' |
  'topic' |
  'producerName' |
  'value' |
  'jsonValue' |
  'schemaVersion' |
  'size' |
  'properties' |
  'eventTime' |
  'brokerPublishTime' |
  'messageId' |
  'sequenceId' |
  'orderingKey' |
  'redeliveryCount' |
  'aggregate';


export type Sort = { key: SortKey, direction: 'asc' | 'desc' };

export const sortMessages = (messages: MessageDescriptor[], sort: Sort): MessageDescriptor[] => {
  type SortFn = (a: MessageDescriptor, b: MessageDescriptor) => number

  function s(defs: MessageDescriptor[], undefs: MessageDescriptor[], sortFn: SortFn): MessageDescriptor[] {
    let result = defs.sort(sortFn);
    result = sort.direction === 'asc' ? result : result.reverse();
    return result.concat(undefs);
  }

  if (sort.key === 'publishTime') {
    const [defs, undefs] = partition(messages, m => m.publishTime !== undefined);
    const sortFn: SortFn = (a, b) => a.publishTime!.getTime() - b.publishTime!.getTime();
    return s(defs, undefs, sortFn);
  }

  if (sort.key === 'key') {
    const sortFn: SortFn = (a, b) => a.key.localeCompare(b.key, 'en', { numeric: true });
    return s(messages, [], sortFn);
  }

  if (sort.key === 'topic') {
    const sortFn: SortFn = (a, b) => a.topic.localeCompare(b.topic, 'en', { numeric: true });
    return s(messages, [], sortFn);
  }

  if (sort.key === 'producerName') {
    const sortFn: SortFn = (a, b) => a.producerName.localeCompare(b.producerName, 'en', { numeric: true });
    return s(messages, [], sortFn);
  }

  if (sort.key === 'jsonValue') {
    const sortFn: SortFn = (a, b) => a.jsonValue.localeCompare(b.jsonValue, 'en', { numeric: true });
    return s(messages, [], sortFn);
  }

  if (sort.key === 'schemaVersion') {
    const sortFn: SortFn = (a, b) => a.schemaVersion - b.schemaVersion;
    return s(messages, [], sortFn);
  }

  if (sort.key === 'size') {
    const sortFn: SortFn = (a, b) => a.size - b.size;
    return s(messages, [], sortFn);
  }

  if (sort.key === 'properties') {
    const sortFn: SortFn = (a, b) => a.properties.localeCompare(b.properties, 'en', { numeric: true });
    return s(messages, [], sortFn);
  }

  if (sort.key === 'eventTime') {
    const [defs, undefs] = partition(messages, m => m.eventTime !== undefined);
    const sortFn: SortFn = (a, b) => a.eventTime!.getTime() - b.eventTime!.getTime();
    return s(defs, undefs, sortFn);
  }

  if (sort.key === 'brokerPublishTime') {
    const [defs, undefs] = partition(messages, m => m.brokerPublishTime !== undefined);
    const sortFn: SortFn = (a, b) => a.brokerPublishTime!.getTime() - b.brokerPublishTime!.getTime();
    return s(defs, undefs, sortFn);
  }

  if (sort.key === 'sequenceId') {
    const sortFn: SortFn = (a, b) => a.sequenceId - b.sequenceId;
    return s(messages, [], sortFn);
  }

  if (sort.key === 'redeliveryCount') {
    const sortFn: SortFn = (a, b) => a.redeliveryCount - b.redeliveryCount;
    return s(messages, [], sortFn);
  }

  if (sort.key === 'aggregate') {
    const sortFn: SortFn = (a, b) => a.properties.localeCompare(b.properties, 'en', { numeric: true });
    return s(messages, [], sortFn);
  }

  return messages;
}
