import React from 'react';
import * as Modals from '../../../app/contexts/Modals/Modals';
import { SessionContextStateJsonField, BrokerPublishTimeField, EventTimeField, ValueField, KeyField, MessageIdField, OrderingKeyField, ProducerNameField, PropertiesField, PublishTimeField, RedeliveryCountField, SchemaVersionField, SequenceIdField, SizeField, TopicField, SessionTargetIndexField } from './fields';
import s from './Message.module.css';
import cts from "../../../ui/ChildrenTable/ChildrenTable.module.css";
import { MessageDescriptor } from '../types';
import MessageDetails from './MessageDetails/MessageDetails';
import { Coloring } from '../coloring';

export type MessageProps = {
  isShowTooltips: boolean;
  message: MessageDescriptor;
  coloring: Coloring;
};

const MessageComponent: React.FC<MessageProps> = (props) => {
  const msg = props.message;
  const modals = Modals.useContext();

  const showMessageDetails = () => modals.push({
    id: 'message-details',
    title: `Message details`,
    content: <MessageDetails message={props.message} />,
    styleMode: 'no-content-padding'
  });

  return (
    <>
      <Td
        width="36rem"
        className={s.IndexField}
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        {props.message.index}
      </Td>

      <Td
        width="200rem"
        className={s.PublishTimeField}
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <PublishTimeField isShowTooltips={props.isShowTooltips} message={msg} />
      </Td>

      <Td
        width='20ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <KeyField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='30ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <ValueField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='5ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <SessionTargetIndexField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='60ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <TopicField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='50ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <ProducerNameField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='8ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <SchemaVersionField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='12ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <SizeField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='30ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <PropertiesField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='30ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <EventTimeField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='30ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <BrokerPublishTimeField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='40ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <MessageIdField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='10ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <SequenceIdField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='10ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <OrderingKeyField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='10ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <RedeliveryCountField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='50ch'
        onClick={showMessageDetails}
        coloring={props.coloring}
      >
        <SessionContextStateJsonField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>
    </>
  );
}

type TdProps = {
  children: React.ReactNode,
  width?: string,
  coloring: Coloring,
} & React.ThHTMLAttributes<HTMLTableCellElement>;
const Td: React.FC<TdProps> = (props) => {
  const { children, className, width, coloring, ...restProps } = props;

  return (
    <td
      className={`${cts.Td} ${s.Td} ${className || ''}`}
      style={{
        color: props.coloring?.foregroundColor,
        backgroundColor: props.coloring?.backgroundColor
      }}
      {...restProps}
    >
      <div style={{ width, textOverflow: 'ellipsis', display: 'flex' }} >
        {children}
      </div>
    </td>
  );
};

export default MessageComponent;
