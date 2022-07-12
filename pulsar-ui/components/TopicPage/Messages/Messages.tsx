import React, { useCallback, useEffect, useRef, useState } from 'react';
import s from './Messages.module.css'
import * as AppContext from '../../app/contexts/AppContext';
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { Message, CreateConsumerRequest, ResumeRequest, ResumeResponse, SubscriptionType, TopicSelector, DeleteConsumerRequest, PauseRequest, SubscriptionInitialPosition, DeleteSubscriptionRequest, SeekRequest } from '../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';
import MessageComponent from './Message/Message';
import { nanoid } from 'nanoid';
import * as Notifications from '../../app/contexts/Notifications';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ClientReadableStream } from 'grpc-web';
import { createDeadline } from '../../../grpc/proto-utils';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import { useDebounce } from 'use-debounce'
import { useInterval } from '../../app/hooks/use-interval';
import ReactTooltip from 'react-tooltip';
import Toolbar from './Toolbar';

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
  const appContext = AppContext.useContext();
  const { notifyError } = Notifications.useContext();
  const listRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { consumerServiceClient } = PulsarGrpcClient.useContext();
  const [isPaused, setIsPaused] = useState(true);
  const [isPausedBeforeWindowBlur, setIsPausedBeforeWindowBlur] = useState(isPaused);
  const consumerName = useRef('__xray_' + nanoid());
  const subscriptionName = useRef('__xray_' + nanoid());
  const [stream, setStream] = useState<ClientReadableStream<ResumeResponse>>();
  const streamRef = useRef<ClientReadableStream<ResumeResponse>>();
  const [filterChangeCounter, setFilterChangeCounter] = useState(0);
  const [messages, setMessages] = useState<KeyedMessage[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(0);
  const [messagesLoadedPerSecond, setMessagesLoadedPerSecond] = useState<{ prevMessagesLoaded: number, messagesLoadedPerSecond: number }>({ prevMessagesLoaded: 0, messagesLoadedPerSecond: 0 });
  const [messagesDebounced] = useDebounce(messages, 300, { maxWait: 300 });
  const [seekByTimestamp, setSeekByTimestamp] = useState<Date | undefined>(undefined);

  useInterval(() => setMessagesLoadedPerSecond({ prevMessagesLoaded: messagesLoaded, messagesLoadedPerSecond: messagesLoaded - messagesLoadedPerSecond.prevMessagesLoaded }), 1000);
  useInterval(() => ReactTooltip.rebuild(), 500);

  const streamDataHandler = useCallback((res: ResumeResponse) => {
    const newMessages = res.getMessagesList().map(m => ({ message: m, key: nanoid() }));
    setMessagesLoaded(messagesCount => messagesCount + newMessages.length);
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
      req.setConsumerName(consumerName.current);
      req.setStartPaused(true);
      req.setSubscriptionName(subscriptionName.current);
      req.setSubscriptionType(SubscriptionType.SUBSCRIPTION_TYPE_SHARED);
      req.setSubscriptionInitialPosition(SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_EARLIEST);
      req.setPriorityLevel(1000);

      const res = await consumerServiceClient.createConsumer(req, { deadline: createDeadline(10) }).catch(err => notifyError(`Unable to create consumer ${consumerName.current}. ${err}`));

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
        deleteConsumerReq.setConsumerName(consumerName.current);
        await consumerServiceClient.deleteConsumer(deleteConsumerReq, { deadline: createDeadline(10) })
          .catch((err) => notifyError(`Unable to delete consumer ${consumerName.current}. ${err}`));
      }

      async function deleteSubscription() {
        const deleteSubscriptionReq = new DeleteSubscriptionRequest();
        deleteSubscriptionReq.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
        deleteSubscriptionReq.setSubscriptionName(subscriptionName.current);
        deleteSubscriptionReq.setForce(true);
        await consumerServiceClient.deleteSubscription(deleteSubscriptionReq, { deadline: createDeadline(10) })
          .catch((err) => notifyError(`Unable to delete subscription ${subscriptionName.current}. ${err}`));
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
      pauseReq.setConsumerName(consumerName.current);
      consumerServiceClient.pause(pauseReq, { deadline: createDeadline(10) })
        .catch((err) => notifyError(`Unable to pause consumer ${consumerName.current}. ${err}`));
    } else {
      const resumeReq = new ResumeRequest();
      resumeReq.setConsumerName(consumerName.current);
      stream?.cancel();
      stream?.removeListener('data', streamDataHandler)
      const newStream = consumerServiceClient.resume(resumeReq, { deadline: createDeadline(60 * 10) });
      setStream(() => newStream);
    }

    if (!isPaused) {
      virtuosoRef.current?.scrollToIndex(messagesDebounced.length - 1);
    }

    appContext.setPerformanceOptimizations({ ...appContext.performanceOptimizations, pulsarConsumerState: isPaused ? 'inactive' : 'active' });
  }, [isPaused]);

  useEffect(() => {
    async function seek() {
      setIsPaused(true);
      if (seekByTimestamp === undefined) {
        return;
      }
      const seekReq = new SeekRequest();
      const timestamp = new Timestamp();
      timestamp.setSeconds(seekByTimestamp.getTime() / 1000);
      timestamp.setNanos(seekByTimestamp.getMilliseconds() * 1000);
      seekReq.setConsumerName(consumerName.current);
      seekReq.setTimestamp(timestamp);
      await consumerServiceClient.seek(seekReq, { deadline: createDeadline(10) })
        .catch((err) => notifyError(`Unable to seek by timestamp. Consumer: ${consumerName.current}. ${err}`));
    }

    setFilterChangeCounter(filterChangeCounter + 1);
    seek();

  }, [seekByTimestamp])

  useEffect(() => {
    setMessages([]); // Reset loaded messages.
  }, [filterChangeCounter]);

  return (
    <div className={s.Messages}>
      <Toolbar
        isPaused={isPaused}
        onSetIsPaused={setIsPaused}
        onSeekByTimestamp={(date) => setSeekByTimestamp(date)}
        seekByTimestamp={seekByTimestamp}
        messagesLoaded={messagesLoaded}
        messagesLoadedPerSecond={messagesLoadedPerSecond}
      />
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
