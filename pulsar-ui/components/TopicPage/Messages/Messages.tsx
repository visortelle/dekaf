import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  SeekRequest,
  RegexSubscriptionMode,
  TopicsSelectorByNames,
  TopicsSelectorByRegex,
  SubscriptionMode
} from '../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import { detect as detectBrowser } from 'detect-browser';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';
import MessageComponent from './Message/Message';
import { nanoid } from 'nanoid';
import * as Notifications from '../../app/contexts/Notifications';
import * as I18n from '../../app/contexts/I18n/I18n';
import { ItemContent, Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ClientReadableStream } from 'grpc-web';
import { createDeadline } from '../../../grpc/proto-utils';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import { useInterval } from '../../app/hooks/use-interval';
import { usePrevious } from '../../app/hooks/use-previous';
import Toolbar from './Toolbar';
import { SessionState, SessionConfig } from './types';
import SessionConfiguration from './SessionConfiguration/SessionConfiguration';
import { quickDateToDate } from './SessionConfiguration/StartFromInput/quick-date';
import { timestampToDate } from './SessionConfiguration/StartFromInput/timestamp-to-date';
import { useAnimationFrame } from '../../app/hooks/use-animation-frame';
import Console from './Console/Console';
import dayjs from 'dayjs';
import useSWR from 'swr';
import { GetTopicsInternalStatsRequest } from '../../../grpc-web/tools/teal/pulsar/ui/api/v1/topic_pb';
import { swrKeys } from '../../swrKeys';

const consoleCss = "color: #276ff4; font-weight: bold;";
const browser = detectBrowser();
const isSlowBrowser = browser?.name === 'safari' || browser?.name === 'firefox';

export type SessionProps = {
  sessionKey: number;
  config: SessionConfig;
  onConfigChange: (config: SessionConfig) => void;
  onStopSession: () => void;
  isShowConsole: boolean;
  onSetIsShowConsole: (v: boolean) => void;
};

type Content = 'messages' | 'configuration';
type MessagesLoadedPerSecond = { prevMessagesLoaded: number, messagesLoadedPerSecond: number };

const displayMessagesLimit = 10000;

const Session: React.FC<SessionProps> = (props) => {
  const appContext = AppContext.useContext();
  const { notifyError } = Notifications.useContext();
  const i18n = I18n.useContext();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { consumerServiceClient, topicServiceClient } = PulsarGrpcClient.useContext();
  const [sessionState, setSessionState] = useState<SessionState>('new');
  const [sessionStateBeforeWindowBlur, setSessionStateBeforeWindowBlur] = useState<SessionState>(sessionState);
  const prevSessionState = usePrevious(sessionState);
  const [consumerName, setConsumerName] = useState<string>('__xray_con_' + nanoid());
  const [subscriptionName, setSubscriptionName] = useState<string>('__xray_sub_' + nanoid());
  const [stream, setStream] = useState<ClientReadableStream<ResumeResponse> | undefined>(undefined);
  const streamRef = useRef<ClientReadableStream<ResumeResponse> | undefined>(undefined);
  const [messagesLoaded, setMessagesLoaded] = useState<number>(0);
  const [messagesLoadedPerSecond, setMessagesLoadedPerSecond] = useState<MessagesLoadedPerSecond>({ prevMessagesLoaded: 0, messagesLoadedPerSecond: 0 });
  const messagesProcessed = useRef<number>(0);
  const messagesBuffer = useRef<Message[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const { startFrom, topicsSelector } = props.config;

  const { data: topicsInternalStats, error: topicsInternalStatsError } = useSWR(
    swrKeys.pulsar.customApi.metrics.topicsInternalStats._(
      props.config.topicsSelector.type === 'by-names' ? props.config.topicsSelector.topics : []
    ).concat([props.sessionKey.toString()]), // In case we cache the response, there cases where initial cursor position is from previous session.
    async () => {
      if (props.config.topicsSelector.type !== 'by-names') {
        return undefined;
      }

      const req = new GetTopicsInternalStatsRequest();
      req.setTopicsList(props.config.topicsSelector.topics);
      const res = await topicServiceClient.getTopicsInternalStats(req, {});
      return res;
    },
    { refreshInterval: sessionState === 'awaiting-initial-cursor-positions' ? 200 : 1000 }
  );

  if (topicsInternalStatsError || (topicsInternalStats && topicsInternalStats?.getStatus()?.getCode() !== Code.OK)) {
    notifyError(`Unable to get topics internal stats. ${topicsInternalStatsError}`);
  }

  const scrollToBottom = () => {
    const scrollParent = listRef.current?.children[0];
    scrollParent?.scrollTo({ top: scrollParent.scrollHeight, behavior: 'auto' });
  }

  useInterval(() => {
    setMessagesLoadedPerSecond(() => ({ prevMessagesLoaded: messagesLoaded, messagesLoadedPerSecond: messagesLoaded - messagesLoadedPerSecond.prevMessagesLoaded }));
  }, 1000);

  useInterval(() => {
    if (messagesBuffer.current.length === 0) {
      return;
    }

    setMessages((messages) => {
      const newMessages = messages.concat(messagesBuffer.current);
      messagesBuffer.current = [];
      return newMessages.slice(newMessages.length - displayMessagesLimit, newMessages.length);
    });
  }, messagesLoadedPerSecond.messagesLoadedPerSecond > 0 ? (isSlowBrowser && messagesLoadedPerSecond.messagesLoadedPerSecond > 1000) ? 500 : (messagesLoadedPerSecond.messagesLoadedPerSecond > 3000 ? 500 : 32) : false);

  useAnimationFrame(() => {
    if (messagesLoadedPerSecond.messagesLoadedPerSecond > 0) {
      scrollToBottom();
    }
  });

  const applyConfig = async () => {
    if (startFrom.type === 'messageId') {
      const seekReq = new SeekRequest();
      seekReq.setConsumerName(consumerName);
      seekReq.setMessageId(i18n.hexStringToBytes(startFrom.hexString));
      const res = await consumerServiceClient.seek(seekReq, { deadline: createDeadline(10) })
        .catch((err) => notifyError(`Unable to seek by messageId. Consumer: ${consumerName}. ${err}`));

      if (res !== undefined) {
        const status = res.getStatus();
        const code = status?.getCode();
        if (code === Code.INVALID_ARGUMENT) {
          notifyError(
            <div>
              Unable to seek by messageId. Consumer: {consumerName}.<br /><br />
              Possible reasons:<br />
              - Message with such id doesn&apos;t exist specified.<br />
              - Some of the topics are partitioned.
            </div>
          );
          props.onStopSession();
          return;
        }
      }
    }

    if (startFrom.type === 'date' || startFrom.type === 'timestamp' || startFrom.type === 'quickDate') {
      let fromDate;
      switch (startFrom.type) {
        case 'date': fromDate = dayjs(startFrom.date).millisecond(0).toDate(); break;
        case 'timestamp': fromDate = dayjs(timestampToDate(startFrom.ts)).millisecond(0).toDate(); break;
        case 'quickDate': fromDate = dayjs(quickDateToDate(startFrom.quickDate, startFrom.relativeTo)).millisecond(0).toDate(); break;
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
    const newMessages = res.getMessagesList();
    setMessagesLoaded(messagesCount => messagesCount + newMessages.length);
    for (let i = 0; i < newMessages.length; i++) {
      messagesBuffer.current.push(newMessages[i]);
    }

    messagesProcessed.current = res.getProcessedMessages();
  }, []);

  useEffect(() => {
    streamRef.current = stream;

    (async () => {
      if (stream === undefined) {
        return;
      }

      await applyConfig();
      stream.removeListener('data', streamDataHandler);
      stream.on('data', streamDataHandler);
    })()

  }, [stream]);

  const cleanup = useCallback(async () => {
    console.info(`%cCleaning up session: ${props.sessionKey}`, consoleCss);

    streamRef.current?.cancel();
    streamRef.current?.removeListener('data', streamDataHandler);
    setMessages([]);

    async function deleteConsumer() {
      const deleteConsumerReq = new DeleteConsumerRequest();
      deleteConsumerReq.setConsumerName(consumerName);
      await consumerServiceClient.deleteConsumer(deleteConsumerReq, { deadline: createDeadline(10) })
        .catch((err) => notifyError(`Unable to delete consumer ${consumerName}. ${err}`));
    }

    deleteConsumer(); // Don't await this
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

      if (topicsSelector.type === 'by-names') {
        const selector = new TopicsSelectorByNames();
        selector.setTopicsList(topicsSelector.topics);
        topicSelector.setByNames(selector);
      }

      if (topicsSelector.type === 'by-regex') {
        const selector = new TopicsSelectorByRegex();
        selector.setPattern(topicsSelector.pattern);

        let regexSubscriptionMode: RegexSubscriptionMode;
        switch (topicsSelector.regexSubscriptionMode) {
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
      req.setSubscriptionType(SubscriptionType.SUBSCRIPTION_TYPE_EXCLUSIVE);
      req.setSubscriptionMode(SubscriptionMode.SUBSCRIPTION_MODE_NON_DURABLE);
      req.setSubscriptionInitialPosition(startFrom.type === 'earliest' ? SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_EARLIEST : SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_LATEST);
      req.setPriorityLevel(1000);

      const res = await consumerServiceClient.createConsumer(req, {}).catch(err => notifyError(`Unable to create consumer ${consumerName}. ${err}`));
      if (res === undefined) {
        return;
      }

      const status = res.getStatus();
      const code = status?.getCode();

      if (code === Code.OK) {
        setSessionState('awaiting-initial-cursor-positions');
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
  }, [props.config, subscriptionName]);

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
      console.info(`%cInitializing session: ${props.sessionKey}`, consoleCss);

      initializeSession();
    }

    if (sessionState === 'paused') {
      console.info(`%cPausing session: ${props.sessionKey}`, consoleCss);

      const pauseReq = new PauseRequest();
      pauseReq.setConsumerName(consumerName);
      consumerServiceClient.pause(pauseReq, { deadline: createDeadline(10) })
        .catch((err) => notifyError(`Unable to pause consumer ${consumerName}. ${err}`));

      if (prevSessionState === 'running') {
        scrollToBottom(); // Force scroll to bottom. Otherwise, scroll position sometimes left in a middle after pausing.
      }
      return;
    }

    if (sessionState === 'awaiting-initial-cursor-positions') {
      console.info(`%cAwaiting initial cursor positions for session: ${props.sessionKey}`, consoleCss);
    }

    if (sessionState === 'got-initial-cursor-positions') {
      console.info(`%cGot initial cursor positions for session: ${props.sessionKey}`, consoleCss);
      setSessionState('running');
    }

    if (sessionState === 'running') {
      console.info(`%cRunning session: ${props.sessionKey}`, consoleCss);

      const resumeReq = new ResumeRequest();
      resumeReq.setConsumerName(consumerName);
      stream?.cancel();
      stream?.removeListener('data', streamDataHandler);
      const newStream = consumerServiceClient.resume(resumeReq, { deadline: createDeadline(60 * 10) });
      setStream(() => newStream);
      return;
    }

    if (sessionState && prevSessionState === undefined) {
      console.info(`%c--------------------`, consoleCss);
      console.info(`%cStarting new consumer session: ${props.sessionKey}`, consoleCss);
      console.info('%cSession config: %o', consoleCss, props.config);
      console.info('%cConsumer name:', consoleCss, consumerName);
      console.info('%cSubscription name:', consoleCss, subscriptionName);
    }

    if (sessionState === 'new' && prevSessionState !== undefined) {
      cleanup();
    }
  }, [sessionState]);

  const itemContent = useCallback<ItemContent<Message, undefined>>((i, message) => <MessageComponent key={i} message={message} isShowTooltips={sessionState !== 'running'} />, [sessionState]);
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
        messagesProcessed={messagesProcessed.current}
        onStopSession={props.onStopSession}
        onToggleConsoleClick={() => props.onSetIsShowConsole(!props.isShowConsole)}
      />

      {content === 'messages' && messages.length === 0 && (
        <div className={s.NoMessages}>
          {sessionState === 'initializing' && 'Initializing session.'}
          {sessionState === 'awaiting-initial-cursor-positions' && 'Awaiting for initial cursor positions.'}
          {sessionState === 'running' && 'Awaiting for new messages...'}
          {sessionState === 'paused' && 'No messages where loaded.'}
        </div>
      )}
      {content === 'messages' && messages.length > 0 && (
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
            followOutput={false}
          />
        </div>
      )}

      {content === 'configuration' && (
        <SessionConfiguration
          config={props.config}
          onConfigChange={props.onConfigChange}
          topicsInternalStats={topicsInternalStats}
        />
      )}

      <Console
        isShow={props.isShowConsole}
        onClose={() => props.onSetIsShowConsole(false)}
        sessionKey={props.sessionKey}
        sessionState={sessionState}
        onSessionStateChange={setSessionState}
        sessionConfig={props.config}
        sessionSubscriptionName={subscriptionName}
        topicsInternalStats={topicsInternalStats}
      />
    </div>
  );
}

type SessionControllerProps = {
  config: SessionConfig;
};
const SessionController: React.FC<SessionControllerProps> = (props) => {
  const [sessionKey, setSessionKey] = useState<number>(0);
  const [config, setConfig] = useState<SessionConfig>(props.config);
  const [isShowConsole, setIsShowConsole] = useState<boolean>(false);

  return (
    <Session
      key={sessionKey}
      sessionKey={sessionKey}
      isShowConsole={isShowConsole}
      onSetIsShowConsole={() => setIsShowConsole(!isShowConsole)}
      {...props}
      onStopSession={() => {
        setSessionKey(n => n + 1);
      }}
      config={config}
      onConfigChange={(v) => {
        setConfig(v);
      }}
    />
  );
}

export default SessionController;

export function hexStringToByteArray(hexString: string): Uint8Array {
  if (hexString.length % 2 !== 0) {
    throw "Must have an even number of hex digits to convert to bytes";
  }
  var numBytes = hexString.length / 2;
  var byteArray = new Uint8Array(numBytes);
  for (var i = 0; i < numBytes; i++) {
    byteArray[i] = parseInt(hexString.substr(i * 2, 2), 16);
  }
  return byteArray;
}
