import ReactDOMServer from 'react-dom/server';
import { MessageDescriptor } from '../types';
import * as I18n from '../../../app/contexts/I18n/I18n';
import Field from './Field/Field';
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


type FieldProps = {
  isShowTooltips: boolean;
  message: MessageDescriptor;
}

export const PublishTimeField: React.FC<FieldProps> = (props) => {
  const i18n = I18n.useContext();
  return <Field isShowTooltips={props.isShowTooltips} title="Publish time" value={props.message.publishTime === undefined ? undefined : i18n.formatDate(props.message.publishTime)} rawValue={props.message.publishTime?.toISOString()} tooltip={help.publishTime} />
}

export const KeyField: React.FC<FieldProps> = (props) => {
  return <Field isShowTooltips={props.isShowTooltips} title="Key" value={props.message.key || undefined} rawValue={props.message.key || undefined} tooltip={help.key} />
}

export const JsonValueField: React.FC<FieldProps> = (props) => {
  return <Field isShowTooltips={props.isShowTooltips} title="Value as JSON" value={props.message.jsonValue || undefined} rawValue={props.message.jsonValue} tooltip={help.jsonValue} />
}

export const TopicField: React.FC<FieldProps & { topicHref: string }> = (props) => {
  return <Field isShowTooltips={props.isShowTooltips} value={props.message.topic || undefined} valueHref={props.topicHref} tooltip={help.topic} />
}

export const ProducerNameField: React.FC<FieldProps> = (props) => {
  return <Field isShowTooltips={props.isShowTooltips} title="Producer" value={props.message.producerName || undefined} rawValue={props.message.producerName || undefined} tooltip={help.producerName} />
}

export const SchemaVersionField: React.FC<FieldProps> = (props) => {
  const schemaVersion = props.message.schemaVersion.toString();
  return <Field isShowTooltips={props.isShowTooltips} title="Schema version" value={schemaVersion} rawValue={schemaVersion} tooltip={help.schemaVersion} />
}

export const SizeField: React.FC<FieldProps> = (props) => {
  const i18n = I18n.useContext();
  return <Field isShowTooltips={props.isShowTooltips} title="Size" value={i18n.formatBytes(props.message.size) || undefined} rawValue={String(props.message.size) || undefined} tooltip={help.size} />
}

export const PropertiesField: React.FC<FieldProps> = (props) => {
  return <Field isShowTooltips={props.isShowTooltips} title="Properties" value={props.message.properties} rawValue={props.message.properties} tooltip={help.size} />
}

export const EventTimeField: React.FC<FieldProps> = (props) => {
  const i18n = I18n.useContext();
  return <Field isShowTooltips={props.isShowTooltips} title="Event time" value={props.message.eventTime === undefined ? undefined : i18n.formatDate(props.message.eventTime)} rawValue={props.message.eventTime?.toISOString()} tooltip={help.eventTime} />
}

export const BrokerPublishTimeField: React.FC<FieldProps> = (props) => {
  const i18n = I18n.useContext();
  return <Field isShowTooltips={props.isShowTooltips} title="Broker pub. time" value={props.message.brokerPublishTime === undefined ? undefined : i18n.formatDate(props.message.brokerPublishTime)} rawValue={props.message.brokerPublishTime?.toISOString()} tooltip={help.brokerPublishTime} />
}

export const MessageIdField: React.FC<FieldProps> = (props) => {
  const i18n = I18n.useContext();
  return <Field isShowTooltips={props.isShowTooltips} title="Message Id" value={props.message.messageId === undefined ? undefined : i18n.bytesToHexString(props.message.messageId, 'hex-with-space')} rawValue={i18n.bytesToHexString(props.message.messageId, 'hex-no-space')} tooltip={help.messageId} />
}

export const SequenceIdField: React.FC<FieldProps> = (props) => {
  const i18n = I18n.useContext();
  return <Field isShowTooltips={props.isShowTooltips} title="Sequence Id" value={props.message.sequenceId === undefined ? undefined : i18n.formatLongNumber(props.message.sequenceId)} rawValue={String(props.message.sequenceId)} tooltip={help.sequenceId} />
}

export const OrderingKeyField: React.FC<FieldProps> = (props) => {
  const i18n = I18n.useContext();
  return <Field isShowTooltips={props.isShowTooltips} title="Ordering key" value={props.message.orderingKey === undefined || props.message.orderingKey.length === 0 ? undefined : i18n.bytesToHexString(props.message.orderingKey, 'hex-with-space')} rawValue={i18n.bytesToHexString(props.message.orderingKey, 'hex-no-space')} tooltip={help.orderingKey} />
}

export const RedeliveryCountField: React.FC<FieldProps> = (props) => {
  const i18n = I18n.useContext();
  return <Field isShowTooltips={props.isShowTooltips} title="Redelivery count" value={i18n.formatLongNumber(props.message.redeliveryCount) || undefined} rawValue={String(props.message.redeliveryCount)} tooltip={help.redeliveryCount} />
}

export const AggregateField: React.FC<FieldProps> = (props) => {
  return <Field isShowTooltips={props.isShowTooltips} title="Aggregate" value={props.message.aggregate} rawValue={props.message.aggregate} tooltip={help.jsonAggregate} />
}
