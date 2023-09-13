import { MessageDescriptor } from '../types';
import * as I18n from '../../../app/contexts/I18n/I18n';
import CopyField from '../../../ui/CopyField/CopyField';
import { routes } from '../../../routes';
import { parseTopic } from '../../../pulsar/parse-topic';

export type FieldName =
  'messageId' |
  'bytes' |
  'value' |
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
  'accumulator' |
  'topic';

export const help = {
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
  bytes: <span>Raw message value in bytes.</span>,
  value: <span>The de-serialized value of the message, according the configured schema.</span>,
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
  accumulator: <span>Cumulative state to produce user-defined calculations, preserved between messages.</span>
} as const;

type FieldProps = {
  isShowTooltips: boolean;
  message: MessageDescriptor;
}

export const PublishTimeField: React.FC<FieldProps> = (props) => {
  const i18n = I18n.useContext();
  const date = props.message.publishTime === null ? undefined : new Date(props.message.publishTime);
  return <CopyField isShowTooltips={props.isShowTooltips} title="Publish time" value={date === undefined ? undefined : i18n.formatDateTime(date)} rawValue={date === undefined ? undefined : date.toISOString()} tooltip={help.publishTime} />
}

export const KeyField: React.FC<FieldProps> = (props) => {
  const key = props.message.key === null ? undefined : props.message.key;
  return <CopyField isShowTooltips={props.isShowTooltips} title="Key" value={key} rawValue={key} tooltip={help.key} />
}

export const ValueField: React.FC<FieldProps> = (props) => {
  const value = props.message.value === null ? undefined : limitString(props.message.value, 100);
  return <CopyField isShowTooltips={props.isShowTooltips} title="Value" value={value} rawValue={value} tooltip={help.value} />
}

export const TopicField: React.FC<FieldProps> = (props) => {
  const topic = props.message.topic === null ? undefined : props.message.topic;
  const topicPath = props.message.topic === null ? undefined : parseTopic(props.message.topic);
  const topicHref = topicPath === undefined ?
    undefined :
    routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.messages._.get({ tenant: topicPath.tenant, namespace: topicPath.namespace, topic: topicPath.topic, topicType: topicPath.topicType });

  return <CopyField isShowTooltips={props.isShowTooltips} value={topic} valueHref={topicHref} tooltip={help.topic} />
}

export const ProducerNameField: React.FC<FieldProps> = (props) => {
  const producerName = props.message.producerName === null ? undefined : props.message.producerName;
  return <CopyField isShowTooltips={props.isShowTooltips} title="Producer" value={producerName} rawValue={producerName} tooltip={help.producerName} />
}

export const SchemaVersionField: React.FC<FieldProps> = (props) => {
  const schemaVersion = props.message.schemaVersion?.toString();
  return <CopyField isShowTooltips={props.isShowTooltips} title="Schema version" value={schemaVersion} rawValue={schemaVersion} tooltip={help.schemaVersion} />
}

export const SizeField: React.FC<FieldProps> = (props) => {
  const i18n = I18n.useContext();
  return <CopyField isShowTooltips={props.isShowTooltips} title="Size" value={props.message.size === null ? undefined : i18n.formatBytes(props.message.size)} rawValue={props.message.size === null ? undefined : String(props.message.size)} tooltip={help.size} />
}

export const PropertiesField: React.FC<FieldProps> = (props) => {
  return <CopyField isShowTooltips={props.isShowTooltips} title="Properties" value={JSON.stringify(props.message.properties)} rawValue={JSON.stringify(props.message.properties)} tooltip={help.propertiesMap} />
}

export const EventTimeField: React.FC<FieldProps> = (props) => {
  const i18n = I18n.useContext();
  const date = props.message.eventTime === null ? undefined : new Date(props.message.eventTime);
  return <CopyField isShowTooltips={props.isShowTooltips} title="Event time" value={date === undefined ? undefined : i18n.formatDateTime(date)} rawValue={date === undefined ? undefined : date.toISOString()} tooltip={help.eventTime} />
}

export const BrokerPublishTimeField: React.FC<FieldProps> = (props) => {
  const i18n = I18n.useContext();
  const date = props.message.brokerPublishTime === null ? undefined : new Date(props.message.brokerPublishTime);
  return <CopyField isShowTooltips={props.isShowTooltips} title="Broker pub. time" value={date === undefined ? undefined : i18n.formatDateTime(date)} rawValue={date === undefined ? undefined : date.toISOString()} tooltip={help.brokerPublishTime} />
}

export const MessageIdField: React.FC<FieldProps> = (props) => {
  const i18n = I18n.useContext();
  return <CopyField isShowTooltips={props.isShowTooltips} title="Message Id" value={props.message.messageId === null ? undefined : i18n.bytesToHexString(props.message.messageId, 'hex-with-space')} rawValue={props.message.messageId === null ? undefined : i18n.bytesToHexString(props.message.messageId, 'hex-no-space')} tooltip={help.messageId} />
}

export const SequenceIdField: React.FC<FieldProps> = (props) => {
  const i18n = I18n.useContext();
  return <CopyField isShowTooltips={props.isShowTooltips} title="Sequence Id" value={props.message.sequenceId === null ? undefined : i18n.formatLongNumber(props.message.sequenceId)} rawValue={props.message.sequenceId === null ? undefined : String(props.message.sequenceId)} tooltip={help.sequenceId} />
}

export const OrderingKeyField: React.FC<FieldProps> = (props) => {
  const i18n = I18n.useContext();
  return <CopyField isShowTooltips={props.isShowTooltips} title="Ordering key" value={props.message.orderingKey === null ? undefined : i18n.bytesToHexString(props.message.orderingKey, 'hex-with-space')} rawValue={props.message.orderingKey === null ? undefined : i18n.bytesToHexString(props.message.orderingKey, 'hex-no-space')} tooltip={help.orderingKey} />
}

export const RedeliveryCountField: React.FC<FieldProps> = (props) => {
  const i18n = I18n.useContext();
  return <CopyField isShowTooltips={props.isShowTooltips} title="Redelivery count" value={props.message.redeliveryCount === null ? undefined : i18n.formatLongNumber(props.message.redeliveryCount)} rawValue={props.message.redeliveryCount === null ? undefined : String(props.message.redeliveryCount)} tooltip={help.redeliveryCount} />
}

export const AccumulatorField: React.FC<FieldProps> = (props) => {
  return <CopyField isShowTooltips={props.isShowTooltips} title="Accumulator" value={props.message.accum === null ? undefined : props.message.accum} rawValue={props.message.accum === null ? undefined : props.message.accum} tooltip={help.accumulator} />
}

function limitString(str: string, limit: number): string {
  if (str.length > limit) {
    return str.slice(0, limit) + '...';
  }
  return str;
}
