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
  SetDeliveryOrderRequest,
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
import { SessionState, MessageDescriptor, ConsumerSessionConfig, MessageDeliveryOrder, ReplayCaughtUpStats } from './types';
import SessionConfiguration from './SessionConfiguration/SessionConfiguration';
import Console from './Console/Console';
import { consumerSessionConfigToPb, messageDeliveryOrderToPb, messageDescriptorFromPb } from './conversions/conversions';
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
import { MessageColumnKey, ReorderableMessageColumnKey, messageColumnDefaultWidths, messageThMeta, reorderableMessageColumns } from './message-columns';
import { useColumnOrder } from '../resizable/useColumnOrder';
import MessageDetails from './Message/MessageDetails/MessageDetails';
import ActionButton from '../ActionButton/ActionButton';
import { handleKeyDown } from './keyboard';
import { useDebounce } from 'use-debounce';
import { ErrorBoundary } from 'react-error-boundary';
import NothingToShow from '../NothingToShow/NothingToShow';
import StartFromProgress, { StartFromSkipProgress } from './StartFromProgress/StartFromProgress';
import StartFromDegradedBanner from './StartFromDegradedBanner';
import ReplayCaughtUpBanner from './ReplayCaughtUpBanner';
import { displayItemLimit } from './SessionConfiguration/display-items';
import { effectiveStartFrom, targetTopicsPersistency } from './SessionConfiguration/StartFromInput/target-topics-persistency';
import { useResizablePane } from '../resizable/useResizablePane';
import PaneResizeHandle from '../resizable/PaneResizeHandle';

const consoleCss = "color: #276ff4; font-weight: var(--font-weight-bold);" as const;

export type ResumeResponseSinks = {
  messagesBuffer: { current: Message[] };
  messagesProcessed: { current: number };
  messagesLoaded: { current: number };
  notifyError: (message: string) => void;
  setStartFromProgress: (progress: StartFromSkipProgress | undefined) => void;
  setStartFromDegradation: (abandonedStreams: string[]) => void;
  setOrderingLateDeliveries: (count: number) => void;
  setOrderingActive: (active: boolean) => void;
  setOrderKeyFallbacks: (count: number) => void;
  setOrderingWaitingStreams: (count: number) => void;
  setReplayCaughtUp: (state: ReplayCaughtUpStats | undefined) => void;
  setReplaySeamViolations: (count: number) => void;
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

  // No size threshold, deliberately. A small skip normally resolves before a frame is even sent -
  // but a STALLED one does not, and the server pushes a frame the moment it starts waiting on a
  // silent stream. Suppressing "small" skips here turned exactly those frames into "Awaiting for
  // new messages..." over a positioning that was stuck.
  return { messagesSkipped: progress.getMessagesSkipped(), messagesToSkip: progress.getMessagesToSkip() };
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

  // The best-effort order's late counter rides the same stats. Monotonic on the server, so the
  // sink can take the value as-is; zero frames (stats absent) simply leave the last value alone.
  const lateDeliveries = res.getConsumerStats()?.getOrderingLateDeliveries() ?? 0;
  if (lateDeliveries > 0) {
    sinks.setOrderingLateDeliveries(lateDeliveries);
  }

  // Whether an ordering layer is ACTUALLY RUNNING - the chip's gate. A single-stream session
  // builds none (one log is already in order, no latency is paid), and the chip must not claim
  // a window that does not exist. Sticky-true once seen: later frames may omit the stats.
  const consumerStats = res.getConsumerStats();
  if (consumerStats?.getDeliveryOrderActive()) {
    sinks.setOrderingActive(true);
  }

  // Unlike the active flag and counters, "waiting" is a claim about NOW, so it mirrors the frame:
  // present means the merge is held, anything else - a data response with no stats at all, stats
  // that stopped carrying the field, an inactive layer - means it is moving again and CLEARS the
  // status. This deliberately sits OUTSIDE the active-guard above: a frame that stops asserting
  // the wait retires it, whatever else the frame says, so the chip cannot stick with a stale
  // count (the chip itself stays gated on the sticky active flag).
  sinks.setOrderingWaitingStreams(consumerStats?.getDeliveryOrderWaitingStreams() ?? 0);

  // The guaranteed replay's caught-up state mirrors the frame exactly as the waiting status does:
  // the server auto-paused the runner at the replay boundary and RE-ASSERTS the state on every
  // response while it holds (including the message-less refinement pushes that update the
  // newer-entries indicator), and the first frame after a Resume extended the boundary stops
  // asserting it - which is what retires the banner. Absent stats mean the same clear: a stale
  // record would pin a "caught up" banner over a session that moved on.
  sinks.setReplayCaughtUp(consumerStats?.getReplayCaughtUp()
    ? {
      boundaryAtMs: consumerStats.getReplayBoundaryAtMs(),
      excludedTopics: consumerStats.getReplayExcludedTopicsList(),
      excludedTopicCount: consumerStats.getReplayExcludedTopicCount(),
    }
    : undefined);

  // Replay ordering violations (a producer clock wrote an earlier timestamp into a pause window,
  // or the source log itself stores an inversion; the replay delivered the message flagged rather
  // than silently). Monotonic from the server, exactly like the late counter: zero frames leave
  // the last value alone.
  const seamViolations = res.getConsumerStats()?.getReplaySeamViolations() ?? 0;
  if (seamViolations > 0) {
    sinks.setReplaySeamViolations(seamViolations);
  }

  // Messages missing the selected timestamp (no broker stamp / no event time) - ordered
  // by publish time instead. Monotonic from the server; the first count triggers the one-shot
  // remediation notice.
  const keyFallbacks = res.getConsumerStats()?.getOrderKeyFallbacks() ?? 0;
  if (keyFallbacks > 0) {
    sinks.setOrderKeyFallbacks(keyFallbacks);
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

// What a frame from a SUPERSEDED stream is still allowed to do. Its messages are real - sent and
// acknowledged server-side, in transit when the resume superseded the stream, existing nowhere but
// on it - so they are appended. NOTHING else on the frame may be applied: its counters and stats
// describe an OLDER moment of the same consumer than what the live stream has already reported.
// Applying them would regress the monotonic loaded/processed counters (the 1 s gauge then renders
// a negative rate) and could re-open panels the live stream has already cleared - the skip
// progress, the ordering wait. Ignoring the whole frame instead would silently drop the messages
// (the exact loss the draining design exists to prevent), and max'ing the counters would keep
// stale values out of the numbers but not out of the panels - and would also mask a genuine
// server-side counter reset. Messages only.
export function handleDrainingResumeResponse(res: ResumeResponse, messagesBuffer: { current: Message[] }): void {
  const newMessages = res.getMessagesList();

  for (let i = 0; i < newMessages.length; i++) {
    if (newMessages[i]?.hasValue()) {
      messagesBuffer.current.push(newMessages[i]);
    }
  }
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

/**
 * The stored configuration with a different delivery order - always as a VALUE.
 *
 * A reference-typed entry names a library item; its `val` is only a browser-local draft, and
 * `managed...ValOrRefToPb` sends nothing but the `ref`. Writing the new order into that draft while
 * the entry still says `reference` would leave the session describing an order the named item does
 * not have AND drop the write on the way to the server - so the entry is converted to a value
 * first, exactly as the configuration screen's reference icon does (SessionConfiguration's
 * `onConvertToValue`). The session then owns its own copy and the library item is left untouched.
 *
 * `undefined` when there is no value to rewrite: an unresolved reference has no configuration to
 * carry the change, and a half-written one would be worse than none.
 */
export function configValOrRefWithDeliveryOrder(
  configValOrRef: ManagedConsumerSessionConfigValOrRef,
  order: MessageDeliveryOrder
): ManagedConsumerSessionConfigValOrRef | undefined {
  const val = configValOrRef.val;

  if (val === undefined) {
    return undefined;
  }

  return { type: 'value', val: { ...val, spec: { ...val.spec, messageDeliveryOrder: order } } };
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
  const toolsPane = useResizablePane('consumer-session-tools', {
    // 340px by owner instruction (2026-08-11; was 400rem). A plain pixel value on purpose - the
    // persisted drag values are pixels too.
    defaultSize: 340,
    minSize: remToPx(100),
    maxSize: remToPx(1600),
    resizeAxis: 'vertical',
    side: 'bottom',
  });
  const messageInspectorPane = useResizablePane('consumer-session-message-inspector', {
    // Preserve the old 600rem default rather than making the panel grow on first render.
    defaultSize: remToPx(600),
    minSize: remToPx(180),
    maxSize: remToPx(2000),
    side: 'right',
  });
  // Draggable column order for the message table, persisted like the widths are. Index and
  // publish time stay pinned in front (they are the sticky pair whose offsets depend on each
  // other); everything else reorders freely, and the ROWS follow the header via `columnOrder`.
  const { order: messageColumnOrder, moveColumn: moveMessageColumn } = useColumnOrder<ReorderableMessageColumnKey>(
    'consumer-session-messages',
    reorderableMessageColumns
  );
  const [dragOverMessageColumn, setDragOverMessageColumn] = useState<ReorderableMessageColumnKey | undefined>(undefined);
  const draggingMessageColumnRef = useRef<ReorderableMessageColumnKey | undefined>(undefined);
  const columnDragProps = (key: ReorderableMessageColumnKey): React.ThHTMLAttributes<HTMLTableCellElement> => ({
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
  // The index column's TOTAL cell width (content + the Td's 12rem-a-side padding): the sticky
  // offset the publish-time pair sits at. Was the constant 60 while the index column was fixed;
  // resizable since 2026-08-11, so the header offset and the body offset (through the
  // --cs-index-cell-total variable read by Message.module.css) both track the live width.
  const indexCellTotal = getColumnWidth('index') + 24;
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
  // Selected-time reversals reported by the delivery-order layer - monotonic from the server,
  // reset only with the session.
  const [orderingLateDeliveries, setOrderingLateDeliveries] = useState(0);
  // Whether the server actually runs an ordering layer for this session (single-stream sessions
  // build none). Sticky per session, reset with it.
  const [orderingActive, setOrderingActive] = useState(false);
  // Set only after the server's stall-warning interval, so healthy head-to-head merging does not
  // flicker a waiting status on every message.
  const [orderingWaitingStreams, setOrderingWaitingStreams] = useState(0);
  // Selected-time fallbacks (message carried no broker stamp / event time). The FIRST one raises a
  // one-shot notification with the remediation (in the effect below, where the config is in
  // scope); the count itself rides on the chip.
  const [orderKeyFallbacks, setOrderKeyFallbacks] = useState(0);
  const orderKeyNoticeShown = useRef(false);
  // The guaranteed replay's caught-up record. Mirrors the frames (see handleResumeResponse), so
  // most frames hand over the value it already has - the ref keeps those from re-rendering the
  // session, like the skip-progress record above.
  const [replayCaughtUp, _setReplayCaughtUp] = useState<ReplayCaughtUpStats | undefined>(undefined);
  const replayCaughtUpRef = useRef<ReplayCaughtUpStats | undefined>(undefined);
  // Cross-seam ordering violations - monotonic from the server, reset only with the session.
  const [replaySeamViolations, setReplaySeamViolations] = useState(0);
  // The delivery-order switch point: the processed count at the moment a live Guaranteed session
  // was switched away (the caught-up banner's "Switch to Best effort and follow live", or the stall
  // escape on the chip). Rows at or below it are the exact replay; rows past it follow live
  // traffic in the bounded reorder window - the first such row carries the divider marker.
  // Session-scoped: survives later pauses and resumes, cleared only with the session.
  const [orderSwitchProcessed, setOrderSwitchProcessed] = useState<number | undefined>(undefined);
  // Streams this session cancelled itself. grpc-web reports a client-side cancel as a stream
  // `error`, and that must not be mistaken for the server dropping the session.
  const selfCancelledStreams = useRef<WeakSet<object>>(new WeakSet());
  // Superseded play streams still draining their last in-flight frames. A resume no longer
  // cancels its predecessor: whatever the server sent on it was acknowledged AT THE SEND, so the
  // frames in transit exist nowhere but on that stream - cancelling it was silent message loss
  // (the old multi-second pause hid the window; an instant pause makes it real). The server
  // completes the predecessor after its last write; these keep listening until that end, and a
  // full session cleanup cancels whatever is still here (a dead session's tail must not append
  // ghost rows into a cleared table).
  const drainingStreams = useRef<Set<ClientReadableStream<ResumeResponse>>>(new Set());
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
  // A return that arrived while the hidden-tab Pause was STILL IN FLIGHT. The two calls take the
  // same per-session lifecycle lock on the server, but not in the order they were sent: a Resume
  // issued now can be granted before the older Pause, which then lands last and leaves the server
  // paused under a session that says Running - and a paused consumer sends nothing that would ever
  // correct it. So the intent is recorded here and applied when the Pause settles.
  const resumeWhenPauseSettles = useRef<boolean>(false);

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

  // The caught-up sink is where the AUTO-PAUSE lands in the browser: the server pauses the runner
  // at the replay boundary and can only say so through a stats frame, so the frame that asserts
  // the state moves the session into the ordinary `paused` state - the same state the pause
  // button reaches, not a parallel one. Directly to `paused`, not through `pausing`: `pausing`
  // exists to await the server's confirmation, and this frame IS the server's confirmation (the
  // runner already holds everything; a Pause RPC would be redundant). Frames that stop asserting
  // the state retire the record - see handleResumeResponse for the mirror contract.
  const setReplayCaughtUp = useCallback((state: ReplayCaughtUpStats | undefined) => {
    if (state !== undefined && sessionStateRef.current === 'running') {
      setSessionState('paused');
    }

    const prev = replayCaughtUpRef.current;
    const isSame = prev === undefined
      ? state === undefined
      : state !== undefined
      && prev.boundaryAtMs === state.boundaryAtMs
      && prev.excludedTopicCount === state.excludedTopicCount
      && prev.excludedTopics.join('\u0000') === state.excludedTopics.join('\u0000');

    if (isSame) {
      return;
    }

    replayCaughtUpRef.current = state;
    _setReplayCaughtUp(state);
  }, []);

  const currentTopic = useMemo(() => props.libraryContext.pulsarResource.type === 'topic' ? props.libraryContext.pulsarResource : undefined, [props.libraryContext]);
  const currentTopicFqn: string | undefined = useMemo(() => currentTopic === undefined ? undefined : `${currentTopic.topicPersistency}://${currentTopic.tenant}/${currentTopic.namespace}/${currentTopic.topic}`, [currentTopic]);

  const config = useMemo<ConsumerSessionConfig | undefined>(() => {
    try {
      const converted = consumerSessionConfigFromValOrRef(props.configValOrRef, currentTopicFqn);
      // A start-from the selected topics cannot honour (every history mode, when nothing selected
      // retains history) runs as the live tail instead - HERE, as a session-local substitution,
      // so the stored configuration keeps exactly what the user wrote (see effectiveStartFrom).
      // The conversion above threw on a config whose own `val` is missing, so it is present here.
      const startFrom = effectiveStartFrom(converted.startFrom, props.configValOrRef.val!.spec.targets, props.libraryContext);
      return startFrom === converted.startFrom ? converted : { ...converted, startFrom };
    } catch (err) {
      console.warn(err);
      return undefined;
    }
    // `currentTopicFqn` is part of the result - a target that follows "the current topic" resolves
    // to it. Leaving it out kept a session pointed at the topic it was FIRST rendered with, which
    // matters most between `persistent://t/n/x` and `non-persistent://t/n/x`: two different topics
    // whose pages differ in nothing else.
  }, [props.configValOrRef, currentTopicFqn, props.libraryContext]);

  // Whether ANY topic this session reads keeps no log - the same classification the start-from
  // selector uses to disable the history-based positions, so the two cannot disagree about which
  // topics retain something.
  const hasNonPersistentTargets = useMemo(
    () => targetTopicsPersistency(props.configValOrRef.val?.spec.targets ?? [], props.libraryContext).hasNonPersistent,
    [props.configValOrRef, props.libraryContext]
  );

  // The selected-time remediation notice, once per session: the first fallback means the configured
  // timestamp is absent on real traffic. For broker time that is a BROKER capability gap, and the
  // notice names the exact settings an administrator would need - Dekaf itself keeps working.
  useEffect(() => {
    if (orderKeyFallbacks > 0 && !orderKeyNoticeShown.current) {
      orderKeyNoticeShown.current = true;
      if (config?.deliveryOrderKey === 'broker-publish-time') {
        notifyError(
          'Some messages have no broker publish time, so publish time was used instead. ' +
          'Enable and expose broker timestamp entry metadata to avoid fallbacks.'
        );
      } else if (config?.deliveryOrderKey === 'event-time') {
        notifyError('Some messages carry no event time, so they were ordered by publish time instead.');
      }
    }
  }, [orderKeyFallbacks, config, notifyError]);

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
    // A FIXED cadence, deliberately not gated on the per-second gauge: `paused` now lands on the
    // server's confirmation while the last in-flight frames are still arriving, and a gauge-gated
    // ticker (the gauge lags a full second) could strand that tail in the buffer, unrendered - a
    // sent-and-acknowledged message that exists nowhere but here. An empty buffer returns above.
  }, 250);

  const streamDataHandler = useCallback((res: ResumeResponse) => {
    handleResumeResponse(res, {
      messagesBuffer,
      messagesProcessed,
      messagesLoaded,
      notifyError,
      setStartFromProgress,
      setStartFromDegradation,
      setOrderingLateDeliveries,
      setOrderingActive,
      setOrderKeyFallbacks,
      setOrderingWaitingStreams,
      setReplayCaughtUp,
      setReplaySeamViolations
    });

    // The auto-pause: the same 'pausing' the toolbar button sends, triggered by the loaded
    // counter crossing its armed threshold. Disarm FIRST - chunks keep arriving while the pause
    // RPC is in flight, and this handler runs for every one of them.
    if (messagesLoaded.current >= nextPauseAtLoaded.current && sessionStateRef.current === 'running') {
      nextPauseAtLoaded.current = Infinity;
      setSessionState('pausing');
    }
  }, []);

  // Installed in place of `streamDataHandler` the moment a stream is superseded (see the effect
  // below): the tail frames still deliver their messages, and nothing else.
  const drainingDataHandler = useCallback((res: ResumeResponse) => {
    handleDrainingResumeResponse(res, messagesBuffer);
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
      stream.removeListener('error', errorHandler);
      stream.removeListener('end', endHandler);
      // The stream is now a superseded predecessor whose last sent-and-acknowledged frames may
      // still be in transit, and they exist nowhere else - so a DATA listener stays attached
      // until the server's completion ends it. But not the full one: from here on this stream's
      // frames may only deliver their messages (see handleDrainingResumeResponse) - their
      // counters and stats describe an older moment than what the live stream reports, and the
      // full handler would regress the counters and re-open cleared panels with them.
      stream.removeListener('data', streamDataHandler);
      stream.on('data', drainingDataHandler);
      drainingStreams.current.add(stream);
      const forget = () => {
        drainingStreams.current.delete(stream);
        stream.removeListener('data', drainingDataHandler);
      };
      stream.on('end', forget);
      stream.on('error', forget);
    };
  }, [stream]);

  const deleteConsumer = useCallback(async (name: string) => {
    const deleteConsumerReq = new DeleteConsumerRequest();
    deleteConsumerReq.setConsumerName(name);
    await consumerServiceClient.deleteConsumer(deleteConsumerReq, { deadline: createDeadline(10) })
      .catch((err) => notifyError(`Unable to delete consumer ${name}. ${err}`));
  }, []);

  // Switches the LIVE session's delivery order without recreating it - recreating would re-read
  // from the start position and throw away everything already held. Reached from the two places
  // a Guaranteed session offers the way out: the caught-up banner's "Continue live with Best
  // effort", and the stall chip's escape for the time-seek corner (a stream a seek positioned
  // past its end).
  //
  // Three things, in this order and only in this order:
  //   1. the LIVE session is switched, which is what releases the held set (in merge order, once,
  //      with the counted start-from budget, ack identity and flow control preserved);
  //   2. the stored configuration is updated, so the next Play asks for what the session is now
  //      actually doing - see configValOrRefWithDeliveryOrder for the reference case;
  //   3. the disclosed wait is retired locally.
  // A server that refused the change earns none of the other two.
  //
  // The outcome is RETURNED, like pauseConsumer's: the caught-up banner resumes the session on a
  // granted switch, and it may only do that when the server really switched.
  const applyDeliveryOrder = async (order: MessageDeliveryOrder): Promise<'applied' | 'failed'> => {
    const req = new SetDeliveryOrderRequest();
    req.setConsumerName(consumerName.current);
    req.setMessageDeliveryOrder(messageDeliveryOrderToPb(order));

    const res = await consumerServiceClient.setDeliveryOrder(req, { deadline: createDeadline(10) })
      .catch((err) => {
        notifyError(`Unable to change the delivery order. ${(err as { message?: string })?.message ?? err}`);
        return undefined;
      });

    if (res === undefined) {
      return 'failed';
    }

    // A refusal - a direction the server does not perform on a running session, a session it no
    // longer knows - comes back as a RESOLVED response carrying the reason, exactly like Pause. It
    // is the reason the user needs, so it is shown rather than swallowed; the live session did not
    // change, so nothing below may claim it did.
    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to change the delivery order. ${res.getStatus()?.getMessage()}`);
      return 'failed';
    }

    // The SWITCH POINT, recorded before anything resumes: everything delivered so far was the
    // exact replay (or its held merge), everything after follows live traffic in the bounded
    // reorder window - the # column changes meaning here, and the first row past this count
    // carries the divider marker that says so.
    if (config?.messageDeliveryOrder === 'guaranteed' && order !== 'guaranteed') {
      setOrderSwitchProcessed(messagesProcessed.current);
    }

    const nextConfigValOrRef = configValOrRefWithDeliveryOrder(props.configValOrRef, order);
    if (nextConfigValOrRef !== undefined) {
      props.onConfigValOrRefChange(nextConfigValOrRef);
    }

    // The wait is over - the server released the held set - but "waiting" only ever arrives ON a
    // response frame (see handleResumeResponse). If the switch released nothing and the session
    // then stays silent, no frame arrives to retire the status and the chip goes on claiming a
    // wait that ended. Clearing it here cannot go stale in the other direction either: the next
    // real frame states the truth again, whatever it is.
    setOrderingWaitingStreams(0);
    return 'applied';
  };

  // The caught-up banner's "Switch to Best effort and follow live": the granted switch releases the
  // boundary holds server-side and live delivery resumes - so the session follows it back into
  // `running`, which also starts a fresh resume stream through the ordinary path (the superseded
  // one drains, as every resume's predecessor does). A refused switch was already reported and
  // changed nothing, so the session stays paused at its boundary, banner intact.
  const continueLiveWithBestEffort = async () => {
    const outcome = await applyDeliveryOrder('best-effort');
    if (outcome === 'applied') {
      setSessionState('running');
    }
  };


  const cleanup = useCallback(async () => {
    console.info(`%cCleaning up session: ${props.sessionKey}`, consoleCss);

    // Whatever was still being created belongs to a session that no longer exists. The bump is what
    // tells that in-flight create so - see createConsumer below.
    sessionGeneration.current += 1;

    cancelStream(streamRef.current);
    streamRef.current?.removeListener('data', streamDataHandler);
    // Predecessors still draining their tails belong to this same dead session: their frames must
    // not append into the cleared table below. They carry the drain-only listener - the full one
    // was removed when each was superseded.
    drainingStreams.current.forEach((s) => {
      cancelStream(s);
      s.removeListener('data', drainingDataHandler);
    });
    drainingStreams.current.clear();
    setMessages([]);
    // A NEW session gets a clean slate: the degradation record belongs to the session that
    // produced it, not to the page. Clearing it unmounts the banner, which is also what makes the
    // next disclosure start expanded and re-bounded again.
    setStartFromDegradation(undefined);
    // The skip-progress record is as session-scoped as its siblings above: left in place it
    // would resurface the DEAD session's "Skipping n messages..." numbers the moment a new run
    // renders with an empty table.
    setStartFromProgress(undefined);
    setOrderingLateDeliveries(0);
    setOrderingActive(false);
    setOrderingWaitingStreams(0);
    setOrderKeyFallbacks(0);
    orderKeyNoticeShown.current = false;
    // The replay records are as session-scoped as the ordering ones above: a caught-up banner, a
    // seam count or a switch-point divider left behind would describe a session that no longer
    // exists, over a table that starts empty.
    setReplayCaughtUp(undefined);
    setReplaySeamViolations(0);
    setOrderSwitchProcessed(undefined);

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
      // Hidden again before the Pause it already asked for came back: that Pause IS what this
      // wants, so only the recorded return is withdrawn.
      if (sessionState === 'pausing' && resumeWhenPauseSettles.current) {
        resumeWhenPauseSettles.current = false;
        isPausedByHiddenTab.current = true;
        return;
      }

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

      // The Pause is still on the wire. Resuming now would race it (see resumeWhenPauseSettles):
      // record the intent and stay in `pausing`, and the pause handler below applies it as soon as
      // the server has answered.
      if (sessionState === 'pausing') {
        resumeWhenPauseSettles.current = true;
        return;
      }

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

      let isAbandoned = false;

      pauseConsumer({ client: consumerServiceClient, consumerName: consumerName.current, notifyError })
        .then((outcome) => {
          if (isAbandoned) {
            return;
          }

          // The tab came back while this Pause was in flight. The server has now answered, so the
          // recorded return can be carried out without the two operations racing for the session
          // lock - and whichever way the Pause went, the state the user asked for is `running`
          // (a refused pause left the stream live; a granted one is resumed from here).
          if (resumeWhenPauseSettles.current) {
            resumeWhenPauseSettles.current = false;
            setSessionState(sessionStateBeforeWindowBlur);
            return;
          }

          if (outcome === 'paused') {
            // The server's confirmation IS the pause: its intake is closed and everything not yet
            // sent is held for the next resume. The in-flight tail keeps rendering into the paused
            // view (the flush ticker below runs regardless of state), so flipping here loses
            // nothing - it only stops making the user wait for a cosmetic quiet second.
            setSessionState('paused');
            return;
          }

          // The server did not pause: its stream is still live and messages can still arrive, so
          // the honest state is the one it is actually in.
          setSessionState('running');
        });

      return () => {
        isAbandoned = true;
        // Whatever leaves `pausing` - the answer above, a Play, a Stop - decides the state itself,
        // so a recorded return must not outlive this pause and fire on the next one.
        resumeWhenPauseSettles.current = false;
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

      // Whatever skip progress is on record belongs to the PREVIOUS stream (a pause mid-skip
      // leaves the last frame's numbers behind). The stream created below reports its own
      // start-from work from its first frame; until then there is nothing to report - and if the
      // skip already resolved and the topic is idle, no frame ever arrives to clear a stale
      // "Skipping n messages..." panel over a session that is simply waiting.
      setStartFromProgress(undefined);

      // The caught-up record belongs to the boundary pause that just ended: the Resume being
      // issued below extends the boundary. The banner is gated on `paused` anyway, but the record
      // itself must not linger - an idle topic sends no frame to retire it, and a later MANUAL
      // pause would then resurface a "caught up" banner the server never asserted for it.
      setReplayCaughtUp(undefined);

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
      // The predecessor stream is NOT cancelled: with pause landing on the server's confirmation,
      // a prompt resume arrives while the pause's last frames - sent and acknowledged server-side -
      // are still in transit on it. A cancel here dropped them, silently and permanently. Instead
      // the effect cleanup keeps it draining; the server completes it after its final write (one
      // resume generation at a time), and that end is what retires it.
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

  const isShowTooltips = sessionState !== 'running' && sessionState !== 'pausing';

  const valueProjectionThs = useMemo(() => {
    return config ? getValueProjectionThs({
      sessionConfig: config,
      sort,
      setSort
    }) : [];
  }, [config, sort, setSort]);

  // The row that carries the switch-point divider: the FIRST message delivered after the
  // delivery-order switch - the smallest processed count past the watermark among the retained
  // rows. Attached to the MESSAGE rather than to a table offset, so it renders wherever that row
  // renders: it survives scrolling (the table is virtualized), retention trimming and re-sorting,
  // and there is exactly one of it because processed counts are unique.
  const orderSwitchMarkerProcessed = useMemo(() => {
    if (orderSwitchProcessed === undefined) {
      return undefined;
    }

    let first: number | undefined = undefined;
    messages.forEach((message) => {
      if (message.numMessageProcessed !== null && message.numMessageProcessed > orderSwitchProcessed
        && (first === undefined || message.numMessageProcessed < first)) {
        first = message.numMessageProcessed;
      }
    });
    return first;
  }, [messages, orderSwitchProcessed]);

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
        isOrderSwitchBoundary={
          message.numMessageProcessed !== null && message.numMessageProcessed === orderSwitchMarkerProcessed
        }
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
  }, [sessionState, config, selectedMessages, getColumnWidth, orderSwitchMarkerProcessed]);

  const onWheel = useCallback<React.WheelEventHandler<HTMLDivElement>>((e) => {
    if (e.deltaY < 0 && sessionState === 'running') {
      setSessionState('pausing');
    }
  }, [sessionState]);

  const currentView: View = sessionState === 'new' ? 'configuration' : 'messages';

  // THE CAUGHT-UP PANEL IS RENDERED BY THE SESSION ITSELF, docked bottom-right - not an inline
  // strip above the table (the state is worth acting on, not worth a permanent band of chrome),
  // and NOT a notification. It lived in a persistent toast for a day (2026-08-11) and every
  // boundary hand-off was a race against react-toastify's lifecycle: a toast created under a
  // still-exiting id is silently DROPPED ("Load new messages" -> dismiss -> re-announce produced
  // exactly that, and the panel never returned - e2e CS-DM-R2), and per-episode fresh ids traded
  // that for the retiring panel and its successor COEXISTING while the exit animation played -
  // an instant catch-up re-announces within milliseconds of the dismissal, faster than any exit
  // (two panels on screen; e2e CS-DM-R3B). Removal mediated by an animation cannot be made
  // synchronous, so the panel left the toast layer instead: rendered conditionally below, at
  // most one can exist, a close is plain state, and unmounting takes it along.
  //
  // The close is scoped to the EPISODE: a new caught-up record re-opens the panel (the sink
  // collapses equal records, so the identity only changes when the boundary or its excluded
  // set does - new information, worth re-showing), and every resume clears the record, so the
  // next boundary starts open again.
  const [caughtUpPanelClosed, setCaughtUpPanelClosed] = useState(false);
  useEffect(() => {
    setCaughtUpPanelClosed(false);
  }, [replayCaughtUp]);
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
      style={{
        // Keep the message/configuration row reachable when a height saved on a large display is
        // restored in a shorter window. The stored pixel value remains the user's preference.
        gridTemplateRows: props.isShowConsole
          ? `min-content minmax(0, 1fr) min(${toolsPane.size}px, 85%)`
          : 'min-content minmax(0, 1fr) 0'
      }}
    >
      {/* ONE grid child for the toolbar and whatever is disclosed under it: the grid declares
          exactly three rows (top, content, console), and a banner as its own direct child used to
          shift the content into the console's zero-height row while the console spilled into an
          implicit fourth. */}
      <div className={s.Top}>
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
          orderingLateDeliveries={orderingLateDeliveries}
          orderingActive={orderingActive}
          orderKeyFallbacks={orderKeyFallbacks}
          orderingWaitingStreams={orderingWaitingStreams}
          replaySeamViolations={replaySeamViolations}
          onDeliveryOrderChange={applyDeliveryOrder}
        />

        {currentView === 'messages' && startFromDegradation !== undefined && (
          <StartFromDegradedBanner abandonedStreams={startFromDegradation} />
        )}

        {/* What this pause COSTS, stated while it is in effect. A paused session hands its
            prefetched messages back for redelivery and picks them up on resume - which recovers
            them only where the broker still has them. A non-persistent topic keeps no log, so the
            pause is a gap in what the user sees and no resume can close it. Scoped to the paused
            state on purpose: a session that is running misses nothing, and a caveat shown always
            is a caveat nobody reads. */}
        {(sessionState === 'paused' || sessionState === 'pausing') && hasNonPersistentTargets && (
          <div className={s.NonPersistentPauseNote} data-testid="cs-paused-non-persistent-note" role="status">
            The non-persistent topics in this session keep no history. Messages published to them while the session
            is paused are missed, and resuming does not recover them.
          </div>
        )}
      </div>
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
        <div
          className={`${s.Content} ${messageDetails ? s.ContentWithMessageDetails : ''}`}
          style={messageDetails ? ({
            '--message-details-width': `${messageInspectorPane.size}px`,
          } as React.CSSProperties) : undefined}
        >
          <div
            className={`${cts.Table} ${s.Table}`}
            data-testid="cs-table"
            data-cs-sort={typeof sort.key === 'string' ? `${sort.key}:${sort.direction}` : `projection:${sort.direction}`}
            style={{ position: 'relative', ['--cs-index-cell-total' as string]: `${indexCellTotal}rem` } as React.CSSProperties}
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
                    {...resizeProps('index')}
                    help={(
                      <>
                        <p>
                          Messages are numbered in the order this session delivers them.
                        </p>
                        <p>
                          Pulsar preserves order within a topic or partition, but not across them. Guaranteed
                          and Best effort merge by the selected time; Fastest shows each stream independently.
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
                    style={{ position: 'sticky', left: remToPx(indexCellTotal), zIndex: 10 }}
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
              <PaneResizeHandle
                mode="edge"
                edgeSide="start"
                testId="cs-message-details-resize-handle"
                title="Drag to resize message inspector"
                onResizeStart={messageInspectorPane.startResize}
                pane={messageInspectorPane}
              />
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
        onResizeStart={toolsPane.startResize}
        resizePane={toolsPane}
      />

      {/* Docked, fixed-position, out of the grid's layout entirely. Rendering it HERE is the
          correctness: one conditional element cannot become two panels, whatever the timing of
          boundary hand-offs (see the caughtUpPanelClosed comment above for the toast history). */}
      {currentView === 'messages' && sessionState === 'paused' && replayCaughtUp !== undefined && !caughtUpPanelClosed && (
        <div className={s.ReplayCaughtUpDock}>
          <ReplayCaughtUpBanner
            caughtUp={replayCaughtUp}
            onResume={() => setSessionState('running')}
            onContinueWithBestEffort={continueLiveWithBestEffort}
            onClose={() => setCaughtUpPanelClosed(true)}
          />
        </div>
      )}
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
  // This is a browser preference, not part of a saved consumer-session configuration. Read the
  // durable value as unknown so corrupted/legacy storage cannot make the panel disappear forever.
  // VISIBLE by default (owner decision 2026-08-11, reversing the closed-by-default from earlier
  // the same day). A stored preference still wins - this is only what a browser that has never
  // expressed one gets.
  const [storedIsShowConsole, setStoredIsShowConsole] = useLocalStorage<unknown>(localStorageKeys.consumerSessionToolsOpen, {
    defaultValue: true
  });
  const isShowConsole = typeof storedIsShowConsole === 'boolean' ? storedIsShowConsole : true;

  useEffect(() => {
    if (typeof storedIsShowConsole !== 'boolean') {
      setStoredIsShowConsole(true);
    }
  }, [storedIsShowConsole, setStoredIsShowConsole]);

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
        onSetIsShowConsole={setStoredIsShowConsole}
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
