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
import { MessageDescriptor } from '../types';

export type MessageProps = {
  isShowTooltips: boolean;
  message: MessageDescriptor
};

const MessageComponent: React.FC<MessageProps> = (props) => {
  const msg = props.message;
  const i18n = I18n.useContext();

  const topicPath = parseTopic(msg.topic);
  const topicHref = routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.messages._.get({ tenant: topicPath.tenant, namespace: topicPath.namespace, topic: topicPath.topic, topicType: topicPath.topicType });

  useEffect(() => {
    ReactTooltip.rebuild();
  }, [props.isShowTooltips]);

  return (
    <>
      <Td width="30ch" style={{ position: 'sticky', left: 0, zIndex: 1 }}>
        <Field isShowTooltips={props.isShowTooltips} title="Publish time" value={msg.publishTime === undefined ? undefined : i18n.formatDate(msg.publishTime)} rawValue={msg.publishTime?.toISOString()} tooltip={help.publishTime} />
      </Td>
      <Td width='20ch'>
        <Field isShowTooltips={props.isShowTooltips} title="Key" value={msg.key || undefined} rawValue={msg.key || undefined} tooltip={help.key} />
      </Td>
      <Td width='60ch'>
        <Field isShowTooltips={props.isShowTooltips} value={msg.topic || undefined} valueHref={topicHref} tooltip={help.topic} />
      </Td>

      <Td width='50ch'>
        <Field isShowTooltips={props.isShowTooltips} title="Producer" value={msg.producerName || undefined} rawValue={msg.producerName || undefined} tooltip={help.producerName} />
      </Td>

      {/* <Td width='30ch'>
        <Field isShowTooltips={props.isShowTooltips} title="Value" value={value === undefined ? undefined : i18n.bytesToHexString(value, 'hex-with-space')} rawValue={i18n.bytesToHexString(value, 'hex-no-space')} tooltip={help.value} />
      </Td> */}
      <Td width='30ch'>
        <Field isShowTooltips={props.isShowTooltips} title="JSON value" value={msg.jsonValue || undefined} rawValue={msg.jsonValue} tooltip={help.jsonValue} />
      </Td>
      <Td width='8ch'>
        <Field isShowTooltips={props.isShowTooltips} title="Schema version" value={msg.schemaVersion.toString()} rawValue={msg.schemaVersion.toString()} tooltip={help.schemaVersion} />
      </Td>
      <Td width='12ch'>
        <Field isShowTooltips={props.isShowTooltips} title="Size" value={i18n.formatBytes(msg.size) || undefined} rawValue={String(msg.size) || undefined} tooltip={help.size} />
      </Td>
      <Td width='30ch'>
        <Field isShowTooltips={props.isShowTooltips} title="Properties" value={msg.properties} rawValue={msg.properties} tooltip={help.size} />
      </Td>
      <Td width='30ch'>
        <Field isShowTooltips={props.isShowTooltips} title="Event time" value={msg.eventTime === undefined ? undefined : i18n.formatDate(msg.eventTime)} rawValue={msg.eventTime?.toISOString()} tooltip={help.eventTime} />
      </Td>
      <Td width='30ch'>
        <Field isShowTooltips={props.isShowTooltips} title="Broker pub. time" value={msg.brokerPublishTime === undefined ? undefined : i18n.formatDate(msg.brokerPublishTime)} rawValue={msg.brokerPublishTime?.toISOString()} tooltip={help.brokerPublishTime} />
      </Td>

      <Td width='40ch'>
        <Field isShowTooltips={props.isShowTooltips} title="Message Id" value={msg.messageId === undefined ? undefined : i18n.bytesToHexString(msg.messageId, 'hex-with-space')} rawValue={i18n.bytesToHexString(msg.messageId, 'hex-no-space')} tooltip={help.messageId} />
      </Td>
      <Td width='10ch'>
        <Field isShowTooltips={props.isShowTooltips} title="Sequence Id" value={msg.sequenceId === undefined ? undefined : i18n.formatLongNumber(msg.sequenceId)} rawValue={String(msg.sequenceId)} tooltip={help.sequenceId} />
      </Td>
      <Td width='10ch'>
        <Field isShowTooltips={props.isShowTooltips} title="Ordering key" value={msg.orderingKey === undefined || msg.orderingKey.length === 0 ? undefined : i18n.bytesToHexString(msg.orderingKey, 'hex-with-space')} rawValue={i18n.bytesToHexString(msg.orderingKey, 'hex-no-space')} tooltip={help.orderingKey} />
      </Td>
      <Td width='10ch'>
        <Field isShowTooltips={props.isShowTooltips} title="Redelivery count" value={i18n.formatLongNumber(msg.redeliveryCount) || undefined} rawValue={String(msg.redeliveryCount)} tooltip={help.redeliveryCount} />
      </Td>
      <Td width='50ch'>
        <Field isShowTooltips={props.isShowTooltips} title="Aggregate" value={msg.aggregate} rawValue={msg.aggregate} tooltip={help.jsonAggregate} />
      </Td>
    </>
  );
}

type FieldProps = {
  value: string | React.ReactElement | undefined,
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
