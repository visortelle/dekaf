import React, { useCallback, useEffect } from 'react';
import * as I18n from '../../../app/contexts/I18n/I18n';
import * as Modals from '../../../app/contexts/Modals/Modals';
import { routes } from '../../../routes';
import { parseTopic } from '../../../pulsar/parse-topic';
import { AggregateField, BrokerPublishTimeField, EventTimeField, help, JsonValueField, KeyField, MessageIdField, OrderingKeyField, ProducerNameField, PropertiesField, PublishTimeField, RedeliveryCountField, SchemaVersionField, SequenceIdField, SizeField, TopicField } from './fields';
import Field from './Field/Field';
import cts from "../../../ui/ChildrenTable/ChildrenTable.module.css";
import { MessageDescriptor } from '../types';
import SmallButton from '../../../ui/SmallButton/SmallButton';
import MessageDetails from './MessageDetails/MessageDetails';

export type MessageProps = {
  isShowTooltips: boolean;
  message: MessageDescriptor
};

const MessageComponent: React.FC<MessageProps> = (props) => {
  const msg = props.message;
  const i18n = I18n.useContext();
  const modals = Modals.useContext();

  const topicPath = parseTopic(msg.topic);
  const topicHref = routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.messages._.get({ tenant: topicPath.tenant, namespace: topicPath.namespace, topic: topicPath.topic, topicType: topicPath.topicType });

  return (
    <>
      <Td width="265rem" style={{ position: 'sticky', left: 0, zIndex: 1 }}>
        <PublishTimeField isShowTooltips={props.isShowTooltips} message={msg} />
      </Td>
      <Td width="48rem" style={{ position: 'sticky', left: '290rem', zIndex: 1 }}>
        <SmallButton
          onClick={() => modals.push({
            id: 'message-details',
            title: `Message details`,
            content: <MessageDetails message={props.message} topicHref={topicHref} />,
            styleMode: 'no-content-padding'
          })}
          text="More"
          type='primary'
        />
      </Td>
      <Td width='20ch'>
        <KeyField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>
      <Td width='30ch'>
        <JsonValueField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>
      <Td width='60ch'>
        <TopicField isShowTooltips={props.isShowTooltips} message={props.message} topicHref={topicHref} />
      </Td>

      <Td width='50ch'>
        <ProducerNameField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      {/* <Td width='30ch'>
        <Field isShowTooltips={props.isShowTooltips} title="Value" value={value === undefined ? undefined : i18n.bytesToHexString(value, 'hex-with-space')} rawValue={i18n.bytesToHexString(value, 'hex-no-space')} tooltip={help.value} />
      </Td> */}
      <Td width='8ch'>
        <SchemaVersionField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>
      <Td width='12ch'>
        <SizeField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>
      <Td width='30ch'>
        <PropertiesField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>
      <Td width='30ch'>
        <EventTimeField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>
      <Td width='30ch'>
        <BrokerPublishTimeField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td width='40ch'>
        <MessageIdField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>
      <Td width='10ch'>
        <SequenceIdField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>
      <Td width='10ch'>
        <OrderingKeyField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>
      <Td width='10ch'>
        <RedeliveryCountField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>
      <Td width='50ch'>
        <AggregateField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>
    </>
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
