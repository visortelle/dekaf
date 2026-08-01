import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './ConsumerSession.module.css'
import * as AppContext from '../../app/contexts/AppContext';
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import {
  Message,
  CreateConsumerRequest,
  ResumeRequest,
  ResumeResponse,
  DeleteConsumerRequest,
  PauseRequest,
  PauseResponse,
} from '../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import cts from "../../ui/ChildrenTable/ChildrenTable.module.css";
import MessageComponent from './Message/Message';
import { nanoid } from 'nanoid';
import * as Notifications from '../../app/contexts/Notifications';
import { ItemContent, TableVirtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ClientReadableStream, Metadata } from 'grpc-web';
import { createDeadline } from '../../../proto-utils/proto-utils';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import { useInterval } from '../../app/hooks/use-interval';
import { usePrevious } from '../../app/hooks/use-previous';
import Toolbar from './Toolbar/Toolbar';
import { SessionState, MessageDescriptor, ConsumerSessionConfig } from './types';
import SessionConfiguration from './SessionConfiguration/SessionConfiguration';
import Console from './Console/Console';
import { consumerSessionConfigToPb, messageDescriptorFromPb } from './conversions/conversions';
import { Sort, sortMessages } from './sort';
import { remToPx } from '../rem-to-px';
import { help } from './Message/fields';
import { ManagedConsumerSessionConfigValOrRef } from '../LibraryBrowser/model/user-managed-items';
import { consumerSessionConfigFromValOrRef } from '../LibraryBrowser/model/resolved-items-conversions';
import { LibraryContext } from '../LibraryBrowser/model/library-context';
import { getColoring } from './coloring';
import { getValueProjectionThs } from './value-projections/value-projections-utils';
import { Th } from './Th';
import { useColumnWidths } from '../resizable/useColumnWidths';
import useLocalStorage from 'use-local-storage-state';
import { localStorageKeys } from '../../local-storage-keys';
import { MessageColumnKey, messageColumnDefaultWidths, messageThMeta, reorderableMessageColumns } from './message-columns';
import { useColumnOrder } from '../resizable/useColumnOrder';
import MessageDetails from './Message/MessageDetails/MessageDetails';
import ActionButton from '../ActionButton/ActionButton';
import { handleKeyDown } from './keyboard';
import { useDebounce } from 'use-debounce';
import { ErrorBoundary } from 'react-error-boundary';
import NothingToShow from '../NothingToShow/NothingToShow';
import StartFromProgress, { StartFromSkipProgress, startFromProgressDisplayThreshold } from './StartFromProgress/StartFromProgress';
import { displayItemLimit } from './SessionConfiguration/display-items';

const consoleCss = "color: #276ff4; font-weight: var(--font-weight-bold);" as const;

export type ResumeResponseSinks = {
  messagesBuffer: { current: Message[] };
  messagesProcessed: { current: number };
  messagesLoaded: { current: number };
  notifyError: (message: string) => void;
  setStartFromProgress: (progress: StartFromSkipProgress | undefined) => void;
  setStartFromDegradation: (abandonedStreams: string[]) => void;
};

// `consumer_stats` is absent on an ordinary data response, and `start_from_progress` inside it is
// absent unless the start-from is still being resolved - so EVERY field here is optional and the
// answer for "nothing to report" is `undefined`, which clears whatever is on screen. Returning a
// stale value on an absent field would pin a "skipping..." panel up forever.
function readStartFromProgress(res: ResumeResponse): StartFromSkipProgress | undefined {
  const progress = res.getConsumerStats()?.getStartFromProgress();

  if (progress === undefined || progress.getComplete()) {
    return undefined;
  }

  const messagesToSkip = progress.getMessagesToSkip();
  if (messagesToSkip <= startFromProgressDisplayThreshold) {
    return undefined;
  }

  return { messagesSkipped: progress.getMessagesSkipped(), messagesToSkip };
}

// The server reports a missing session or a failed resume with a status-only, MESSAGE-LESS
// ResumeResponse (see ConsumerServiceImpl.resume). The status is therefore handled first, and the
// trailing message's counters are read only when the response actually carries a message -
// otherwise the handler threw a TypeError, which killed the stream and swallowed the server error.
export function handleResumeResponse(res: ResumeResponse, sinks: ResumeResponseSinks): void {
  if (res.getStatus()?.getCode() !== Code.OK) {
    sinks.notifyError(`${res.getStatus()?.getMessage()}`);
  }

  // Before any early return below: while a skip is being resolved these responses carry progress and
  // NOTHING else, and once it finishes they stop carrying progress at all.
  sinks.setStartFromProgress(readStartFromProgress(res));

  // The DEGRADATION record is separate from the progress panel on purpose: it has no size
  // threshold (a degraded small skip is still degraded) and it is STICKY - the sink keeps it for
  // the session's life, because a best-effort answer does not become exact when the frame that
  // reported it scrolls away.
  const degraded = res.getConsumerStats()?.getStartFromProgress();
  if (degraded?.getDegraded()) {
    sinks.setStartFromDegradation(degraded.getAbandonedStreamsList());
  }

  const newMessages = res.getMessagesList();

  for (let i = 0; i < newMessages.length; i++) {
    if (newMessages[i]?.hasValue()) {
      sinks.messagesBuffer.current.push(newMessages[i]);
    }
  }

  const lastMessage = newMessages[newMessages.length - 1];
  if (lastMessage === undefined) {
    return;
  }

  sinks.messagesProcessed.current = lastMessage.getNumMessageProcessed()
  sinks.messagesLoaded.current = lastMessage.getNumMessageSent()
}

export type PauseCapableClient = {
  pause: (request: PauseRequest, metadata: Metadata | null) => Promise<PauseResponse>;
};

/** Whether the SERVER confirmed the pause - not whether the UI stopped seeing messages. */
export type PauseOutcome = 'paused' | 'failed';

// A pause that the server refuses (e.g. FAILED_PRECONDITION for a session it doesn't know) comes
// back as a RESOLVED response carrying a non-OK status, not as a rejected call - so the response
// status has to be inspected, or the failure passes unnoticed while the session claims to pause.
//
// The outcome is RETURNED rather than only reported: the session's `paused` state is a claim about
// the server, and a refused pause leaves the server stream running, so the caller has to be able to
// tell the two apart.
export async function pauseConsumer(args: {
  client: PauseCapableClient;
  consumerName: string;
  notifyError: (message: string) => void;
}): Promise<PauseOutcome> {
  const pauseReq = new PauseRequest();
  pauseReq.setConsumerName(args.consumerName);
  const res = await args.client.pause(pauseReq, { deadline: createDeadline(10) })
    .catch((err) => {
      args.notifyError(`Unable to pause consumer ${args.consumerName}. ${err}`);
      return undefined;
    });

  if (res === undefined) {
    return 'failed';
  }

  if (res.getStatus()?.getCode() !== Code.OK) {
    args.notifyError(`Unable to pause consumer ${args.consumerName}. ${res.getStatus()?.getMessage()}`);
    return 'failed';
  }

  return 'paused';
}

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
  const { notifyError, notifyInfo } = Notifications.useContext();
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
  const messagesLoaded = useRef<number>(0);
  const messagesProcessed = useRef<number>(0);
  const [messagesLoadedPerSecond, setMessagesLoadedPerSecond] = useState<MessagesPerSecond>({ prev: 0, now: 0 });
  const [messagesProcessedPerSecond, setMessagesProcessedPerSecond] = useState<MessagesPerSecond>({ prev: 0, now: 0 });
  const messagesBuffer = useRef<Message[]>([]);
  const [messages, setMessages] = useState<MessageDescriptor[]>([]);
  const [selectedMessages, setSelectedMessages] = useState<number[]>([]);
  const [sort, setSort] = useState<Sort>({ key: 'publishTime', direction: 'asc' });
  const { getWidth: getColumnWidth, startResize: startColumnResize, suppressSortClickRef } =
    useColumnWidths<MessageColumnKey>('consumer-session-messages', messageColumnDefaultWidths);
  // Draggable column order for the message table, persisted like the widths are. Index and
  // publish time stay pinned in front (they are the sticky pair whose offsets depend on each
  // other); everything else reorders freely, and the ROWS follow the header via `columnOrder`.
  const { order: messageColumnOrder, moveBefore: moveMessageColumn } = useColumnOrder<MessageColumnKey>(
    'consumer-session-messages',
    reorderableMessageColumns
  );
  const [dragOverMessageColumn, setDragOverMessageColumn] = useState<MessageColumnKey | undefined>(undefined);
  const draggingMessageColumnRef = useRef<MessageColumnKey | undefined>(undefined);
  const columnDragProps = (key: MessageColumnKey): React.ThHTMLAttributes<HTMLTableCellElement> => ({
    draggable: true,
    onDragStart: (e) => {
      if (suppressSortClickRef.current) {
        e.preventDefault();
        return;
      }
      draggingMessageColumnRef.current = key;
      e.dataTransfer.setData('text/plain', key);
      e.dataTransfer.effectAllowed = 'move';
    },
    onDragEnd: () => {
      draggingMessageColumnRef.current = undefined;
      setDragOverMessageColumn(undefined);
    },
    onDragOver: (e) => {
      if (draggingMessageColumnRef.current === undefined) {
        return;
      }
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverMessageColumn(current => (current === key ? current : key));
    },
    onDragLeave: () => setDragOverMessageColumn(current => (current === key ? undefined : current)),
    onDrop: (e) => {
      e.preventDefault();
      const dragged = draggingMessageColumnRef.current;
      draggingMessageColumnRef.current = undefined;
      setDragOverMessageColumn(undefined);
      if (dragged !== undefined && dragged !== key) {
        moveMessageColumn(dragged, key);
      }
    },
  });

  const resizeProps = (key: MessageColumnKey) => ({
    width: getColumnWidth(key),
    onResizeStart: (x: number) => startColumnResize(key, x),
    suppressSortClickRef,
  });
  const [_searchInResults, setSearchInResults] = useState<string>('');
  const [searchInResults] = useDebounce(_searchInResults, 1000);
  const [startFromProgress, _setStartFromProgress] = useState<StartFromSkipProgress | undefined>(undefined);
  const startFromProgressRef = useRef<StartFromSkipProgress | undefined>(undefined);
  // The streams the start-from resolution gave up waiting for. STICKY for the session: set once
  // degraded, cleared only when a new session is created (Play after Stop). The setter tolerates
  // the same record arriving on every progress frame without re-rendering.
  const [startFromDegradation, _setStartFromDegradation] = useState<string[] | undefined>(undefined);
  const setStartFromDegradation = useCallback((abandonedStreams: string[] | undefined) => {
    _setStartFromDegradation(prev =>
      prev !== undefined && abandonedStreams !== undefined && prev.join('\u0000') === abandonedStreams.join('\u0000')
        ? prev
        : abandonedStreams
    );
  }, []);
  // Whether the SERVER confirmed the pause currently being attempted. A ref because the transition
  // below has to read it in the same commit that armed it, and a bump counter so that a
  // confirmation arriving later still re-runs that transition.
  const isPauseConfirmed = useRef<boolean>(false);
  const [pauseConfirmations, setPauseConfirmations] = useState<number>(0);
  // Streams this session cancelled itself. grpc-web reports a client-side cancel as a stream
  // `error`, and that must not be mistaken for the server dropping the session.
  const selfCancelledStreams = useRef<WeakSet<object>>(new WeakSet());
  // Bumped by every cleanup. A create that was in flight across one of those built a consumer for a
  // session that no longer exists, and the consumer's name is generated HERE - nothing else can
  // ever name it again, so nothing else could ever delete it.
  const sessionGeneration = useRef<number>(0);
  // Whether THIS generation's Create ever succeeded. A failed create installs nothing server-side
  // (the build releases everything and stores nothing), so cleanup must not send a Delete for it:
  // fire-and-forget, that Delete could arrive after a retry's successful Create - same name - and
  // remove the healthy replacement.
  const createSucceeded = useRef<boolean>(false);
  // Whether the pause currently in effect is one the HIDDEN TAB asked for - the only kind a
  // returning tab may undo.
  const isPausedByHiddenTab = useRef<boolean>(false);

  // The browser-wide delivery controls (see local-storage-keys.ts for why they are NOT session
  // config). Mirrored into refs because both are read inside stable callbacks - the rate when a
  // resume request is built, the pause threshold on every stream chunk.
  const [rateLimitSetting] = useLocalStorage<number>(localStorageKeys.consumerSessionRateLimit, { defaultValue: 0 });
  const [pauseAfterSetting] = useLocalStorage<number>(localStorageKeys.consumerSessionPauseAfterLoaded, { defaultValue: 0 });
  const rateLimitRef = useRef<number>(0);
  const pauseAfterRef = useRef<number>(0);
  const sessionStateRef = useRef<SessionState>('new');
  // The loaded count at which the session pauses itself, or Infinity when disarmed. Armed on every
  // entry into `running` at "loaded + n", so Play behaves as "load the next n"; disarmed the
  // moment it fires so one crossing triggers exactly one pause.
  const nextPauseAtLoaded = useRef<number>(Infinity);

  useEffect(() => { sessionStateRef.current = sessionState; }, [sessionState]);
  useEffect(() => {
    rateLimitRef.current = Number.isFinite(rateLimitSetting) && rateLimitSetting > 0 ? Math.floor(rateLimitSetting) : 0;
  }, [rateLimitSetting]);
  useEffect(() => {
    pauseAfterRef.current = Number.isFinite(pauseAfterSetting) && pauseAfterSetting > 0 ? Math.floor(pauseAfterSetting) : 0;
    // DELIBERATELY NOT re-armed mid-run. The server half of this setting - the delivery budget -
    // is fixed when the Resume request is built, so a mid-run edit can only desync the two: the
    // server still stops at the OLD n while the client waits for the new one (or, after a clear,
    // for infinity), and the session sits in `running` with a silent stream forever. Both halves
    // change together on the next Play, which is what the tooltip promises.
  }, [pauseAfterSetting]);

  const cancelStream = useCallback((s: ClientReadableStream<ResumeResponse> | undefined) => {
    if (s === undefined) {
      return;
    }

    selfCancelledStreams.current.add(s);
    s.cancel();
  }, []);

  // The stream calls this on every response, most of which report nothing - re-rendering the whole
  // session for an unchanged value (usually `undefined`) would be pure waste.
  const setStartFromProgress = useCallback((progress: StartFromSkipProgress | undefined) => {
    const prev = startFromProgressRef.current;
    const isSame = prev === undefined
      ? progress === undefined
      : progress !== undefined && prev.messagesSkipped === progress.messagesSkipped && prev.messagesToSkip === progress.messagesToSkip;

    if (isSame) {
      return;
    }

    startFromProgressRef.current = progress;
    _setStartFromProgress(progress);
  }, []);

  const currentTopic = useMemo(() => props.libraryContext.pulsarResource.type === 'topic' ? props.libraryContext.pulsarResource : undefined, [props.libraryContext]);
  const currentTopicFqn: string | undefined = useMemo(() => currentTopic === undefined ? undefined : `${currentTopic.topicPersistency}://${currentTopic.tenant}/${currentTopic.namespace}/${currentTopic.topic}`, [currentTopic]);

  const config = useMemo<ConsumerSessionConfig | undefined>(() => {
    try {
      return consumerSessionConfigFromValOrRef(props.configValOrRef, currentTopicFqn);
    } catch (err) {
      console.warn(err);
      return undefined;
    }
    // `currentTopicFqn` is part of the result - a target that follows "the current topic" resolves
    // to it. Leaving it out kept a session pointed at the topic it was FIRST rendered with, which
    // matters most between `persistent://t/n/x` and `non-persistent://t/n/x`: two different topics
    // whose pages differ in nothing else.
  }, [props.configValOrRef, currentTopicFqn]);

  const scrollToBottom = () => {
    const scrollParent = tableRef.current?.children[0];
    scrollParent?.scrollTo({ top: scrollParent.scrollHeight, behavior: 'auto' });
  }

  useInterval(() => {
    setMessagesLoadedPerSecond(() => ({ prev: messagesLoaded.current, now: messagesLoaded.current - messagesLoadedPerSecond.prev }));
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
        // `slice(-limit)` keeps the whole array for ANY non-positive limit - `slice(-0)` is
        // `slice(0)` - so the one place that decides what a limit means decides it here too.
        // `|| 0` used to be that decision, and it turned "limit the display" into "do not".
        .slice(-displayItemLimit(config?.numDisplayItems));

      newMessages.forEach((message, i) => {
        message.displayIndex = (i + 1);
      });

      messagesBuffer.current = [];
      scrollToBottom();
      return newMessages;
    });
  }, messagesLoadedPerSecond.now > 0 ? 250 : false);

  const streamDataHandler = useCallback((res: ResumeResponse) => {
    handleResumeResponse(res, { messagesBuffer, messagesProcessed, messagesLoaded, notifyError, setStartFromProgress, setStartFromDegradation });

    // The auto-pause: the same 'pausing' the toolbar button sends, triggered by the loaded
    // counter crossing its armed threshold. Disarm FIRST - chunks keep arriving while the pause
    // RPC is in flight, and this handler runs for every one of them.
    if (messagesLoaded.current >= nextPauseAtLoaded.current && sessionStateRef.current === 'running') {
      nextPauseAtLoaded.current = Infinity;
      setSessionState('pausing');
    }
  }, []);

  // A resume stream can stop delivering for reasons that are NOT "no messages yet": the transport
  // drops, the server completes or aborts the call, the session disappears. Without listeners for
  // those the session sits in `running` for ever with frozen counters, waiting for messages that
  // can no longer arrive. `paused` is the recoverable landing state - Play resumes from there.
  useEffect(() => {
    streamRef.current = stream;

    if (stream === undefined) {
      return;
    }

    let isDisposed = false;
    const isOurOwnCancel = () => selfCancelledStreams.current.has(stream);

    const stopStreaming = () => {
      setSessionState((state) => (state === 'running' || state === 'pausing') ? 'paused' : state);
    };

    const errorHandler = (err: unknown) => {
      if (isDisposed || isOurOwnCancel()) {
        return;
      }

      notifyError(`Consumer session stream failed. ${(err as { message?: string })?.message ?? err}`);
      stopStreaming();
    };

    const endHandler = () => {
      if (isDisposed || isOurOwnCancel()) {
        return;
      }

      stopStreaming();
    };

    stream.on('data', streamDataHandler);
    stream.on('error', errorHandler);
    stream.on('end', endHandler);

    return () => {
      isDisposed = true;
      stream.removeListener('data', streamDataHandler);
      stream.removeListener('error', errorHandler);
      stream.removeListener('end', endHandler);
    };
  }, [stream]);

  const deleteConsumer = useCallback(async (name: string) => {
    const deleteConsumerReq = new DeleteConsumerRequest();
    deleteConsumerReq.setConsumerName(name);
    await consumerServiceClient.deleteConsumer(deleteConsumerReq, { deadline: createDeadline(10) })
      .catch((err) => notifyError(`Unable to delete consumer ${name}. ${err}`));
  }, []);

  const cleanup = useCallback(async () => {
    console.info(`%cCleaning up session: ${props.sessionKey}`, consoleCss);

    // Whatever was still being created belongs to a session that no longer exists. The bump is what
    // tells that in-flight create so - see createConsumer below.
    sessionGeneration.current += 1;

    cancelStream(streamRef.current);
    streamRef.current?.removeListener('data', streamDataHandler);
    setMessages([]);
    // A NEW session gets a clean slate: the degradation record belongs to the session that
    // produced it, not to the page.
    setStartFromDegradation(undefined);

    // Only a consumer that was actually INSTALLED gets a cleanup Delete. A failed create stored
    // nothing server-side, and its fire-and-forget Delete could arrive AFTER a retry's successful
    // Create under the same name - deleting the healthy replacement.
    if (createSucceeded.current) {
      deleteConsumer(consumerName.current); // Don't await this
    }
    createSucceeded.current = false;
  }, [prevSessionState, sessionState]);

  useEffect(() => {
    return () => {
      cleanup();
    }
  }, []);

  // A closing tab has to delete the consumer too, and `window` outlives every session - so the
  // registration must be OWNED by an effect. Registering it from the initialize path left one stale
  // closure installed per Stop remount, each still holding a dead session's consumer name, and an
  // eventual unload then fired a Delete for every session the tab had ever run.
  //
  // Nothing exists to delete before the first Play, so `new` registers nothing at all.
  useEffect(() => {
    if (sessionState === 'new') {
      return;
    }

    window.addEventListener('beforeunload', cleanup);
    return () => window.removeEventListener('beforeunload', cleanup);
  }, [cleanup, sessionState]);

  const initializeSession = () => {
    async function createConsumer() {
      if (config === undefined) {
        // Play is disabled in this state, so this is a guard rather than a path; still, staying on
        // `initializing` would read as a hang.
        notifyError('This session configuration could not be read. Check the configuration, or start a new session.');
        setSessionState('new');
        return;
      }

      const req = new CreateConsumerRequest();

      req.setConsumerName(consumerName.current);

      // Building the request is where the parts of the configuration that are still TEXT get
      // parsed - a message id, for one - so it can fail on a configuration that converted fine.
      // Unhandled, the rejection killed this function silently and left the session on
      // "initializing" for ever, looking like a hang instead of a configuration error.
      let consumerSessionConfigPb;
      try {
        consumerSessionConfigPb = consumerSessionConfigToPb(config);
      } catch (err) {
        notifyError(`Unable to create consumer ${consumerName.current}. ${(err as Error)?.message ?? err}`);
        setSessionState('new');
        return;
      }

      req.setConsumerSessionConfig(consumerSessionConfigPb);

      // Which session this create belongs to. Everything after the await has to be checked against
      // it: the user can Stop - which remounts the session - while the server is still working.
      const generation = sessionGeneration.current;

      const res = await consumerServiceClient.createConsumer(req, {}).catch(err => notifyError(`Unable to create consumer ${consumerName.current}. ${err}`));

      // A create that did not succeed leaves NOTHING running: no consumer, no stream, nothing that
      // can ever move the session on. Staying on `initializing` therefore claims a round trip is
      // still in progress AND disables Play, so the only way out was Stop - which throws away every
      // message loaded so far. `new` is the honest state, and Play can retry from it.
      if (res === undefined) {
        setSessionState('new');
        return;
      }

      const status = res.getStatus();
      const code = status?.getCode();

      if (code !== Code.OK) {
        const errorMessage = status?.getMessage();
        notifyError(`Unable to create consumer. ${errorMessage}`);
        setSessionState('new');
        return;
      }

      // The consumer now exists on the server, subscribed and consuming - but the session that
      // asked for it is gone, so nothing on screen owns it and nothing knows its name. Delete it
      // rather than leaving it running for the lifetime of the process.
      if (generation !== sessionGeneration.current) {
        deleteConsumer(consumerName.current);
        return;
      }

      createSucceeded.current = true;
      // The tab can have gone HIDDEN while the server was still building the consumer. Resuming
      // into a hidden tab starts a stream nobody is watching and - worse - arms nothing that the
      // hidden-tab machinery would undo, so returning to the tab found it stalled with no
      // recovery. The consumers exist but were never resumed (their gates start closed), so
      // `paused` is the honest state; the visibility handler's ordinary return path then resumes
      // it the moment the tab is visible again.
      if (document.visibilityState === 'hidden') {
        isPausedByHiddenTab.current = true;
        setSessionStateBeforeWindowBlur('running');
        setSessionState('paused');
        return;
      }
      setSessionState('running');
    }

    createConsumer();
  };

  // Stream's connection pauses on window blur and we don't receive new messages.
  // Here we are trying to handle this situation.
  //
  // Only `running` owns a live server stream, and only a live stream can stall. `new` and
  // `initializing` have no consumer on the server at all, and `paused` already stopped one: asking
  // the server to pause any of those asks about a session it does not know, and its refusal is then
  // read as "still running" - which offers Resume for a consumer that never existed. Sessions the
  // USER paused must also stay paused when the tab comes back, so only a pause this handler caused
  // is undone here.
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      if (sessionState !== 'running') {
        return;
      }

      isPausedByHiddenTab.current = true;
      setSessionStateBeforeWindowBlur(sessionState);
      setSessionState('pausing');
      return;
    }

    if (document.visibilityState === 'visible') {
      if (!isPausedByHiddenTab.current) {
        return;
      }

      isPausedByHiddenTab.current = false;
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

      // Armed synchronously, so the transition below cannot read a confirmation left over from an
      // earlier pause in this same commit.
      isPauseConfirmed.current = false;
      let isAbandoned = false;

      pauseConsumer({ client: consumerServiceClient, consumerName: consumerName.current, notifyError })
        .then((outcome) => {
          if (isAbandoned) {
            return;
          }

          if (outcome === 'paused') {
            isPauseConfirmed.current = true;
            setPauseConfirmations(n => n + 1);
            return;
          }

          // The server did not pause: its stream is still live and messages can still arrive, so
          // the honest state is the one it is actually in.
          setSessionState('running');
        });

      return () => {
        isAbandoned = true;
      };
    }

    if (sessionState === 'paused') {
      const selectedMessageIndex = messagesToShow.findIndex(it => it.numMessageProcessed === selectedMessages[0]);
      if (selectedMessageIndex > 0) {
        virtuosoRef.current?.scrollIntoView({ index: selectedMessageIndex, align: 'center' });
        return;
      }

      scrollToBottom();
    }

    if (sessionState === 'running') {
      console.info(`%cRunning session: ${props.sessionKey}`, consoleCss);

      // Arm the auto-pause for this run: "the next n loaded from here". Every entry into
      // `running` re-arms, so resuming a session paused at n loads n more.
      nextPauseAtLoaded.current = pauseAfterRef.current > 0 ? messagesLoaded.current + pauseAfterRef.current : Infinity;

      const resumeReq = new ResumeRequest();
      resumeReq.setConsumerName(consumerName.current);
      // The start-from progress rides along on ConsumerStats; without this the server has no reason
      // to compute or send it.
      resumeReq.setIncludeConsumerStats(true);
      // The browser-wide delivery rate limit rides every resume - see local-storage-keys.ts for
      // why it is per-request rather than session config. 0 = unlimited.
      resumeReq.setMaxMessagesPerSecond(rateLimitRef.current);
      // The server-side half of "pause after n": deliver at most n more on this stream, counted
      // at the send. The client threshold below still drives the state machine, but the SERVER
      // guarantees the count - a chunk that never leaves the server cannot overshoot a screenful.
      resumeReq.setMaxMessagesToDeliver(pauseAfterRef.current);
      cancelStream(stream);
      // NO DEADLINE: resume is a long-lived server stream that lives until the user stops it or the
      // transport drops. Any fixed budget is a wrong guess - a Skip-N over millions of messages can
      // spend longer than that resolving before it delivers its first message, and the deadline
      // would kill the stream mid-skip. The error/end listeners are what notice a stream that ends.
      const newStream = consumerServiceClient.resume(resumeReq, {});
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

  // The local rate reaching zero says the last in-flight messages have landed - it does NOT say the
  // server paused. Both are required: the server's confirmation is what makes `paused` true, the
  // quiet second is what makes it look finished.
  useEffect(() => {
    if (sessionState === 'pausing' && isPauseConfirmed.current && messagesLoadedPerSecond.now === 0) {
      setSessionState('paused');
    }
  }, [sessionState, messagesLoadedPerSecond, pauseConfirmations]);

  const isShowTooltips = sessionState !== 'running' && sessionState !== 'pausing';

  const valueProjectionThs = useMemo(() => {
    return config ? getValueProjectionThs({
      sessionConfig: config,
      sort,
      setSort
    }) : [];
  }, [config, sort, setSort]);

  const itemContent = useCallback<ItemContent<MessageDescriptor, undefined>>((i, message) => {
    if (config === undefined) {
      return;
    }

    const coloring = getColoring(config, message);
    return (
      <MessageComponent
        key={i}
        message={message}
        sessionConfig={config}
        isShowTooltips={isShowTooltips}
        sessionState={sessionState}
        selectedMessages={selectedMessages}
        columnOrder={messageColumnOrder}
        coloring={coloring}
        valueProjectionThs={valueProjectionThs}
        getColumnWidth={getColumnWidth}
        onClick={() => {
          if (sessionState !== 'paused') {
            setSessionState('pausing');
          }

          if (message.numMessageProcessed === null) {
            return;
          }

          setSelectedMessages([message.numMessageProcessed]);
        }}
      />
    );
  }, [sessionState, config, selectedMessages, getColumnWidth]);

  const onWheel = useCallback<React.WheelEventHandler<HTMLDivElement>>((e) => {
    if (e.deltaY < 0 && sessionState === 'running') {
      setSessionState('pausing');
    }
  }, [sessionState]);

  const currentView: View = sessionState === 'new' ? 'configuration' : 'messages';
  const messagesToShow = useMemo(() => {
    let msgs = searchInResults === '' ? messages : messages.filter(msg => {
      return msg.key?.includes(searchInResults) || msg.value?.includes(searchInResults);
    });
    msgs = sessionState === 'running' ? msgs.slice(msgs.length - displayMessagesRealTimeLimit) : msgs;

    return sortMessages(msgs, sort);
  }, [messages, sort, sessionState, searchInResults]);

  const messageDetails = selectedMessages.length === 1 ?
    messages.find(msg => msg.numMessageProcessed === selectedMessages[0]) :
    undefined;

  return (
    <div
      className={s.ConsumerSession}
      data-testid="cs-session"
      data-cs-state={sessionState}
      // How many messages are actually being held, after retention. The count of rendered rows is
      // not this number - the table is virtualized - and nothing else on screen reports it.
      data-cs-retained={messages.length}
      style={{ gridTemplateRows: props.isShowConsole ? 'min-content 1fr 400rem' : 'min-content 1fr 0' }}
    >
      <Toolbar
        config={config}
        sessionState={sessionState}
        messages={messagesToShow}
        onSessionStateChange={setSessionState}
        messagesLoaded={messagesLoaded.current}
        messagesLoadedPerSecond={messagesLoadedPerSecond}
        messagesProcessed={messagesProcessed.current}
        messagesProcessedPerSecond={messagesProcessedPerSecond}
        onStopSession={props.onStopSession}
        onToggleConsoleClick={() => props.onSetIsShowConsole(!props.isShowConsole)}
        searchInResults={_searchInResults}
        onSearchInResultsChange={setSearchInResults}
        numFoundInResults={messagesToShow.length}
      />

      {currentView === 'messages' && startFromDegradation !== undefined && (
        <div
          className={s.StartFromDegraded}
          data-testid="cs-start-from-degraded"
          title={`Streams that stayed silent and were skipped past:\n${startFromDegradation.join('\n')}`}
        >
          Best effort: {startFromDegradation.length} stream{startFromDegradation.length === 1 ? '' : 's'} stayed silent while
          the start position was being resolved and {startFromDegradation.length === 1 ? 'was' : 'were'} skipped past. The
          skip COUNT is exact; exactly which messages were dropped may differ.
        </div>
      )}
      {currentView === 'messages' && messages.length === 0 && (
        <div className={s.NoDataToShow}>
          {sessionState === 'initializing' && 'Initializing session...'}
          {/* A big skip delivers nothing until it lands, so this is exactly where the session would
              otherwise sit on "Awaiting for new messages..." looking hung. */}
          {sessionState === 'running' && (startFromProgress === undefined
            ? 'Awaiting for new messages...'
            : <StartFromProgress progress={startFromProgress} />)}
          {sessionState === 'paused' && 'No messages where loaded.'}
        </div>
      )}
      {currentView === 'messages' && messages.length > 0 && (
        <div className={s.Content}>
          <div
            className={`${cts.Table} ${s.Table}`}
            data-testid="cs-table"
            data-cs-sort={typeof sort.key === 'string' ? `${sort.key}:${sort.direction}` : `projection:${sort.direction}`}
            style={{ position: 'relative' }}
            ref={tableRef}
            // Focusable: the keyboard navigation below is unreachable for a keyboard user without
            // a tabIndex - onKeyDown only fires on a focused element.
            tabIndex={0}
            onWheel={onWheel}
            onKeyDown={(event) => {
              if (virtuosoRef.current === null) {
                return;
              }

              handleKeyDown({
                event,
                messages: messagesToShow,
                selectedMessages,
                setSelectedMessages,
                virtuoso: virtuosoRef.current
              })
            }}
          >
            {sessionState === 'pausing' && (
              <div className={s.TableSpinner}>
                <div className={s.TableSpinnerContent}>Pausing session...</div>
              </div>
            )}
            <TableVirtuoso
              className={s.Virtuoso}
              ref={virtuosoRef}
              data={messagesToShow}
              totalCount={messagesToShow.length}
              itemContent={itemContent}
              followOutput={sessionState === 'running'}
              fixedHeaderContent={() => (
                <tr>
                  <Th
                    key="index"
                    testId="cs-th-index"
                    title="#"
                    sort={sort}
                    setSort={setSort}
                    sortKey="index"
                    style={{ position: 'sticky', left: 0, zIndex: 10 }}
                    help={(
                      <>
                        <p>
                          Messages are numbered in the order this session received them.
                        </p>
                        <p>
                          Each partition arrives in its own publish order. Messages from different topics
                          or partitions interleave, so there is no single &quot;right&quot; order across them.
                        </p>
                      </>
                    )}
                  />
                  <Th
                    key="publishTime"
                    testId="cs-th-publishTime"
                    title="Publish time"
                    sort={sort}
                    setSort={setSort}
                    sortKey="publishTime"
                    style={{ position: 'sticky', left: remToPx(60), zIndex: 10 }}
                    help={help.publishTime}
                    {...resizeProps('publishTime')}
                  />
                  {messageColumnOrder.flatMap((columnKey) => {
                    const meta = messageThMeta[columnKey];
                    const cells = [(
                      <Th
                        key={columnKey}
                        testId={meta.testId}
                        title={meta.title}
                        sort={sort}
                        setSort={setSort}
                        sortKey={meta.sortKey}
                        help={help[meta.helpKey as keyof typeof help]}
                        isDragOver={dragOverMessageColumn === columnKey}
                        dragProps={columnDragProps(columnKey)}
                        {...resizeProps(columnKey)}
                      />
                    )];
                    // Value-projection columns stay glued after KEY wherever it sits - the same
                    // neighbourhood they have always rendered in.
                    if (columnKey === 'key') {
                      cells.push(...valueProjectionThs.map(vp => vp.th));
                    }
                    return cells;
                  })}
                </tr>
              )}
            />
          </div>

          {messageDetails !== undefined && (
            <div className={s.MessageDetails} data-testid="cs-message-details">
              <div className={s.CloseMessageDetails}>
                <ActionButton
                  testId="cs-message-details-close"
                  onClick={() => setSelectedMessages([])}
                  title="Close Message Details"
                  action={{ type: 'predefined', action: 'close' }}
                  buttonProps={{ appearance: 'borderless-semitransparent' }}
                />
              </div>

              <MessageDetails
                message={messageDetails}
              />
            </div>
          )}
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
        libraryContext={props.libraryContext}
      />
    </div>
  );
}

type ConsumerSessionProps = {
  initialConfig: ManagedConsumerSessionConfigValOrRef;
  libraryContext: LibraryContext;
};
const ConsumerSession: React.FC<ConsumerSessionProps> = (props) => {
  const [sessionKey, setSessionKey] = useState<number>(0);
  const [config, setConfig] = useState<ManagedConsumerSessionConfigValOrRef>(props.initialConfig);
  const [isShowConsole, setIsShowConsole] = useState<boolean>(false);

  return (
    // A saved session can reference any persisted library item, and a stored item can be of a
    // foreign type or incomplete. Without a boundary, such a config throws while rendering and React
    // unmounts the whole app - the route then shows an EMPTY document with no way back. Keep the
    // failure local and visible instead.
    <ErrorBoundary
      resetKeys={[sessionKey, config]}
      fallbackRender={({ error }) => (
        <NothingToShow
          reason="error"
          content={(
            <div data-testid="cs-crashed">
              This consumer session could not be rendered.
              <br />
              {String(error?.message || error)}
              <br />
              Check the session configuration, or start a new session.
            </div>
          )}
        />
      )}
    >
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
    </ErrorBoundary>
  );
}

export default ConsumerSession;
