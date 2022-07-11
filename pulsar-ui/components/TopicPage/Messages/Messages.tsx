import React, { useCallback, useEffect, useRef, useState } from 'react';
import s from './Messages.module.css'
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { Message, CreateConsumerRequest, ResumeRequest, ResumeResponse, SubscriptionType, TopicSelector, DeleteConsumerRequest, PauseRequest, SubscriptionInitialPosition, DeleteSubscriptionRequest } from '../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import MessageComponent from './Message/Message';
import { nanoid } from 'nanoid';
import * as Notifications from '../../app/contexts/Notifications';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ClientReadableStream } from 'grpc-web';
import { createDeadline } from '../../../grpc/proto-utils';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import pauseIcon from '!!raw-loader!./icons/pause.svg';
import resumeIcon from '!!raw-loader!./icons/resume.svg';
import Button from '../../ui/Button/Button';
import { useDebounce } from 'use-debounce'
import * as I18n from '../../app/contexts/I18n/I18n';

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

const displayMessagesLimit = 10000;

const Messages: React.FC<MessagesProps> = (props) => {
  const i18n = I18n.useContext();
  const { notifyError } = Notifications.useContext();
  const listRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { consumerServiceClient } = PulsarGrpcClient.useContext();
  const [isPaused, setIsPaused] = useState(true);
  const [isPausedBeforeWindowBlur, setIsPausedBeforeWindowBlur] = useState(isPaused);
  const [consumerName, _] = useState('__xray_' + nanoid());
  const [subscriptionName, __] = useState('__xray_' + nanoid());
  const [stream, setStream] = useState<ClientReadableStream<ResumeResponse>>();
  const streamRef = useRef<ClientReadableStream<ResumeResponse>>();
  const [messages, setMessages] = useState<KeyedMessage[]>([]);
  const [messagesCount, setMessagesCount] = useState(0);
  const [messagesDebounced] = useDebounce(messages, 300, { maxWait: 300 })

  const streamDataHandler = useCallback((res: ResumeResponse) => {
    const newMessages = res.getMessagesList().map(m => ({ message: m, key: nanoid() }));
    setMessagesCount(messagesCount => messagesCount + newMessages.length);
    setMessages(messages => {
      let messagesToSet = messages.concat(newMessages);
      return messagesToSet.slice(messagesToSet.length - displayMessagesLimit, messagesToSet.length);
    });
  }, []);

  // It fixes Virtuoso's native "followOutput" glitches.
  useEffect(() => virtuosoRef.current?.scrollToIndex(messagesDebounced.length - 1), [messagesDebounced]);

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

    const cleanup = async () => {
      streamRef.current?.cancel();
      streamRef.current?.removeListener('data', streamDataHandler);

      async function deleteConsumer() {
        const deleteConsumerReq = new DeleteConsumerRequest();
        deleteConsumerReq.setConsumerName(consumerName);
        await consumerServiceClient.deleteConsumer(deleteConsumerReq, { deadline: createDeadline(10) })
          .catch((err) => notifyError(`Unable to delete consumer ${consumerName}. ${err}`));
      }

      async function deleteSubscription() {
        const deleteSubscriptionReq = new DeleteSubscriptionRequest();
        deleteSubscriptionReq.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
        deleteSubscriptionReq.setSubscriptionName(subscriptionName);
        deleteSubscriptionReq.setForce(true);
        await consumerServiceClient.deleteSubscription(deleteSubscriptionReq, { deadline: createDeadline(10) })
          .catch((err) => notifyError(`Unable to delete subscription ${subscriptionName}. ${err}`));
      }

      deleteConsumer(); // Don't await this
      deleteSubscription(); // Don't await this
    };

    window.addEventListener('beforeunload', cleanup);

    return () => {
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
    };
  }, []);

  // Stream's connection pauses on window blur and we don't receive new messages.
  // Here we are trying to handle this situation.
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'hidden') {
      setIsPausedBeforeWindowBlur(isPaused);
      setIsPaused(true);
      return;
    }

    if (document.visibilityState === 'visible') {
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
      const newStream = consumerServiceClient.resume(resumeReq, { deadline: createDeadline(60 * 10) });
      setStream(() => newStream);
    }

    if (!isPaused) {
      virtuosoRef.current?.scrollToIndex(messagesDebounced.length - 1);
    }
  }, [isPaused]);

  return (
    <div className={s.Messages}>
      <div className={s.Toolbar}>
        <div className={s.ToolbarLeft}>
          <div className={s.Buttons}>
            <div className={s.ButtonsButton}>
              <Button
                title={isPaused ? "Resume" : "Pause"}
                svgIcon={isPaused ? resumeIcon : pauseIcon}
                onClick={() => setIsPaused(isPaused => !isPaused)}
                type={isPaused ? 'primary' : 'danger'}
              />
            </div>
          </div>
        </div>

        <div className={s.ToolbarRight}>
          <strong>{i18n.formatLongNumber(messagesCount)}</strong>&nbsp;messages loaded
        </div>
      </div>
      <div
        className={s.List}
        ref={listRef}
        onWheel={(e) => {
          if (e.deltaY < 0) {
            setIsPaused(() => true);
            return;
          }
        }}
      >
        <Virtuoso<KeyedMessage>
          className={s.Virtuoso}
          ref={virtuosoRef}
          data={messagesDebounced}
          totalCount={messagesDebounced.length}
          customScrollParent={listRef.current || undefined}
          itemContent={(_, { key, message }) => <MessageComponent key={key} message={message} />}
          followOutput={!isPaused}
        />
      </div>
    </div>
  );
}

export default Messages;
