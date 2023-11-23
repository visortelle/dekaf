import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './Messages.module.css'
import * as AppContext from '../../app/contexts/AppContext';
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import {
  Message,
  CreateConsumerRequest,
  ResumeRequest,
  ResumeResponse,
  DeleteConsumerRequest,
  PauseRequest,
} from '../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import cts from "../../ui/ChildrenTable/ChildrenTable.module.css";
import arrowDownIcon from '../../ui/ChildrenTable/arrow-down.svg';
import arrowUpIcon from '../../ui/ChildrenTable/arrow-up.svg';
import MessageComponent from './Message/Message';
import { nanoid } from 'nanoid';
import * as Notifications from '../../app/contexts/Notifications';
import * as I18n from '../../app/contexts/I18n/I18n';
import { ItemContent, TableVirtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ClientReadableStream } from 'grpc-web';
import { createDeadline } from '../../../proto-utils/proto-utils';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import { useInterval } from '../../app/hooks/use-interval';
import { usePrevious } from '../../app/hooks/use-previous';
import Toolbar from './Toolbar';
import { SessionState, MessageDescriptor, ConsumerSessionConfig } from './types';
import SessionConfiguration from './SessionConfiguration/SessionConfiguration';
import Console from './Console/Console';
import SvgIcon from '../../ui/SvgIcon/SvgIcon';
import { consumerSessionConfigToPb, messageDescriptorFromPb } from './conversions';
import { SortKey, Sort, sortMessages } from './sort';
import { remToPx } from '../../ui/rem-to-px';
import { help } from './Message/fields';
import { tooltipId } from '../../ui/Tooltip/Tooltip';
import { renderToStaticMarkup } from 'react-dom/server';
import { ManagedConsumerSessionConfigValOrRef } from '../../ui/LibraryBrowser/model/user-managed-items';
import { consumerSessionConfigFromValOrRef } from '../../ui/LibraryBrowser/model/resolved-items-conversions';
import { LibraryContext } from '../../ui/LibraryBrowser/model/library-context';
import { getColoring } from './coloring';
import { cons } from 'fp-ts/lib/ReadonlyNonEmptyArray';

const consoleCss = "color: #276ff4; font-weight: var(--font-weight-bold);";

export type SessionProps = {
  sessionKey: number;
  configValOrRef: ManagedConsumerSessionConfigValOrRef;
  onConfigValOrRefChange: (config: ManagedConsumerSessionConfigValOrRef) => void;
  onStopSession: () => void;
  isShowConsole: boolean;
  onSetIsShowConsole: (v: boolean) => void;
  libraryContext: LibraryContext;
};

type View = 'messages' | 'configuration';
type MessagesPerSecond = { prev: number, now: number };

const displayMessagesRealTimeLimit = 250; // too many items leads to table blinking.

const Session: React.FC<SessionProps> = (props) => {
  const appContext = AppContext.useContext();
  const { notifyError } = Notifications.useContext();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const { consumerServiceClient } = GrpcClient.useContext();
  const [sessionState, setSessionState] = useState<SessionState>('new');
  const [sessionStateBeforeWindowBlur, setSessionStateBeforeWindowBlur] = useState<SessionState>(sessionState);
  const prevSessionState = usePrevious(sessionState);
  const consumerName = useRef<string>('__dekaf_' + nanoid());
  const subscriptionName = useRef<string>('__dekaf_' + nanoid());
  const [stream, setStream] = useState<ClientReadableStream<ResumeResponse> | undefined>(undefined);
  const streamRef = useRef<ClientReadableStream<ResumeResponse> | undefined>(undefined);
  const [displayMessagesLimit, setDisplayMessagesLimit] = useState<number>(10000);
  const [messagesLoaded, setMessagesLoaded] = useState<number>(0);
  const [messagesLoadedPerSecond, setMessagesLoadedPerSecond] = useState<MessagesPerSecond>({ prev: 0, now: 0 });
  const [messagesProcessedPerSecond, setMessagesProcessedPerSecond] = useState<MessagesPerSecond>({ prev: 0, now: 0 });
  const messagesProcessed = useRef<number>(0);
  const messagesBuffer = useRef<Message[]>([]);
  const [messages, setMessages] = useState<MessageDescriptor[]>([]);
  const [sort, setSort] = useState<Sort>({ key: 'publishTime', direction: 'asc' });

  const currentTopic = useMemo(() => props.libraryContext.pulsarResource.type === 'topic' ? props.libraryContext.pulsarResource : undefined, [props.libraryContext]);
  const currentTopicFqn: string | undefined = useMemo(() => currentTopic === undefined ? undefined : `${currentTopic.topicPersistency}://${currentTopic.tenant}/${currentTopic.namespace}/${currentTopic.topic}`, [currentTopic]);

  const config = useMemo<ConsumerSessionConfig | undefined>(() => {
    try {
      return consumerSessionConfigFromValOrRef(props.configValOrRef, currentTopicFqn);
    } catch (err) {
      console.warn(err);
      return undefined;
    }
  }, [props.configValOrRef]);

  const scrollToBottom = () => {
    const scrollParent = tableRef.current?.children[0];
    scrollParent?.scrollTo({ top: scrollParent.scrollHeight, behavior: 'auto' });
  }

  useInterval(() => {
    setMessagesLoadedPerSecond(() => ({ prev: messagesLoaded, now: messagesLoaded - messagesLoadedPerSecond.prev }));
    setMessagesProcessedPerSecond(() => ({ prev: messagesProcessed.current, now: messagesProcessed.current - messagesProcessedPerSecond.prev }));
  }, 1000);

  useInterval(() => {
    scrollToBottom();
  }, sessionState === 'running' ? 200 : false);

  useInterval(() => {
    if (messagesBuffer.current.length === 0) {
      return;
    }

    setMessages((messages) => {
      const newMessages = messages
        .concat(messagesBuffer.current.map(msg => messageDescriptorFromPb(msg)))
        .slice(-displayMessagesLimit);

      newMessages.forEach((message, i) => {
        message.index = (i + 1);
      });

      messagesBuffer.current = [];
      scrollToBottom();
      return newMessages;
    });
  }, messagesLoadedPerSecond.now > 0 ? 250 : false);

  const streamDataHandler = useCallback((res: ResumeResponse) => {
    const newMessages = res.getMessagesList();
    setMessagesLoaded(messagesCount => messagesCount + newMessages.length);
    for (let i = 0; i < newMessages.length; i++) {
      messagesBuffer.current.push(newMessages[i]);
    }

    messagesProcessed.current = res.getProcessedMessages();

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`${res.getStatus()?.getMessage()}`);
    }
  }, []);

  useEffect(() => {
    streamRef.current = stream;

    (async () => {
      if (stream === undefined) {
        return;
      }

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
      deleteConsumerReq.setConsumerName(consumerName.current);
      await consumerServiceClient.deleteConsumer(deleteConsumerReq, { deadline: createDeadline(10) })
        .catch((err) => notifyError(`Unable to delete consumer ${consumerName.current}. ${err}`));
    }

    deleteConsumer(); // Don't await this
  }, [prevSessionState, sessionState]);

  useEffect(() => {
    return () => {
      cleanup();
    }
  }, []);

  const initializeSession = () => {
    async function createConsumer() {
      if (config === undefined) {
        return;
      }

      const req = new CreateConsumerRequest();

      req.setConsumerName(consumerName.current);
      const consumerSessionConfigPb = consumerSessionConfigToPb(config);
      req.setConsumerSessionConfig(consumerSessionConfigPb);

      const res = await consumerServiceClient.createConsumer(req, {}).catch(err => notifyError(`Unable to create consumer ${consumerName.current}. ${err}`));
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
  };

  // Stream's connection pauses on window blur and we don't receive new messages.
  // Here we are trying to handle this situation.
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      setSessionStateBeforeWindowBlur(sessionState);
      setSessionState('pausing');
      return;
    }

    if (document.visibilityState === 'visible') {
      setSessionState(sessionStateBeforeWindowBlur);
      return;
    }
  };

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

    if (sessionState === 'pausing') {
      console.info(`%cPausing session: ${props.sessionKey}`, consoleCss);

      const pauseReq = new PauseRequest();
      pauseReq.setConsumerName(consumerName.current);
      consumerServiceClient.pause(pauseReq, { deadline: createDeadline(10) })
        .catch((err) => notifyError(`Unable to pause consumer ${consumerName.current}. ${err}`));

      return;
    }

    if (sessionState === 'running') {
      console.info(`%cRunning session: ${props.sessionKey}`, consoleCss);

      const resumeReq = new ResumeRequest();
      resumeReq.setConsumerName(consumerName.current);
      stream?.cancel();
      stream?.removeListener('data', streamDataHandler);
      const newStream = consumerServiceClient.resume(resumeReq, { deadline: createDeadline(60 * 10) });
      setStream(() => newStream);
      return;
    }

    if (sessionState && prevSessionState === undefined) {
      console.info(`%c--------------------`, consoleCss);
      console.info(`%cStarting new consumer session: ${props.sessionKey}`, consoleCss);
      console.info('%cSession config: %o', consoleCss, props.configValOrRef);
      console.info('%cConsumer name:', consoleCss, consumerName.current);
      console.info('%cSubscription name:', consoleCss, subscriptionName.current);
    }

    if (sessionState === 'new' && prevSessionState !== undefined) {
      cleanup();
    }
  }, [sessionState]);

  useEffect(() => {
    if (sessionState === 'pausing' && messagesLoadedPerSecond.now === 0) {
      setSessionState('paused');
      setTimeout(scrollToBottom, 250);
    }
  }, [sessionState, messagesLoadedPerSecond]);

  const isShowTooltips = sessionState !== 'running' && sessionState !== 'pausing';
  const itemContent = useCallback<ItemContent<MessageDescriptor, undefined>>((i, message) => {
    const coloring = config === undefined ? undefined : getColoring(config, message);

    return (
      <MessageComponent
        key={i}
        message={message}
        isShowTooltips={isShowTooltips}
        coloring={coloring}
      />
    );
  }, [sessionState, config]);

  const onWheel = useCallback<React.WheelEventHandler<HTMLDivElement>>((e) => {
    if (e.deltaY < 0 && sessionState === 'running') {
      setSessionState('pausing');
    }
  }, [sessionState]);

  const Th = useCallback((props: { title: React.ReactNode, help: React.ReactElement, sortKey?: SortKey, style?: React.CSSProperties }) => {
    const handleColumnHeaderClick = () => {
      if (props.sortKey === undefined) {
        return;
      }

      if (sort.key === props.sortKey) {
        setSort({ key: props.sortKey, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
      } else {
        setSort({ key: props.sortKey, direction: 'asc' });
      }
    }

    return (
      <th className={`${cts.Th} ${s.Th}`} style={props.style} onClick={handleColumnHeaderClick}>
        <div
          className={props.sortKey === undefined ? '' : cts.SortableTh}
          data-tooltip-id={tooltipId}
          data-tooltip-html={renderToStaticMarkup(props.help)}
        >
          {props.title}

          {sort.key === props.sortKey && (
            <div className={cts.SortableThIcon}>
              <SvgIcon svg={sort.direction === 'asc' ? arrowUpIcon : arrowDownIcon} />
            </div>
          )}
        </div>
      </th>
    );
  }, [sort]);

  const currentView: View = sessionState === 'new' ? 'configuration' : 'messages';
  const sortedMessages = useMemo(() => {
    const msgs = sessionState === 'running' ? messages.slice(messages.length - displayMessagesRealTimeLimit) : messages;
    return sortMessages(msgs, sort);
  }, [messages, sort, sessionState]);

  return (
    <div className={s.Messages}>
      <Toolbar
        config={config}
        sessionState={sessionState}
        onSessionStateChange={setSessionState}
        messagesLoaded={messagesLoaded}
        messagesLoadedPerSecond={messagesLoadedPerSecond}
        messagesProcessedPerSecond={messagesProcessedPerSecond}
        messagesProcessed={messagesProcessed.current}
        onStopSession={props.onStopSession}
        onToggleConsoleClick={() => props.onSetIsShowConsole(!props.isShowConsole)}
        displayMessagesLimit={displayMessagesLimit}
        onDisplayMessagesLimitChange={setDisplayMessagesLimit}
      />

      {currentView === 'messages' && messages.length === 0 && (
        <div className={s.NoDataToShow}>
          {sessionState === 'initializing' && 'Initializing session.'}
          {sessionState === 'running' && 'Awaiting for new messages...'}
          {sessionState === 'paused' && 'No messages where loaded.'}
        </div>
      )}
      {currentView === 'messages' && messages.length > 0 && (
        <div
          className={cts.Table}
          style={{ position: 'relative' }}
          ref={tableRef}
          onWheel={onWheel}
        >
          {sessionState === 'pausing' && (
            <div className={s.TableSpinner}>
              <div className={s.TableSpinnerContent}>Pausing session...</div>
            </div>
          )}
          <TableVirtuoso
            className={s.Virtuoso}
            ref={virtuosoRef}
            data={sortedMessages}
            totalCount={sortedMessages.length}
            itemContent={itemContent}
            followOutput={sessionState === 'running'}
            fixedHeaderContent={() => (
              <tr>
                <Th
                  title="#"
                  sortKey="index"
                  style={{ position: 'sticky', left: 0, zIndex: 10 }}
                  help={(
                    <>
                      <p>
                        When consuming from multiple topics or a single partitioned topic, the order of messages cannot be assured.
                      </p>
                      <p>
                        The order of numbers in in this column represents the order in which messages were received by the consumer.
                      </p>
                    </>
                  )}
                />
                <Th title="Publish time" sortKey="publishTime" style={{ position: 'sticky', left: remToPx(60), zIndex: 10 }} help={help.publishTime} />
                <Th title="Key" sortKey="key" help={help.key} />
                <Th title="Value" sortKey="value" help={help.value} />
                <Th title="Target" sortKey="sessionTargetIndex" help={help.sessionTargetIndex} />
                <Th title="Topic" sortKey="topic" help={help.topic} />
                <Th title="Producer" sortKey="producerName" help={help.producerName} />
                <Th title="Schema version" sortKey="schemaVersion" help={help.schemaVersion} />
                <Th title="Size" sortKey="size" help={help.size} />
                <Th title="Properties" sortKey="properties" help={help.propertiesMap} />
                <Th title="Event time" sortKey="eventTime" help={help.eventTime} />
                <Th title="Broker pub. time" sortKey="brokerPublishTime" help={help.brokerPublishTime} />
                <Th title="Message Id" help={help.messageId} />
                <Th title="Sequence Id" sortKey="sequenceId" help={help.sequenceId} />
                <Th title="Ordering key" help={help.orderingKey} />
                <Th title="Redelivery count" sortKey="redeliveryCount" help={help.redeliveryCount} />
                <Th title="Session Context State" sortKey="sessionContextStateJson" help={help.sessionContextStateJson} />
              </tr>
            )}
          />
        </div>
      )}

      {currentView === 'configuration' && (
        <div className={s.SessionConfiguration}>
          <SessionConfiguration
            value={props.configValOrRef}
            onChange={props.onConfigValOrRefChange}
            libraryContext={props.libraryContext}
          />
        </div>
      )}

      <Console
        isShow={props.isShowConsole}
        onClose={() => props.onSetIsShowConsole(false)}
        sessionKey={props.sessionKey}
        sessionState={sessionState}
        onSessionStateChange={setSessionState}
        sessionConfig={config}
        sessionSubscriptionName={subscriptionName.current}
        messages={messages}
        consumerName={consumerName.current}
        currentTopic={currentTopicFqn}
      />
    </div>
  );
}

type SessionControllerProps = {
  initialConfig: ManagedConsumerSessionConfigValOrRef;
  libraryContext: LibraryContext;
};
const SessionController: React.FC<SessionControllerProps> = (props) => {
  const [sessionKey, setSessionKey] = useState<number>(0);
  const [config, setConfig] = useState<ManagedConsumerSessionConfigValOrRef>(props.initialConfig);
  const [isShowConsole, setIsShowConsole] = useState<boolean>(false);

  return (
    <Session
      key={sessionKey}
      sessionKey={sessionKey}
      isShowConsole={isShowConsole}
      onSetIsShowConsole={() => setIsShowConsole(!isShowConsole)}
      {...props}
      onStopSession={() => setSessionKey(n => n + 1)}
      configValOrRef={config}
      onConfigValOrRefChange={setConfig}
      libraryContext={props.libraryContext}
    />
  );
}

export default SessionController;
