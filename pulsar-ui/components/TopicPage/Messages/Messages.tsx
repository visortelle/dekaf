import React, { useEffect, useRef, useState } from 'react';
import s from './Messages.module.css'
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { Message, CreateConsumerRequest, ResumeRequest, ResumeResponse, SubscriptionType, TopicSelector, DeleteConsumerRequest, PauseRequest } from '../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import { nanoid } from 'nanoid';
import * as Notifications from '../../app/contexts/Notifications';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ClientReadableStream } from 'grpc-web';
import SmallButton from '../../ui/SmallButton/SmallButton';
import { createDeadline } from '../../../grpc/proto-utils';
import { Code } from '../../../grpc-web/google/rpc/code_pb';

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
  const { notifyError } = Notifications.useContext();
  const listRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { consumerServiceClient } = PulsarGrpcClient.useContext();
  const [messages, setMessages] = useState<KeyedMessage[]>([]);
  const [isFollowOutput, setIsFollowOutput] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [consumerName, _] = useState('__xray_' + nanoid());
  const [subscriptionName, __] = useState('__xray_' + nanoid());
  const [stream, setStream] = useState<ClientReadableStream<ResumeResponse>>();

  useEffect(() => {
    async function startConsume() {
      const createConsumerReq = new CreateConsumerRequest();
      const topicSelector = new TopicSelector();
      topicSelector.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      createConsumerReq.setTopicSelector(topicSelector)
      createConsumerReq.setConsumerName(consumerName);
      createConsumerReq.setStartPaused(true);
      createConsumerReq.setSubscriptionName(subscriptionName);
      createConsumerReq.setSubscriptionType(SubscriptionType.SUBSCRIPTION_TYPE_SHARED)
      const createConsumerRes = await consumerServiceClient.createConsumer(createConsumerReq, { deadline: createDeadline(10) }).catch(err => notifyError(`Unable to create consumer ${consumerName}. ${err}`));

      if (createConsumerRes === undefined) {
        return;
      }

      const status = createConsumerRes.getStatus();
      const statusCode = status?.getCode();

      if (statusCode !== Code.OK) {
        const errorMessage = status?.getMessage();
        notifyError(`Unable to create consumer. ${errorMessage}`);
        return;
      }

      const resumeReq = new ResumeRequest();
      resumeReq.setConsumerName(consumerName);

      setStream(() => consumerServiceClient.resume(resumeReq));
    }

    startConsume();

    return () => {
      stream?.cancel();

      async function deleteConsumer() {
        const deleteConsumerReq = new DeleteConsumerRequest();
        deleteConsumerReq.setConsumerName(consumerName);
        await consumerServiceClient.deleteConsumer(deleteConsumerReq, { deadline: createDeadline(10) })
          .catch((err) => notifyError(`Unable to delete consumer ${consumerName}. ${err}`));
      }

      deleteConsumer();
    };
  }, []);

  useEffect(() => {
    if (stream === undefined) {
      return;
    }

    stream.on('data', (data) => {
      const newMessages = data.getMessagesList().map(m => ({ message: m, key: nanoid() }));
      setMessages(messages => messages.concat(newMessages));
    });
  }, [stream]);

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
        <SmallButton
          text={isPaused ? "Resume" : "Pause"}
          onClick={async () => {
            if (isPaused) {
              setIsPaused(false);
              const resumeReq = new ResumeRequest();
              resumeReq.setConsumerName(consumerName);
              stream?.cancel();
              const newStream = consumerServiceClient.resume(resumeReq, { deadline: createDeadline(10) });
              setStream(() => newStream);
            } else {
              setIsPaused(true);
              const pauseReq = new PauseRequest();
              pauseReq.setConsumerName(consumerName);
              consumerServiceClient.pause(pauseReq, { deadline: createDeadline(10) })
                .catch((err) => notifyError(`Unable to pause consumer ${consumerName}. ${err}`));
            }
          }}
          type='danger'
        />
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
