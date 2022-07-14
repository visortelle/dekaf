import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './Messages.module.css'
import * as AppContext from '../../app/contexts/AppContext';
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import {
  Message,
  CreateConsumerRequest,
  ResumeRequest,
  ResumeResponse,
  SubscriptionType,
  TopicsSelector,
  DeleteConsumerRequest,
  PauseRequest,
  SubscriptionInitialPosition,
  DeleteSubscriptionsRequest,
  DeleteSubscription,
  SeekRequest,
  RegexSubscriptionMode,
  TopicsSelectorByName,
  TopicsSelectorByRegex
} from '../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';
import MessageComponent from './Message/Message';
import { nanoid } from 'nanoid';
import * as Notifications from '../../app/contexts/Notifications';
import { ItemContent, Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ClientReadableStream } from 'grpc-web';
import { createDeadline } from '../../../grpc/proto-utils';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import { useInterval } from '../../app/hooks/use-interval';
import { usePrevious } from '../../app/hooks/use-previous';
import Toolbar from './Toolbar';
import { SessionState, SessionConfig, SessionTopicsSelector } from './types';
import SessionConfiguration from './SessionConfiguration/SessionConfiguration';
import { quickDateToDate } from './SessionConfiguration/StartFromInput/quick-date';
import { timestampToDate } from './SessionConfiguration/StartFromInput/timestamp-to-date';
import dayjs from 'dayjs';

export type SessionProps = {
  config: SessionConfig;
  onConfigChange: (config: SessionConfig) => void;
  onStopSession: () => void;
};

type KeyedMessage = {
  message: Message;
  key: string;
}

type Content = 'messages' | 'configuration';
type MessagesLoadedPerSecond = { prevMessagesLoaded: number, messagesLoadedPerSecond: number };

const displayMessagesLimit = 10000;

type Defaults = {
  sessionState: () => SessionState,
  sessionStateBeforeBlur: () => SessionState,
  consumerName: () => string,
  subscriptionName: () => string,
  stream: () => ClientReadableStream<ResumeResponse> | undefined,
  streamRef: () => ClientReadableStream<ResumeResponse> | undefined,
  messagesLoaded: () => number,
  messagesLoadedPerSecond: () => MessagesLoadedPerSecond,
  messagesBuffer: () => KeyedMessage[],
  messages: () => KeyedMessage[]
}

const defaults: Defaults = {
  sessionState: (): SessionState => 'new',
  sessionStateBeforeBlur: (): SessionState => 'new',
  consumerName: () => '__xray_' + nanoid(),
  subscriptionName: () => '__xray_' + nanoid(),
  stream: () => undefined,
  streamRef: () => undefined,
  messagesLoaded: () => 0,
  messagesLoadedPerSecond: (): MessagesLoadedPerSecond => ({ prevMessagesLoaded: 0, messagesLoadedPerSecond: 0 }),
  messagesBuffer: (): KeyedMessage[] => [],
  messages: (): KeyedMessage[] => []
}

const Session: React.FC<SessionProps> = (props) => {
  const appContext = AppContext.useContext();
  const { notifyError, notifyWarn } = Notifications.useContext();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { consumerServiceClient } = PulsarGrpcClient.useContext();
  const [sessionState, setSessionState] = useState<SessionState>(defaults.sessionState());
  const [sessionStateBeforeWindowBlur, setSessionStateBeforeWindowBlur] = useState<SessionState>(defaults.sessionStateBeforeBlur());
  const prevSessionState = usePrevious(sessionState);
  const [consumerName, setConsumerName] = useState<string>(defaults.consumerName());
  const [subscriptionName, setSubscriptionName] = useState<string>(defaults.subscriptionName());
  const [stream, setStream] = useState<ClientReadableStream<ResumeResponse> | undefined>(defaults.stream());
  const streamRef = useRef<ClientReadableStream<ResumeResponse> | undefined>(defaults.streamRef());
  const [messagesLoaded, setMessagesLoaded] = useState<number>(defaults.messagesLoaded());
  const [messagesLoadedPerSecond, setMessagesLoadedPerSecond] = useState<MessagesLoadedPerSecond>(defaults.messagesLoadedPerSecond());
  const messagesBuffer = useRef<KeyedMessage[]>(defaults.messagesBuffer());
  const [messages, setMessages] = useState<KeyedMessage[]>(defaults.messages());

  useInterval(() => {
    setMessagesLoadedPerSecond(() => ({ prevMessagesLoaded: messagesLoaded, messagesLoadedPerSecond: sessionState === 'running' ? messagesLoaded - messagesLoadedPerSecond.prevMessagesLoaded : 0 }));
  }, sessionState === 'running' ? 1000 : false);
  useInterval(() => virtuosoRef.current?.scrollToIndex(messages.length - 1), sessionState === 'running' ? 300 : false); // Virtuoso's followOutput option doesn't work well with fast updates. We are trying to help it a bit. :)
  useInterval(() => {
    if (messagesBuffer.current.length === 0) {
      return;
    }

    setMessages((messages) => {
      const newMessages = messages.concat(messagesBuffer.current);
      messagesBuffer.current = [];
      return newMessages.slice(newMessages.length - displayMessagesLimit, newMessages.length);
    });

  }, sessionState === 'running' ? 32 : false);

  const applyConfig = async () => {
    if (props.config.startFrom.type === 'date' || props.config.startFrom.type === 'timestamp' || props.config.startFrom.type === 'quickDate') {
      let fromDate;
      switch(props.config.startFrom.type) {
        case 'date': fromDate = dayjs(props.config.startFrom.date).millisecond(0).toDate(); break;
        case 'timestamp': fromDate = dayjs(timestampToDate(props.config.startFrom.ts)).millisecond(0).toDate(); break;
        case 'quickDate': fromDate = dayjs(quickDateToDate(props.config.startFrom.quickDate, props.config.startFrom.relativeTo)).millisecond(0).toDate(); break;
      }

      if (fromDate === undefined) {
        return;
      }

      const seekReq = new SeekRequest();
      const timestamp = Timestamp.fromDate(fromDate);
      seekReq.setConsumerName(consumerName);
      seekReq.setTimestamp(timestamp);
      await consumerServiceClient.seek(seekReq, { deadline: createDeadline(10) })
        .catch((err) => notifyError(`Unable to seek by timestamp. Consumer: ${consumerName}. ${err}`));
    }
  }

  const streamDataHandler = useCallback((res: ResumeResponse) => {
    const newMessages = res.getMessagesList().map(m => ({ message: m, key: nanoid() }));
    setMessagesLoaded(messagesCount => messagesCount + newMessages.length);
    messagesBuffer.current.push(...newMessages);
  }, []);

  useEffect(() => {
    streamRef.current = stream;

    if (stream === undefined) {
      return;
    }

    (async () => {
      await applyConfig();
      stream.removeListener('data', streamDataHandler);
      stream.on('data', streamDataHandler);
    })()

  }, [stream]);

  const cleanup = useCallback(async () => {
    streamRef.current?.cancel();
    streamRef.current?.removeListener('data', streamDataHandler);
    setMessages([]);

    async function deleteConsumer() {
      const deleteConsumerReq = new DeleteConsumerRequest();
      deleteConsumerReq.setConsumerName(consumerName);
      await consumerServiceClient.deleteConsumer(deleteConsumerReq, { deadline: createDeadline(10) })
        .catch((err) => notifyError(`Unable to delete consumer ${consumerName}. ${err}`));
    }

    async function deleteSubscriptions() {
      if (props.config.topicsSelector.type === 'by-regex') {
        notifyWarn(
          <div>
            Currently we don&apos;t automatically delete subscriptions we create for topics matched to regex matched topics.
            <br />
            You should do it by yourself or
            <br />
            specify <code>subscriptionExpirationTimeMinutes</code> property in <code>broker.conf</code> or use **Subscription expiration time** policy at namespace level.
          </div>
        );
      }

      if (props.config.topicsSelector.type === 'by-names') {
        const deleteSubscriptionsReq = new DeleteSubscriptionsRequest();
        const deleteSubscriptionsList = props.config.topicsSelector.topics.map(t => {
          const deleteSub = new DeleteSubscription();
          deleteSub.setTopic(t);
          deleteSub.setSubscriptionName(subscriptionName);
          deleteSub.setForce(true);
          return deleteSub;
        });
        deleteSubscriptionsReq.setSubscriptionsList(deleteSubscriptionsList);

        await consumerServiceClient.deleteSubscriptions(deleteSubscriptionsReq, { deadline: createDeadline(10) })
          .catch((err) => notifyError(`Unable to delete subscription ${subscriptionName}. ${err}`));
      }
    }

    deleteConsumer(); // Don't await this
    deleteSubscriptions(); // Don't await this
  }, [prevSessionState, sessionState]);

  useEffect(() => {
    return () => {
      cleanup();
    }
  }, []);

  const initializeSession = useCallback(() => {
    async function createConsumer() {
      const req = new CreateConsumerRequest();
      const topicSelector = new TopicsSelector();

      if (props.config.topicsSelector.type === 'by-names') {
        const selector = new TopicsSelectorByName();
        selector.setTopicsList(props.config.topicsSelector.topics);
        topicSelector.setByName(selector);
      }

      if (props.config.topicsSelector.type === 'by-regex') {
        const selector = new TopicsSelectorByRegex();
        selector.setPattern(props.config.topicsSelector.pattern);

        let regexSubscriptionMode: RegexSubscriptionMode;
        switch (props.config.topicsSelector.regexSubscriptionMode) {
          case 'unspecified': regexSubscriptionMode = RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_UNSPECIFIED; break;
          case 'persistent-only': regexSubscriptionMode = RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_PERSISTENT_ONLY; break;
          case 'non-persistent-only': regexSubscriptionMode = RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_NON_PERSISTENT_ONLY; break;
          case 'all-topics': regexSubscriptionMode = RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_ALL_TOPICS; break;
        }

        selector.setRegexSubscriptionMode(regexSubscriptionMode);
        topicSelector.setByRegex(selector);
      }

      req.setTopicsSelector(topicSelector)
      req.setConsumerName(consumerName);
      req.setStartPaused(true);
      req.setSubscriptionName(subscriptionName);
      req.setSubscriptionType(SubscriptionType.SUBSCRIPTION_TYPE_SHARED);
      req.setSubscriptionInitialPosition(props.config.startFrom.type === 'earliest' ? SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_EARLIEST : SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_LATEST);
      req.setPriorityLevel(1000);

      const res = await consumerServiceClient.createConsumer(req, { deadline: createDeadline(10) }).catch(err => notifyError(`Unable to create consumer ${consumerName}. ${err}`));

      if (res === undefined) {
        return;
      }

      const status = res.getStatus();
      const code = status?.getCode();

      if (code === Code.OK) {
        setSessionState('running');
      }

      if (code !== Code.OK) {
        const errorMessage = status?.getMessage();
        notifyError(`Unable to create consumer. ${errorMessage}`);
        return;
      }
    }

    createConsumer();

    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('beforeunload', cleanup);
    };
  }, [props.config, consumerServiceClient, subscriptionName]);

  // Stream's connection pauses on window blur and we don't receive new messages.
  // Here we are trying to handle this situation.
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'hidden') {
      setSessionStateBeforeWindowBlur(sessionState);
      setSessionState('paused');
      return;
    }

    if (document.visibilityState === 'visible') {
      setSessionState(sessionStateBeforeWindowBlur);
      return;
    }
  }, [sessionState, sessionStateBeforeWindowBlur]);

  useEffect(() => {
    if (window === undefined) return;
    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleVisibilityChange]);

  useEffect(() => {
    appContext.setPerformanceOptimizations({ ...appContext.performanceOptimizations, pulsarConsumerState: sessionState === 'running' ? 'active' : 'inactive' });

    if (sessionState === 'initializing') {
      initializeSession();
    }

    if (sessionState === 'paused') {
      const pauseReq = new PauseRequest();
      pauseReq.setConsumerName(consumerName);
      consumerServiceClient.pause(pauseReq, { deadline: createDeadline(10) })
        .catch((err) => notifyError(`Unable to pause consumer ${consumerName}. ${err}`));
      return;
    }

    if (sessionState === 'running') {
      const resumeReq = new ResumeRequest();
      resumeReq.setConsumerName(consumerName);
      stream?.cancel();
      stream?.removeListener('data', streamDataHandler)
      const newStream = consumerServiceClient.resume(resumeReq, { deadline: createDeadline(60 * 10) });
      setStream(() => newStream);
      return;
    }

    if (sessionState === 'new' && prevSessionState !== undefined) {
      cleanup();
    }
  }, [sessionState]);

  const itemContent = useCallback<ItemContent<KeyedMessage, undefined>>((_, { key, message }) => <MessageComponent key={key} message={message} isShowTooltips={sessionState !== 'running'} />, [sessionState]);
  const overscan = useMemo(() => ({ main: window.innerHeight, reverse: window.innerHeight }), []);
  const onWheel = useCallback<React.WheelEventHandler<HTMLDivElement>>((e) => {
    if (e.deltaY < 0) {
      setSessionState('paused');
    }
  }, []);

  const content: Content = sessionState === 'new' ? 'configuration' : 'messages';

  return (
    <div className={s.Messages}>
      <Toolbar
        config={props.config}
        sessionState={sessionState}
        onSessionStateChange={setSessionState}
        messagesLoaded={messagesLoaded}
        messagesLoadedPerSecond={messagesLoadedPerSecond}
        onStopSession={props.onStopSession}
      />

      {content === 'messages' && (
        <div
          className={s.List}
          ref={listRef}
          onWheel={onWheel}
        >
          <Virtuoso
            className={s.Virtuoso}
            ref={virtuosoRef}
            data={messages}
            totalCount={messages.length}
            itemContent={itemContent}
            overscan={overscan}
            followOutput={true}
          />

        </div>
      )}
      {content === 'configuration' && (
        <SessionConfiguration
          config={props.config}
          onConfigChange={props.onConfigChange}
        />
      )}
    </div>
  );
}

type SessionControllerProps = {
  config: SessionConfig;
};
const SessionController: React.FC<SessionControllerProps> = (props) => {
  const [sessionKey, setSessionKey] = useState<number>(0);
  const [config, setConfig] = useState<SessionConfig>(props.config);

  return (
    <Session
      key={sessionKey}
      {...props}
      onStopSession={() => setSessionKey(n => n + 1)}
      config={config}
      onConfigChange={(v) => {
        console.log(v);
        setConfig(v);
      }}
    />
  );
}

export default SessionController;
