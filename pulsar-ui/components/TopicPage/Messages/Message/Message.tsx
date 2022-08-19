import React, { useCallback, useEffect } from 'react';
import s from './Message.module.css'
import { Message } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import * as I18n from '../../../app/contexts/I18n/I18n';
import * as Notifications from '../../../app/contexts/Notifications';
import { routes } from '../../../routes';
import { parseTopic } from '../../../pulsar/parse-topic';
import { help, FieldName } from './fields';
import ReactTooltip from 'react-tooltip';
import cts from "../../../ui/ChildrenTable/ChildrenTable.module.css";

export type MessageProps = {
  isShowTooltips: boolean;
  message: Message
};

const MessageComponent: React.FC<MessageProps> = (props) => {
  const message = props.message;
  const i18n = I18n.useContext();

  const messageId = message.getMessageId_asU8();
  const value = message.getValue_asU8();
  const jsonValue = message.getJsonValue();
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
  const schemaVersion = message.getSchemaVersion();
  const sequenceId = message.getSequenceId();
  const size = value.length;
  const topic = message.getTopic();

  const topicPath = parseTopic(topic);
  const topicHref = routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.messages._.get({ tenant: topicPath.tenant, namespace: topicPath.namespace, topic: topicPath.topic, topicType: topicPath.topicType });

  useEffect(() => {
    ReactTooltip.rebuild();
  }, [props.isShowTooltips]);

  return (
    <>
      <Td width="16ch" style={{ position: 'sticky', left: 0, zIndex: 1 }}>
        <Field isShowTooltips={props.isShowTooltips} title="Key" value={key || undefined} rawValue={key || undefined} tooltip={help.key} />
      </Td>
      <Td>
        <Field isShowTooltips={props.isShowTooltips} title="Publish time" value={publishTime === undefined ? undefined : i18n.formatDate(publishTime.toDate())} rawValue={publishTime?.toDate().toISOString()} tooltip={help.publishTime} />
      </Td>
      <Td>
        <Field isShowTooltips={props.isShowTooltips} title="Broker pub. time" value={brokerPublishTime === undefined ? undefined : i18n.formatDate(brokerPublishTime.toDate())} rawValue={brokerPublishTime?.toDate().toISOString()} tooltip={help.brokerPublishTime} />
      </Td>
      <Td>
        <Field isShowTooltips={props.isShowTooltips} value={topic || undefined} valueHref={topicHref} tooltip={help.topic} />
      </Td>
      <Td>
        <Field isShowTooltips={props.isShowTooltips} title="Producer name" value={producerName || undefined} rawValue={producerName || undefined} tooltip={help.producerName} />
      </Td>
      <Td>
        <Field isShowTooltips={props.isShowTooltips} title="Size" value={i18n.formatBytes(size) || undefined} rawValue={String(size) || undefined} tooltip={help.size} />
      </Td>
      <Td>
        <Field isShowTooltips={props.isShowTooltips} title="Event time" value={eventTime === undefined ? undefined : i18n.formatDate(eventTime.toDate())} rawValue={eventTime?.toDate().toISOString()} tooltip={help.eventTime} />
      </Td>
      <Td>
        <Field isShowTooltips={props.isShowTooltips} title="Message id" value={messageId === undefined ? undefined : i18n.bytesToHexString(messageId, 'hex-with-space')} rawValue={i18n.bytesToHexString(messageId, 'hex-no-space')} tooltip={help.messageId} />
      </Td>
      <Td>
        <Field isShowTooltips={props.isShowTooltips} title="Sequence Id" value={sequenceId === undefined ? undefined : i18n.formatLongNumber(sequenceId)} rawValue={String(sequenceId)} tooltip={help.sequenceId} />
      </Td>
      <Td>
        <Field isShowTooltips={props.isShowTooltips} title="Ordering key" value={orderingKey === undefined || orderingKey.length === 0 ? undefined : i18n.bytesToHexString(orderingKey, 'hex-with-space')} rawValue={i18n.bytesToHexString(orderingKey, 'hex-no-space')} tooltip={help.orderingKey} />
      </Td>
      <Td>
        <Field isShowTooltips={props.isShowTooltips} title="Redelivery count" value={i18n.formatLongNumber(redeliveryCount) || undefined} rawValue={String(redeliveryCount)} tooltip={help.redeliveryCount} />
      </Td>
      <Td>
        <Field isShowTooltips={props.isShowTooltips} title="Schema version" value={schemaVersion.toString()} rawValue={schemaVersion.toString()} tooltip={help.schemaVersion} />
      </Td>
      <Td>
        <Field isShowTooltips={props.isShowTooltips} title="Value" value={value === undefined ? undefined : i18n.bytesToHexString(value, 'hex-with-space')} rawValue={i18n.bytesToHexString(value, 'hex-no-space')} tooltip={help.value} />
      </Td>
      <Td>
        <Field isShowTooltips={props.isShowTooltips} title="JSON Value" value={jsonValue || undefined} rawValue={jsonValue} tooltip={help.jsonValue} />
      </Td>
    </>
  );
}

type FieldProps = {
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

  let valueElement = (
    <div
      className={`${s.FieldValue} ${props.rawValue === undefined ? '' : s.ClickableFieldValue}`}
      title={props.rawValue}
      onClick={copyRawValue}
      data-tip={!props.isShowTooltips || props.rawValue === undefined ? undefined : "Click to copy"}>
      {valueContent}
    </div>
  );

  if (props.valueHref !== undefined) {
    valueElement = <a href={props.valueHref} className={`${s.FieldValue} ${s.FieldValueLink}`} title={props.rawValue}>{valueContent}</a>;
  }

  return (
    <div className={s.Field}>
      {valueElement}
    </div>
  );
}

type TdProps = { children: React.ReactNode, width?: string } & React.ThHTMLAttributes<HTMLTableCellElement>;
const Td: React.FC<TdProps> = (props) => {
  const { children, ...restProps } = props;
  return <td className={cts.Td} {...restProps}>
    <div style={{ width: props.width, textOverflow: 'ellipsis', display: 'flex' }} >
      {children}
    </div>
  </td>;
};

export default MessageComponent;
