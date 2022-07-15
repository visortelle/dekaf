import React, { useCallback, useEffect } from 'react';
import s from './Message.module.css'
import { Message } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import * as I18n from '../../../app/contexts/I18n/I18n';
import * as Notifications from '../../../app/contexts/Notifications';
import { routes } from '../../../routes';
import { parseTopic } from '../../../pulsar/parse-topic';
import { help, FieldName } from './fields';
import ReactTooltip from 'react-tooltip';

export type MessageProps = {
  isShowTooltips: boolean;
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

  useEffect(() => {
    ReactTooltip.rebuild();
  }, [props.isShowTooltips]);

  return (
    <div className={s.Message}>
      <div className={s.LeftSection}>
        <Field isShowTooltips={props.isShowTooltips} name="topic" value={topic || undefined} valueHref={topicHref} tooltip={help.topic} />
        <Field isShowTooltips={props.isShowTooltips} name="key" title="Key" value={key || undefined} rawValue={key || undefined} tooltip={help.key} />
        <Field isShowTooltips={props.isShowTooltips} name="producerName" title="Producer name" value={producerName || undefined} rawValue={producerName || undefined} tooltip={help.producerName} />
        <Field isShowTooltips={props.isShowTooltips} name="size" title="Size" value={i18n.formatBytes(size) || undefined} rawValue={String(size) || undefined} tooltip={help.size} />
        <Field isShowTooltips={props.isShowTooltips} name="publishTime" title="Publish time" value={publishTime === undefined ? undefined : i18n.formatDate(publishTime.toDate())} rawValue={publishTime?.toDate().toISOString()} tooltip={help.publishTime} />
        <Field isShowTooltips={props.isShowTooltips} name="brokerPublishTime" title="Broker pub. time" value={brokerPublishTime === undefined ? undefined : i18n.formatDate(brokerPublishTime.toDate())} rawValue={brokerPublishTime?.toDate().toISOString()} tooltip={help.brokerPublishTime} />
        <Field isShowTooltips={props.isShowTooltips} name="eventTime" title="Event time" value={eventTime === undefined ? undefined : i18n.formatDate(eventTime.toDate())} rawValue={eventTime?.toDate().toISOString()} tooltip={help.eventTime} />
        <Field isShowTooltips={props.isShowTooltips} name="messageId" title="Message id" value={messageId === undefined ? undefined : i18n.bytesToHexString(messageId, 'hex-with-space')} rawValue={i18n.bytesToHexString(messageId, 'hex-no-space')} tooltip={help.messageId} />
        <Field isShowTooltips={props.isShowTooltips} name="sequenceId" title="Sequence Id" value={sequenceId === undefined ? undefined : i18n.formatLongNumber(sequenceId)} rawValue={String(sequenceId)} tooltip={help.sequenceId} />
        <Field isShowTooltips={props.isShowTooltips} name="orderingKey" title="Ordering key" value={orderingKey === undefined || orderingKey.length === 0 ? undefined : i18n.bytesToHexString(orderingKey, 'hex-with-space')} rawValue={i18n.bytesToHexString(orderingKey, 'hex-no-space')} tooltip={help.orderingKey} />
        <Field isShowTooltips={props.isShowTooltips} name="redeliveryCount" title="Redelivery count" value={i18n.formatLongNumber(redeliveryCount) || undefined} rawValue={String(redeliveryCount)} tooltip={help.redeliveryCount} />
        <Field isShowTooltips={props.isShowTooltips} name="schemaVersion" title="Schema version" value={i18n.bytesToHexString(schemaVersion, 'hex-with-space') || undefined} rawValue={i18n.bytesToHexString(schemaVersion, 'hex-no-space')} tooltip={help.schemaVersion} />
        <Field isShowTooltips={props.isShowTooltips} name="value" title="Value" value={value || undefined} rawValue={value} tooltip={help.value} />
      </div>
      <div className={s.RightSection}></div>
    </div >
  );
}

type FieldProps = {
  name: FieldName,
  value: string | undefined,
  tooltip: string | undefined,
  isShowTooltips: boolean,
  rawValue?: string,
  title?: string,
  valueHref?: string,
}
const Field: React.FC<FieldProps> = (props) => {
  const { notifySuccess } = Notifications.useContext();
  const valueContent = props.value === undefined ? <div className={s.NoData}>-</div> : props.value;

  const copyRawValue = () => {
    if (props.rawValue === undefined) {
      return;
    }

    navigator.clipboard.writeText(props.rawValue);
    notifySuccess(`${props.title} value copied to clipboard.`);
  }

  let valueElement = <div className={`${s.FieldValue} ${props.rawValue === undefined ? '' : s.ClickableFieldValue}`} title={props.rawValue} onClick={copyRawValue} data-tip={!props.isShowTooltips || props.rawValue === undefined ? undefined : "Click to copy"}>{valueContent}</div>;

  if (props.valueHref !== undefined) {
    valueElement = <a href={props.valueHref} className={`${s.FieldValue} ${s.FieldValueLink}`} title={props.rawValue}>{valueContent}</a>;
  }

  return (
    <div className={s.Field}>
      {props.title && <div className={s.FieldName} data-tip={props.isShowTooltips ? props.tooltip : undefined}>{props.title}</div>}
      {valueElement}
    </div>
  );
}

export default MessageComponent;
