import React, { useCallback, useEffect, useRef, useState } from 'react';
import s from './Messages.module.css'
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { Message, CreateConsumerRequest, ResumeRequest, ResumeResponse, SubscriptionType, TopicSelector, DeleteConsumerRequest, PauseRequest, SubscriptionInitialPosition } from '../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import { nanoid } from 'nanoid';
import * as Notifications from '../../app/contexts/Notifications';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ClientReadableStream } from 'grpc-web';
import { createDeadline } from '../../../grpc/proto-utils';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import followOutputIcon from '!!raw-loader!./icons/follow-output.svg';
import pauseIcon from '!!raw-loader!./icons/pause.svg';
import resumeIcon from '!!raw-loader!./icons/resume.svg';
import Button from '../../ui/Button/Button';

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
  const [isFollowOutput, setIsFollowOutput] = useState(true);
  const [isPaused, setIsPaused] = useState(true);
  const [isPausedBeforeWindowBlur, setIsPausedBeforeWindowBlur] = useState(isPaused);
  const [consumerName, _] = useState('__xray_' + nanoid());
  const [subscriptionName, __] = useState('__xray_' + nanoid());
  const [stream, setStream] = useState<ClientReadableStream<ResumeResponse>>();
  const streamRef = useRef<ClientReadableStream<ResumeResponse>>();

  const streamDataHandler = useCallback((res: ResumeResponse) => {
    const newMessages = res.getMessagesList().map(m => ({ message: m, key: nanoid() }));
    setMessages(messages => messages.concat(newMessages));
  }, [setMessages]);

  useEffect(() => {
    streamRef.current = stream;

    if (stream === undefined) {
      return;
    }

    stream.removeListener('data', streamDataHandler)
    stream.on('data', streamDataHandler);
  }, [stream]);

  useEffect(() => {
    async function createConsumer() {
      const req = new CreateConsumerRequest();
      const topicSelector = new TopicSelector();
      topicSelector.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setTopicSelector(topicSelector)
      req.setConsumerName(consumerName);
      req.setStartPaused(true);
      req.setSubscriptionName(subscriptionName);
      req.setSubscriptionType(SubscriptionType.SUBSCRIPTION_TYPE_SHARED);
      req.setSubscriptionInitialPosition(SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_EARLIEST);
      req.setPriorityLevel(1000);

      const res = await consumerServiceClient.createConsumer(req, { deadline: createDeadline(10) }).catch(err => notifyError(`Unable to create consumer ${consumerName}. ${err}`));

      if (res === undefined) {
        return;
      }

      const status = res.getStatus();
      const code = status?.getCode();

      if (code !== Code.OK) {
        const errorMessage = status?.getMessage();
        notifyError(`Unable to create consumer. ${errorMessage}`);
        return;
      }
    }

    createConsumer();

    return () => {
      streamRef.current?.cancel();
      streamRef.current?.removeListener('data', streamDataHandler);

      async function deleteConsumer() {
        const deleteConsumerReq = new DeleteConsumerRequest();
        deleteConsumerReq.setConsumerName(consumerName);
        await consumerServiceClient.deleteConsumer(deleteConsumerReq, { deadline: createDeadline(10) })
          .catch((err) => notifyError(`Unable to delete consumer ${consumerName}. ${err}`));
      }

      deleteConsumer();
    };
  }, []);

  // Stream's connection pauses on window blur and we don't receive new messages.
  // Here we are trying to handle this situation.
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'hidden') {
      console.log('hidden', isPaused, isPausedBeforeWindowBlur);
      setIsPausedBeforeWindowBlur(isPaused);
      setIsPaused(true);
      return;
    }

    if (document.visibilityState === 'visible') {
      console.log('visible', isPaused, isPausedBeforeWindowBlur);
      setIsPaused(isPausedBeforeWindowBlur);
      return;
    }
  }, [isPaused, isPausedBeforeWindowBlur]);

  useEffect(() => {
    if (window === undefined) return;
    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleVisibilityChange]);

  useEffect(() => {
    if (isPaused) {
      const pauseReq = new PauseRequest();
      pauseReq.setConsumerName(consumerName);
      consumerServiceClient.pause(pauseReq, { deadline: createDeadline(10) })
        .catch((err) => notifyError(`Unable to pause consumer ${consumerName}. ${err}`));
    } else {
      const resumeReq = new ResumeRequest();
      resumeReq.setConsumerName(consumerName);
      stream?.cancel();
      stream?.removeListener('data', streamDataHandler)
      const newStream = consumerServiceClient.resume(resumeReq, { deadline: createDeadline(10) });
      setStream(() => newStream);
    }
  }, [isPaused]);


  return (
    <div className={s.Messages}>
      <div className={s.Toolbar}>
        <strong>{messages.length}</strong>&nbsp;messages loaded
        <div className={s.Buttons}>
          <div className={s.ButtonsButton}>
            <Button
              title={isPaused ? "Resume" : "Pause"}
              svgIcon={isPaused ? resumeIcon : pauseIcon}
              onClick={() => setIsPaused(isPaused => !isPaused)}
              type={isPaused ? 'primary' : 'danger'}
            />
          </div>
          <div className={s.ButtonsButton}>
            <Button
              title="Follow output"
              svgIcon={followOutputIcon}
              disabled={isFollowOutput}
              onClick={() => {
                setIsFollowOutput(!isFollowOutput);
                if (!isFollowOutput) {
                  virtuosoRef.current?.scrollToIndex(messages.length - 1);
                }
              }}
              type='primary'
            />
          </div>
        </div>
      </div>
      <div
        className={s.List}
        ref={listRef}
        onWheel={(e) => {
          if (e.deltaY < 0) {
            setIsFollowOutput(false)
            return;
          }

          if (listRef.current && listRef.current?.scrollHeight - listRef.current?.scrollTop - listRef.current?.clientHeight <= 0) {
            setIsFollowOutput(true);
          }
        }}
      >
        <Virtuoso<KeyedMessage>
          className={s.Virtuoso}
          ref={virtuosoRef}
          data={messages}
          totalCount={messages.length}
          overscan={{ main: (listRef?.current?.clientHeight || 0), reverse: (listRef?.current?.clientHeight || 0) }}
          customScrollParent={listRef.current || undefined}
          itemContent={(_, { key, message }) => <MessageComponent key={key} message={message} />}
          followOutput={isFollowOutput}
          itemsRendered={() => {
            if (isFollowOutput) {
              virtuosoRef.current?.scrollToIndex(messages.length - 1);
            }
          }}
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
