import React from 'react';
import s from './Message.module.css'
import { Message } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import * as I18n from '../../../app/contexts/I18n/I18n';
import { routes } from '../../../routes';
import { parseTopic } from '../../../pulsar/parse-topic';

type FieldName =
  'messageId' |
  'data' |
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
  'topic';

const help: Record<FieldName, string | React.ReactElement> = {
  data: "The data carried by the message. All Pulsar messages contain raw bytes, although message data can also conform to data schemas.",
  key: "Messages are optionally tagged with keys, which is useful for things like topic compaction.",
  propertiesMap: "An optional key/value map of user-defined properties.",
  producerName: "The name of the producer who produces the message. If you do not specify a producer name, the default name is used.",
  topic: "The name of the topic that the message is published to.",
  schemaVersion: "The version number of the schema that the message is produced with.",
  sequenceId: (
    <div>
      Each Pulsar message belongs to an ordered sequence on its topic. The sequence ID of a message is initially assigned by its producer, indicating its order in that sequence, and can also be customized.
      <br />
      Sequence ID can be used for message deduplication. If brokerDeduplicationEnabled is set to true, the sequence ID of each message is unique within a producer of a topic (non-partitioned) or a partition.
    </div>
  ),
  messageId: "The message ID of a message is assigned by bookies as soon as the message is persistently stored. Message ID indicates a message&apos;s specific position in a ledger and is unique within a Pulsar cluster.",
  publishTime: "The timestamp of when the message is published. The timestamp is automatically applied by the producer.",
  eventTime: "An optional timestamp attached to a message by applications. For example, applications attach a timestamp on when the message is processed.",
  size: "Size of the message in bytes.",
  brokerPublishTime: '',
  value: '',
  isReplicated: '',
  orderingKey: '',
  redeliveryCount: '',
  replicatedFrom: '',
}
console.log(help);

export type MessageProps = {
  message: Message
};

const MessageComponent: React.FC<MessageProps> = (props) => {
  const message = props.message;
  const i18n = I18n.useContext();

  const messageId = message.getMessageId_asU8();
  const data = message.getData_asU8();
  const value = message.getValue();
  const brokerPublishTime = message.getBrokerPublishTime();
  const eventTime = message.getEventTime();
  const isReplicated = message.getIsReplicated();
  const key = message.getKey();
  const orderingKey = message.getOrderingKey_asU8();
  const producerName = message.getProducerName();
  const propertiesMap = message.getPropertiesMap();
  const publishTime = message.getPublishTime();
  const redeliveryCount = message.getRedeliveryCount();
  const replicatedFrom = message.getReplicatedFrom();
  const schemaVersion = message.getSchemaVersion_asU8();
  const sequenceId = message.getSequenceId();
  const size = message.getSize();
  const topic = message.getTopic();

  const topicPath = parseTopic(topic);
  const topicHref = routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.messages._.get({ tenant: topicPath.tenant, namespace: topicPath.namespace, topic: topicPath.topic, topicType: topicPath.topicType });

  return (
    <div className={s.Message}>
      <div className={s.LeftSection}>
        <Field name="topic" value={topic || undefined} valueHref={topicHref} />
        <Field name="key" title="Key" value={key || undefined} />
        <Field name="producerName" title="Producer name" value={producerName || undefined} />
        <Field name="size" title="Size" value={i18n.formatBytes(size) || undefined} />
        <Field name="publishTime" title="Publish time" value={publishTime === undefined ? undefined : i18n.formatDate(publishTime.toDate())} />
        <Field name="brokerPublishTime" title="Broker pub. time" value={brokerPublishTime === undefined ? undefined : i18n.formatDate(brokerPublishTime.toDate())} />
        <Field name="eventTime" title="Event time" value={eventTime === undefined ? undefined : i18n.formatDate(eventTime.toDate())} />
        <Field name="messageId" title="Message id" value={messageId === undefined ? undefined : i18n.formatByteArray(messageId)} />
        <Field name="sequenceId" title="Sequence Id" value={sequenceId === undefined ? undefined : i18n.formatLongNumber(sequenceId)} />
        <Field name="orderingKey" title="Ordering key" value={orderingKey === undefined || orderingKey.length === 0 ? undefined : i18n.formatByteArray(orderingKey)} />
        <Field name="replicatedFrom" title="Replicated from" value={replicatedFrom || undefined} />
        <Field name="redeliveryCount" title="Redelivery count" value={i18n.formatLongNumber(redeliveryCount) || undefined} />
        <Field name="schemaVersion" title="Schema version" value={i18n.formatByteArray(schemaVersion) || undefined} />
        <Field name="value" title="Value" value={value || undefined} />
      </div>
      <div className={s.RightSection}></div>
    </div >
  );
}

type FieldProps = {
  name: FieldName,
  value: string | undefined,
  title?: string,
  valueOnClick?: () => void,
  valueHref?: string,
}
const Field: React.FC<FieldProps> = (props) => {
  const valueContent = props.value === undefined ? <NoData /> : props.value;

  let valueElement = <div className={s.FieldValue} title={props.value} onClick={props.valueOnClick}>{valueContent}</div>;

  if (props.valueHref !== undefined) {
    valueElement = <a href={props.valueHref} className={`${s.FieldValue} ${s.FieldValueLink}`} title={props.value} onClick={props.valueOnClick}>{valueContent}</a>;
  }

  return (
    <div className={s.Field}>
      {props.title && <div className={s.FieldName}>{props.title}</div>}
      {valueElement}
    </div>
  );
}

const NoData = () => {
  return <div className={s.NoData}>-</div>
}

export default MessageComponent;
