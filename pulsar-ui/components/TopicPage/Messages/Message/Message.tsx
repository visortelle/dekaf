import React from 'react';
import s from './Message.module.css'
import { Message } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import * as I18n from '../../../app/contexts/I18n/I18n';
import { routes } from '../../../routes';
import { parseTopic } from '../../../pulsar/parse-topic';
import { help, FieldName } from './fields';

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
        <Field name="topic" value={topic || undefined} valueHref={topicHref} tooltip={help.topic} />
        <Field name="key" title="Key" value={key || undefined} tooltip={help.key} />
        <Field name="producerName" title="Producer name" value={producerName || undefined} tooltip={help.producerName}/>
        <Field name="size" title="Size" value={i18n.formatBytes(size) || undefined} tooltip={help.size} />
        <Field name="publishTime" title="Publish time" value={publishTime === undefined ? undefined : i18n.formatDate(publishTime.toDate())} tooltip={help.publishTime} />
        <Field name="brokerPublishTime" title="Broker pub. time" value={brokerPublishTime === undefined ? undefined : i18n.formatDate(brokerPublishTime.toDate())} tooltip={help.brokerPublishTime} />
        <Field name="eventTime" title="Event time" value={eventTime === undefined ? undefined : i18n.formatDate(eventTime.toDate())} tooltip={help.eventTime} />
        <Field name="messageId" title="Message id" value={messageId === undefined ? undefined : i18n.formatByteArray(messageId)} tooltip={help.messageId} />
        <Field name="sequenceId" title="Sequence Id" value={sequenceId === undefined ? undefined : i18n.formatLongNumber(sequenceId)} tooltip={help.sequenceId} />
        <Field name="orderingKey" title="Ordering key" value={orderingKey === undefined || orderingKey.length === 0 ? undefined : i18n.formatByteArray(orderingKey)} tooltip={help.orderingKey} />
        <Field name="redeliveryCount" title="Redelivery count" value={i18n.formatLongNumber(redeliveryCount) || undefined} tooltip={help.redeliveryCount} />
        <Field name="schemaVersion" title="Schema version" value={i18n.formatByteArray(schemaVersion) || undefined} tooltip={help.schemaVersion} />
        <Field name="value" title="Value" value={value || undefined} tooltip={help.value} />
      </div>
      <div className={s.RightSection}></div>
    </div >
  );
}

type FieldProps = {
  name: FieldName,
  value: string | undefined,
  tooltip: string | undefined
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
      {props.title && <div className={s.FieldName} data-tip={props.tooltip}>{props.title}</div>}
      {valueElement}
    </div>
  );
}

const NoData = () => {
  return <div className={s.NoData}>-</div>
}

export default MessageComponent;
