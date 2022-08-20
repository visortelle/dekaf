import ReactDOMServer from 'react-dom/server';
import s from './Message.module.css'

export type FieldName =
  'messageId' |
  'value' |
  'jsonValue' |
  'brokerPublishTime' |
  'eventTime' |
  'isReplicated' |
  'key' |
  'orderingKey' |
  'producerName' |
  'propertiesMap' |
  'publishTime' |
  'redeliveryCount' |
  'replicatedFrom' |
  'schemaVersion' |
  'sequenceId' |
  'size' |
  'jsonAggregate' |
  'topic';

const helpJsx: Record<FieldName, React.ReactElement | undefined> = {
  key: <span>Messages are optionally tagged with keys, which is useful for things like topic compaction.</span>,
  propertiesMap: <span>An optional key/value map of user-defined properties.</span>,
  producerName: <span>The name of the producer who produces the message. If you do not specify a producer name, the default name is used.</span>,
  topic: <span>The name of the topic that the message is published to.</span>,
  schemaVersion: <span>The version number of the schema that the message is produced with.</span>,
  sequenceId: (
    <div>
      Each Pulsar message belongs to an ordered sequence on its topic. The sequence ID of a message is initially assigned by its producer, indicating its order in that sequence, and can also be customized.
      <br /><br />
      Sequence ID can be used for message deduplication. If brokerDeduplicationEnabled is set to true, the sequence ID of each message is unique within a producer of a topic (non-partitioned) or a partition.
    </div>
  ),
  messageId: <span>The message ID of a message is assigned by bookies as soon as the message is persistently stored. Message ID indicates a message&apos;s specific position in a ledger and is unique within a Pulsar cluster.</span>,
  publishTime: <span>The timestamp of when the message is published. The timestamp is automatically applied by the producer.</span>,
  eventTime: <span>An optional timestamp attached to a message by applications. For example, applications attach a timestamp on when the message is processed.</span>,
  size: <span>Size of the message.</span>,
  brokerPublishTime: (
    <div>
      Broker publish time from broker entry metadata.
      <br /><br />
      <strong>Note that only if the feature is enabled in the broker then the value is available.</strong>
    </div>
  ),
  value: <span>The de-serialized value of the message, according the configured schema.</span>,
  jsonValue: <span>The de-serialized value of the message, according the configured schema.</span>,
  isReplicated: <span>Check whether the message is replicated from other cluster.</span>, // TODO - geo replication
  orderingKey: <span>Ordering key of the message.</span>,
  redeliveryCount: (
    <div>
      Message redelivery count, redelivery count maintain in pulsar broker. When client acknowledge message timeout, broker will dispatch message again with message redelivery count in CommandMessage defined.
      <br /><br />
      Message redelivery increases monotonically in a broker, when topic switch ownership to a another broker redelivery count will be recalculated.
    </div>
  ),
  replicatedFrom: <span>Name of cluster, from which the message is replicated.</span>, // TODO - geo replication
  jsonAggregate: <span>Cumulative state to produce user-defined calculations, preserved between messages.</span>
}
export const help = Object.keys(helpJsx).reduce<Record<string, string | undefined>>((acc, curr) => {
  const tt = helpJsx[curr as FieldName];
  return tt === undefined ? acc : { ...acc, [curr]: ReactDOMServer.renderToStaticMarkup(<div className={s.Tooltip}>{tt}</div>) };
}, {});

