import React, { useEffect, useRef, useState } from 'react';
import s from './Messages.module.css'
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { Message, ReadMessagesRequest, ReadMessagesResponse } from '../../../grpc-web/api/v1/topic_pb';
import { nanoid } from 'nanoid';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ClientReadableStream } from 'grpc-web';
import SmallButton from '../../ui/SmallButton/SmallButton';

export type MessagesProps = {
  tenant: string,
  namespace: string,
  topicType: 'persistent' | 'non-persistent',
  topic: string,
};

type KeyedMessage = {
  message: Message,
  key: string
}
const Messages: React.FC<MessagesProps> = (props) => {
  const listRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { topicServiceClient } = PulsarGrpcClient.useContext();
  const [messages, setMessages] = useState<KeyedMessage[]>([]);
  const [isFollowOutput, setIsFollowOutput] = useState(false);

  useEffect(() => {
    let stream: ClientReadableStream<ReadMessagesResponse>;

    function startConsume() {
      if (stream) {
        return;
      }

      const req = new ReadMessagesRequest();

      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setSubscriptionId(`client-${Math.random().toString().replace('.', '')}`);

      stream = topicServiceClient.readMessages(req)
      stream.on('data', (data) => {
        const newMessages = data.getMessagesList().map(m => ({ message: m, key: nanoid() }));
        setMessages(messages => messages.concat(newMessages));
      });
    }

    startConsume();

    return () => stream?.cancel();
  }, []);

  return (
    <div className={s.Messages}>
      <div>
        <SmallButton
          text="Follow output"
          onClick={() => {
            setIsFollowOutput(!isFollowOutput);
            if (!isFollowOutput) {
              virtuosoRef.current?.scrollToIndex(messages.length - 1);
            }
          }}
          type='primary'
        />
        <SmallButton text="Stop" onClick={() => setIsFollowOutput(!isFollowOutput)} type='danger' />
        <strong>{messages.length}</strong> messages loaded
      </div>
      <div className={s.List} ref={listRef}>
        <Virtuoso<KeyedMessage>
          ref={virtuosoRef}
          data={messages}
          totalCount={messages.length}
          overscan={{ main: (listRef?.current?.clientHeight || 0), reverse: (listRef?.current?.clientHeight || 0) }}
          customScrollParent={listRef.current || undefined}
          itemContent={(_, { key, message }) => <MessageComponent key={key} message={message} />}
          followOutput={isFollowOutput}
          alignToBottom={isFollowOutput}
        />
      </div>

    </div>
  );
}

type MessageComponentProps = {
  message: Message,
}
const MessageComponent: React.FC<MessageComponentProps> = (props) => {
  return (
    <div className={s.Message}>
      <div className={s.MessageMetadata}>
        <div>Message Id: <br />{props.message.getMessageId_asU8().toString()}</div>
      </div>
      <div>
        <div className={s.MessageData}>Data: {atob(props.message.getData_asB64())}</div>
      </div>
    </div>
  );
}

export default Messages;
