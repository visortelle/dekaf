// Canonical keys + default widths (px) for the resizable columns of the consumer-session
// message table. The `index` column is intentionally excluded: it stays a fixed-width sticky
// column whose width feeds `publishTime`'s sticky offset. Value-projection columns are dynamic
// and keep their own configured widths.
export type MessageColumnKey =
  | 'publishTime'
  | 'key'
  | 'value'
  | 'sessionTargetIndex'
  | 'topic'
  | 'producerName'
  | 'schemaVersion'
  | 'size'
  | 'properties'
  | 'eventTime'
  | 'brokerPublishTime'
  | 'messageId'
  | 'sequenceId'
  | 'orderingKey'
  | 'redeliveryCount'
  | 'sessionContextState';

export const messageColumnDefaultWidths: Record<MessageColumnKey, number> = {
  publishTime: 180,
  key: 160,
  value: 240,
  sessionTargetIndex: 64,
  topic: 460,
  producerName: 380,
  schemaVersion: 120,
  size: 96,
  properties: 240,
  eventTime: 200,
  brokerPublishTime: 200,
  messageId: 300,
  sequenceId: 100,
  orderingKey: 110,
  redeliveryCount: 130,
  sessionContextState: 380,
};

/** The message columns a user may DRAG into any order - everything except the sticky index /
  * publish-time pair. This is also the default order. */
export const reorderableMessageColumns: MessageColumnKey[] = [
  'key',
  'value',
  'sessionTargetIndex',
  'topic',
  'producerName',
  'schemaVersion',
  'size',
  'properties',
  'eventTime',
  'brokerPublishTime',
  'messageId',
  'sequenceId',
  'orderingKey',
  'redeliveryCount',
  'sessionContextState',
];

/** Everything the header needs to render one reorderable column, keyed like the row cells. */
import type { SortKey } from './sort';

export const messageThMeta: Record<MessageColumnKey, { testId: string; title: string; sortKey: SortKey; helpKey: string }> = {
  publishTime: { testId: 'cs-th-publishTime', title: 'Publish time', sortKey: 'publishTime', helpKey: 'publishTime' },
  key: { testId: 'cs-th-key', title: 'Key', sortKey: 'key', helpKey: 'key' },
  value: { testId: 'cs-th-value', title: 'Value', sortKey: 'value', helpKey: 'value' },
  sessionTargetIndex: { testId: 'cs-th-target', title: 'Target', sortKey: 'sessionTargetIndex', helpKey: 'sessionTargetIndex' },
  topic: { testId: 'cs-th-topic', title: 'Topic', sortKey: 'topic', helpKey: 'topic' },
  producerName: { testId: 'cs-th-producer', title: 'Producer', sortKey: 'producerName', helpKey: 'producerName' },
  schemaVersion: { testId: 'cs-th-schemaVersion', title: 'Schema version', sortKey: 'schemaVersion', helpKey: 'schemaVersion' },
  size: { testId: 'cs-th-size', title: 'Size', sortKey: 'size', helpKey: 'size' },
  properties: { testId: 'cs-th-properties', title: 'Properties', sortKey: 'properties', helpKey: 'propertiesMap' },
  eventTime: { testId: 'cs-th-eventTime', title: 'Event time', sortKey: 'eventTime', helpKey: 'eventTime' },
  brokerPublishTime: { testId: 'cs-th-brokerPublishTime', title: 'Broker pub. time', sortKey: 'brokerPublishTime', helpKey: 'brokerPublishTime' },
  messageId: { testId: 'cs-th-messageId', title: 'Message Id', sortKey: 'messageId', helpKey: 'messageId' },
  sequenceId: { testId: 'cs-th-sequenceId', title: 'Sequence Id', sortKey: 'sequenceId', helpKey: 'sequenceId' },
  orderingKey: { testId: 'cs-th-orderingKey', title: 'Ordering key', sortKey: 'orderingKey', helpKey: 'orderingKey' },
  redeliveryCount: { testId: 'cs-th-redeliveryCount', title: 'Redelivery count', sortKey: 'redeliveryCount', helpKey: 'redeliveryCount' },
  sessionContextState: { testId: 'cs-th-sessionContextState', title: 'Session Context State', sortKey: 'sessionContextStateJson', helpKey: 'sessionContextStateJson' },
};
