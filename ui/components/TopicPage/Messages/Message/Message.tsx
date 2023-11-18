import React from 'react';
import * as Modals from '../../../app/contexts/Modals/Modals';
import { AccumulatorField, BrokerPublishTimeField, EventTimeField, help, ValueField, KeyField, MessageIdField, OrderingKeyField, ProducerNameField, PropertiesField, PublishTimeField, RedeliveryCountField, SchemaVersionField, SequenceIdField, SizeField, TopicField } from './fields';
import s from './Message.module.css';
import cts from "../../../ui/ChildrenTable/ChildrenTable.module.css";
import { MessageDescriptor } from '../types';
import MessageDetails from './MessageDetails/MessageDetails';

export type MessageProps = {
  isShowTooltips: boolean;
  message: MessageDescriptor;
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
        width="35rem"
        className={s.IndexField}
        onClick={showMessageDetails}
      >
        {props.message.index}
      </Td>

      <Td
        width="200rem"
        className={s.PublishTimeField}
        onClick={showMessageDetails}
      >
        <PublishTimeField isShowTooltips={props.isShowTooltips} message={msg} />
      </Td>

      <Td
        width='20ch'
        onClick={showMessageDetails}
      >
        <KeyField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='30ch'
        onClick={showMessageDetails}
      >
        <ValueField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='60ch'
        onClick={showMessageDetails}
      >
        <TopicField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='50ch'
        onClick={showMessageDetails}
      >
        <ProducerNameField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='8ch'
        onClick={showMessageDetails}
      >
        <SchemaVersionField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='12ch'
        onClick={showMessageDetails}
      >
        <SizeField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='30ch'
        onClick={showMessageDetails}
      >
        <PropertiesField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='30ch'
        onClick={showMessageDetails}
      >
        <EventTimeField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='30ch'
        onClick={showMessageDetails}
      >
        <BrokerPublishTimeField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='40ch'
        onClick={showMessageDetails}
      >
        <MessageIdField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='10ch'
        onClick={showMessageDetails}
      >
        <SequenceIdField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='10ch'
        onClick={showMessageDetails}
      >
        <OrderingKeyField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='10ch'
        onClick={showMessageDetails}
      >
        <RedeliveryCountField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>

      <Td
        width='50ch'
        onClick={showMessageDetails}
      >
        <AccumulatorField isShowTooltips={props.isShowTooltips} message={props.message} />
      </Td>
    </>
  );
}

type TdProps = { children: React.ReactNode, width?: string } & React.ThHTMLAttributes<HTMLTableCellElement>;
const Td: React.FC<TdProps> = (props) => {
  const { children, className, width, ...restProps } = props;

  return <td className={`${cts.Td} ${s.Td} ${className || ''}`} {...restProps}>
    <div style={{ width, textOverflow: 'ellipsis', display: 'flex' }} >
      {children}
    </div>
  </td>;
};

export default MessageComponent;
