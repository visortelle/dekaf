/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node"]}
 *
 * BUG-1 regression: a message-less ResumeResponse must surface the server error, not throw.
 * BUG-2 regression: a non-OK PauseResponse must be reported, not silently treated as a pause.
 *
 * Both server paths are real: ConsumerServiceImpl.resume() emits a status-only, message-less
 * ResumeResponse when the session is missing or the resume threw, and ConsumerServiceImpl.pause()
 * answers FAILED_PRECONDITION (a resolved response, never a transport rejection) in the same
 * situations. The responses below are the genuine protobuf messages, not stubs.
 *
 * Note: with a jest.mock() in the file, esbuild-jest runs babel's hoisting pass over untyped JS, so
 * imported bindings must not appear in type annotations here (inference only).
 */
import { Status } from '../../../grpc-web/google/rpc/status_pb';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import { StringValue } from 'google-protobuf/google/protobuf/wrappers_pb';
import {
  ConsumerStats,
  CreateConsumerResponse,
  DeleteConsumerResponse,
  Message,
  MessageDeliveryOrder,
  PauseResponse,
  ResumeResponse,
  SetDeliveryOrderResponse,
  StartFromProgress,
} from '../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';

// nanoid@4 ships ESM only and jest does not transform node_modules, so importing ConsumerSession
// (which uses it purely to name the consumer/subscription) would fail to parse. Nothing under test
// depends on the generated id.
jest.mock('nanoid', () => ({ nanoid: () => 'test-id' }));
// Same story for mermaid (ESM-only, pulled in far away through the library item editor's markdown
// preview). Neither library is exercised by these tests.
jest.mock('mermaid', () => ({ __esModule: true, default: { initialize: () => undefined } }));
// The More-tools panel is a sibling feature with its own suite (Console.test.tsx); rendered here it
// would only drag every tab body (producer, topic positions, ...) into each live-session test.
jest.mock('./Console/Console', () => ({ __esModule: true, default: () => null }));
// The live-session tests below need the session to talk to a scriptable consumer service. Fakes
// are installed per-test on globalThis (see installFakeGrpcClients) rather than via a module
// binding, because jest hoists this factory above every declaration in the file; tests that
// install nothing keep the real (inert) default clients.
jest.mock('../../app/contexts/GrpcClient/GrpcClient', () => {
  const actual = jest.requireActual('../../app/contexts/GrpcClient/GrpcClient');
  return {
    ...actual,
    useContext: () => ({
      ...actual.useContext(),
      ...((globalThis as Record<string, unknown>)['__csTestGrpcClients'] as object | undefined),
    }),
  };
});

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import ConsumerSession, {
  configValOrRefWithDeliveryOrder,
  handleDrainingResumeResponse,
  handleResumeResponse,
  pauseConsumer,
} from './ConsumerSession';
import { getDefaultManagedItem } from '../LibraryBrowser/default-library-items';
import { defaultValue as notifications } from '../../app/contexts/Notifications';

// react-virtuoso (the message table) measures itself with ResizeObserver, which jsdom does not
// provide - same stub as TopicPositions.test.tsx. And the session auto-scrolls its table;
// jsdom implements scrolling on window only, not on elements.
class ResizeObserverStub {
  observe() { }
  unobserve() { }
  disconnect() { }
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver =
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver ?? ResizeObserverStub;
if (Element.prototype.scrollTo === undefined) {
  Element.prototype.scrollTo = (() => undefined) as never;
}

const makeStatus = (code: number, message: string) => {
  const s = new Status();
  s.setCode(code);
  s.setMessage(message);
  return s;
};

const makeMessage = (opts: { value?: string; processed: number; sent: number }) => {
  const m = new Message();
  if (opts.value !== undefined) {
    const v = new StringValue();
    v.setValue(opts.value);
    m.setValue(v);
  }
  m.setNumMessageProcessed(opts.processed);
  m.setNumMessageSent(opts.sent);
  return m;
};

const makeSinks = () => ({
  messagesBuffer: { current: [] as ReturnType<typeof makeMessage>[] },
  messagesProcessed: { current: 7 },
  messagesLoaded: { current: 9 },
  notifyError: jest.fn(),
  setStartFromProgress: jest.fn(),
  setStartFromDegradation: jest.fn(),
  setOrderingLateDeliveries: jest.fn(),
  setOrderingActive: jest.fn(),
  setOrderKeyFallbacks: jest.fn(),
  setOrderingWaitingStreams: jest.fn(),
  setReplayCaughtUp: jest.fn(),
  setReplaySeamViolations: jest.fn(),
});

/** A ResumeResponse carrying the consumer stats the server emits while a big skip is resolving. */
const makeResumeWithProgress = (progress?: { skipped: number; toSkip: number; complete?: boolean }) => {
  const res = new ResumeResponse();
  res.setStatus(makeStatus(Code.OK, ''));
  const stats = new ConsumerStats();
  if (progress !== undefined) {
    const p = new StartFromProgress();
    p.setMessagesSkipped(progress.skipped);
    p.setMessagesToSkip(progress.toSkip);
    p.setComplete(progress.complete ?? false);
    stats.setStartFromProgress(p);
  }
  res.setConsumerStats(stats);
  return res;
};

const lastProgress = (sinks: ReturnType<typeof makeSinks>) => {
  const calls = sinks.setStartFromProgress.mock.calls;
  return calls[calls.length - 1][0];
};

describe('BUG-1: message-less ResumeResponse', () => {
  it('surfaces the server error instead of throwing on a status-only response', () => {
    const res = new ResumeResponse();
    res.setStatus(makeStatus(Code.FAILED_PRECONDITION, 'No such consumer consumer session: __dekaf_x'));

    const sinks = makeSinks();
    expect(() => handleResumeResponse(res, sinks)).not.toThrow();

    expect(sinks.notifyError).toHaveBeenCalledTimes(1);
    expect(String(sinks.notifyError.mock.calls[0][0])).toContain('No such consumer consumer session');
    // Nothing arrived, so the counters must keep their previous values.
    expect(sinks.messagesProcessed.current).toBe(7);
    expect(sinks.messagesLoaded.current).toBe(9);
    expect(sinks.messagesBuffer.current).toHaveLength(0);
  });

  it('buffers valued messages and advances the counters on an OK response', () => {
    const res = new ResumeResponse();
    res.setStatus(makeStatus(Code.OK, ''));
    // The runner also emits count-only placeholders (no value) - those advance counters but render
    // no row, so they must not reach the buffer.
    res.setMessagesList([
      makeMessage({ value: '{"a":1}', processed: 41, sent: 40 }),
      makeMessage({ processed: 42, sent: 40 }),
    ]);

    const sinks = makeSinks();
    handleResumeResponse(res, sinks);

    expect(sinks.notifyError).not.toHaveBeenCalled();
    expect(sinks.messagesBuffer.current).toHaveLength(1);
    expect(sinks.messagesProcessed.current).toBe(42);
    expect(sinks.messagesLoaded.current).toBe(40);
  });

  it('reports per-message errors while still processing the messages that came with them', () => {
    const res = new ResumeResponse();
    res.setStatus(makeStatus(Code.UNKNOWN, 'filter failed: boom'));
    res.setMessagesList([makeMessage({ value: '{"a":1}', processed: 5, sent: 5 })]);

    const sinks = makeSinks();
    handleResumeResponse(res, sinks);

    expect(String(sinks.notifyError.mock.calls[0][0])).toContain('filter failed: boom');
    expect(sinks.messagesBuffer.current).toHaveLength(1);
    expect(sinks.messagesProcessed.current).toBe(5);
  });
});

describe('start-from skip progress carried on a ResumeResponse', () => {
  it('surfaces an in-flight skip', () => {
    const sinks = makeSinks();

    handleResumeResponse(makeResumeWithProgress({ skipped: 2_000_000, toSkip: 10_000_000 }), sinks);

    expect(lastProgress(sinks)).toEqual({ messagesSkipped: 2_000_000, messagesToSkip: 10_000_000 });
  });

  it('surfaces a SMALL unresolved skip too - a frame only arrives for one when it is stalled', () => {
    // There used to be a 1,000,000-message display threshold, on the theory that small skips
    // resolve too fast to need a UI. They do - which is exactly why a frame for one means the
    // opposite: the server pushes it when the positioning is STALLED waiting on a silent stream,
    // and suppressing it left "Awaiting for new messages..." over a skip that was stuck.
    const sinks = makeSinks();

    handleResumeResponse(makeResumeWithProgress({ skipped: 10, toSkip: 500 }), sinks);

    expect(lastProgress(sinks)).toEqual({ messagesSkipped: 10, messagesToSkip: 500 });
  });

  it('clears the indicator once the skip completes', () => {
    const sinks = makeSinks();

    handleResumeResponse(makeResumeWithProgress({ skipped: 2_000_000, toSkip: 10_000_000 }), sinks);
    handleResumeResponse(makeResumeWithProgress({ skipped: 10_000_000, toSkip: 10_000_000, complete: true }), sinks);

    expect(lastProgress(sinks)).toBeUndefined();
  });

  it('clears the indicator when the stats stop carrying progress', () => {
    const sinks = makeSinks();

    handleResumeResponse(makeResumeWithProgress({ skipped: 2_000_000, toSkip: 10_000_000 }), sinks);
    // `consumer_stats` is present but `start_from_progress` is not - the documented steady state.
    handleResumeResponse(makeResumeWithProgress(), sinks);

    expect(lastProgress(sinks)).toBeUndefined();
  });

  it('clears the indicator when consumer_stats is absent altogether', () => {
    const sinks = makeSinks();

    handleResumeResponse(makeResumeWithProgress({ skipped: 2_000_000, toSkip: 10_000_000 }), sinks);

    // Every ordinary data response: status + messages, no stats at all. It must not leave the
    // "skipping..." panel on screen forever.
    const plain = new ResumeResponse();
    plain.setStatus(makeStatus(Code.OK, ''));
    plain.setMessagesList([makeMessage({ value: '{"a":1}', processed: 1, sent: 1 })]);
    expect(() => handleResumeResponse(plain, sinks)).not.toThrow();

    expect(lastProgress(sinks)).toBeUndefined();
  });

  it('handles a stats-only, message-less response without throwing or disturbing the counters', () => {
    // While the skip runs the server has nothing to deliver, so these responses carry NO messages -
    // the same shape that used to kill the stream by dereferencing a message that was not there.
    const sinks = makeSinks();

    expect(() =>
      handleResumeResponse(makeResumeWithProgress({ skipped: 3_000_000, toSkip: 9_000_000 }), sinks)
    ).not.toThrow();

    expect(lastProgress(sinks)).toEqual({ messagesSkipped: 3_000_000, messagesToSkip: 9_000_000 });
    expect(sinks.notifyError).not.toHaveBeenCalled();
    expect(sinks.messagesProcessed.current).toBe(7);
    expect(sinks.messagesLoaded.current).toBe(9);
    expect(sinks.messagesBuffer.current).toHaveLength(0);
  });

  it('still reports progress on a response whose status is an error', () => {
    // The status is handled first and then returns nothing; the progress must not be lost with it.
    const res = makeResumeWithProgress({ skipped: 4_000_000, toSkip: 8_000_000 });
    res.setStatus(makeStatus(Code.UNKNOWN, 'filter failed: boom'));

    const sinks = makeSinks();
    handleResumeResponse(res, sinks);

    expect(sinks.notifyError).toHaveBeenCalledTimes(1);
    expect(lastProgress(sinks)).toEqual({ messagesSkipped: 4_000_000, messagesToSkip: 8_000_000 });
  });
});

describe('BUG-4: a crash inside the session stays local', () => {
  const libraryContext = {
    pulsarResource: {
      type: 'topic' as const,
      tenant: 'public',
      namespace: 'default',
      topicPersistency: 'persistent' as const,
      topic: 'a-topic',
    },
  };

  const renderSession = (broken: unknown) =>
    render(
      React.createElement(
        SWRConfig,
        { value: { shouldRetryOnError: false, refreshInterval: 0, revalidateOnFocus: false } },
        React.createElement(ConsumerSession, {
          initialConfig: { type: 'value', val: broken } as never,
          libraryContext,
        })
      )
    );

  it('a foreign persisted item in a target slot is refused before it can throw', () => {
    // This used to reach the per-target editor and throw mid-render, leaving the ErrorBoundary to
    // catch it. The recursive decoder now names the offending level instead, which is the same
    // outcome for the app (no blank document) and a far better one for the reader.
    const config = getDefaultManagedItem('consumer-session-config', libraryContext);
    const foreignTarget = getDefaultManagedItem('message-filter', libraryContext);
    const broken = {
      ...config,
      spec: { ...(config as { spec: Record<string, unknown> }).spec, targets: [{ type: 'value', val: foreignTarget }] },
    };

    renderSession(broken);

    expect(screen.getByTestId('cs-invalid-config')).toBeTruthy();
    expect(screen.getByTestId('cs-invalid-config-problem').textContent).toContain('spec.targets[0].val.metadata.type');
    expect(screen.queryByTestId('cs-crashed')).toBeNull();
  });

  it('renders a visible error instead of unmounting the app when a render still throws', () => {
    // The boundary is still the last resort, because the decoder stops where the document does:
    // the filter operator tree belongs to the filter editor's own contract, so a filter whose
    // operator is missing passes the shape check and throws a few frames deeper. The route must
    // not end up as an empty document.
    const config = getDefaultManagedItem('consumer-session-config', libraryContext) as any;
    const filter = getDefaultManagedItem('message-filter', libraryContext) as any;
    delete filter.spec.filter.op;
    config.spec.messageFilterChain.val.spec.filters = [{ type: 'value', val: filter }];

    renderSession(config);

    expect(screen.getByTestId('cs-crashed')).toBeTruthy();
    expect(document.body.textContent).toContain('could not be rendered');
  });
});

describe('BUG-2: pause failures', () => {
  // `status: undefined` builds a PauseResponse with no status at all.
  const pauseRespondingWith = (status?: { code: number; message: string }) => {
    const res = new PauseResponse();
    if (status !== undefined) {
      res.setStatus(makeStatus(status.code, status.message));
    }
    return { pause: (_request: unknown, _metadata: unknown) => Promise.resolve(res) };
  };

  it('reports a non-OK PauseResponse', async () => {
    const notifyError = jest.fn();
    const outcome = await pauseConsumer({
      client: pauseRespondingWith({
        code: Code.FAILED_PRECONDITION,
        message: 'No such consumer consumer session: __dekaf_x',
      }),
      consumerName: '__dekaf_x',
      notifyError,
    });

    expect(notifyError).toHaveBeenCalledTimes(1);
    expect(String(notifyError.mock.calls[0][0])).toContain('No such consumer consumer session');
    // Reporting is not enough: the caller decides whether the session may CALL ITSELF paused, and
    // it can only do that if the refusal comes back to it.
    expect(outcome).toBe('failed');
  });

  it('reports a PauseResponse that carries no status at all', async () => {
    const notifyError = jest.fn();
    const outcome = await pauseConsumer({ client: pauseRespondingWith(), consumerName: '__dekaf_x', notifyError });

    expect(notifyError).toHaveBeenCalledTimes(1);
    expect(outcome).toBe('failed');
  });

  it('stays silent on an OK response', async () => {
    const notifyError = jest.fn();
    const outcome = await pauseConsumer({
      client: pauseRespondingWith({ code: Code.OK, message: '' }),
      consumerName: '__dekaf_x',
      notifyError,
    });

    expect(notifyError).not.toHaveBeenCalled();
    expect(outcome).toBe('paused');
  });

  it('still reports a rejected pause call', async () => {
    const notifyError = jest.fn();
    const outcome = await pauseConsumer({
      client: { pause: () => Promise.reject(new Error('transport down')) },
      consumerName: '__dekaf_x',
      notifyError,
    });

    expect(notifyError).toHaveBeenCalledTimes(1);
    expect(String(notifyError.mock.calls[0][0])).toContain('transport down');
    expect(outcome).toBe('failed');
  });
});

describe('the start-from DEGRADATION record', () => {
  const progressFrame = (over: { degraded?: boolean; abandoned?: string[] } = {}) => {
    const res = new ResumeResponse();
    res.setStatus(makeStatus(Code.OK, ''));
    const stats = new ConsumerStats();
    const progress = new StartFromProgress();
    progress.setMessagesSkipped(10);
    progress.setMessagesToSkip(100);
    progress.setDegraded(over.degraded ?? false);
    progress.setAbandonedStreamsList(over.abandoned ?? []);
    stats.setStartFromProgress(progress);
    res.setConsumerStats(stats);
    return res;
  };

  it('a degraded frame hands the abandoned streams to the sink - size threshold does NOT apply', () => {
    // The skip here (100) is far below the progress panel's display threshold; the degradation
    // must surface anyway - a best-effort answer on a small skip is still best-effort.
    const sinks = makeSinks();
    handleResumeResponse(progressFrame({ degraded: true, abandoned: ['cs-1@persistent://t/ns/a-partition-1'] }), sinks);

    expect(sinks.setStartFromDegradation).toHaveBeenCalledTimes(1);
    expect(sinks.setStartFromDegradation.mock.calls[0][0]).toEqual(['cs-1@persistent://t/ns/a-partition-1']);
  });

  it('an ordinary frame never touches the degradation sink - the record is sticky, not cleared per frame', () => {
    const sinks = makeSinks();
    handleResumeResponse(progressFrame({ degraded: false }), sinks);

    expect(sinks.setStartFromDegradation).not.toHaveBeenCalled();
  });
});

describe('the best-effort order late counter carried on a ResumeResponse', () => {
  it('reaches the sink when the server confesses late deliveries', () => {
    const sinks = makeSinks();
    const res = new ResumeResponse();
    res.setStatus(makeStatus(Code.OK, ''));
    const stats = new ConsumerStats();
    stats.setOrderingLateDeliveries(3);
    res.setConsumerStats(stats);

    handleResumeResponse(res, sinks);

    expect(sinks.setOrderingLateDeliveries).toHaveBeenCalledWith(3);
  });

  it('stays quiet at zero, so an ordinary session never touches the state', () => {
    const sinks = makeSinks();
    const res = new ResumeResponse();
    res.setStatus(makeStatus(Code.OK, ''));

    handleResumeResponse(res, sinks);

    expect(sinks.setOrderingLateDeliveries).not.toHaveBeenCalled();
    expect(sinks.setOrderingActive).not.toHaveBeenCalled();
  });

  it('the ACTIVE flag reaches its sink - the chip may only claim a layer that is really running', () => {
    const sinks = makeSinks();
    const res = new ResumeResponse();
    res.setStatus(makeStatus(Code.OK, ''));
    const stats = new ConsumerStats();
    stats.setDeliveryOrderActive(true);
    res.setConsumerStats(stats);

    handleResumeResponse(res, sinks);

    expect(sinks.setOrderingActive).toHaveBeenCalledWith(true);
    expect(sinks.setOrderingWaitingStreams).toHaveBeenCalledWith(0);
  });

  /** A frame whose stats assert an active layer waiting on `waiting` streams. */
  const waitingFrame = (waiting: number) => {
    const res = new ResumeResponse();
    res.setStatus(makeStatus(Code.OK, ''));
    const stats = new ConsumerStats();
    stats.setDeliveryOrderActive(true);
    stats.setDeliveryOrderWaitingStreams(waiting);
    res.setConsumerStats(stats);
    return res;
  };

  it('surfaces and clears a delivery-order wait (stats keep coming, the field stops)', () => {
    const sinks = makeSinks();

    handleResumeResponse(waitingFrame(2), sinks);
    expect(sinks.setOrderingWaitingStreams).toHaveBeenLastCalledWith(2);

    const resumed = new ResumeResponse();
    resumed.setStatus(makeStatus(Code.OK, ''));
    const resumedStats = new ConsumerStats();
    resumedStats.setDeliveryOrderActive(true);
    resumed.setConsumerStats(resumedStats);
    handleResumeResponse(resumed, sinks);

    expect(sinks.setOrderingWaitingStreams).toHaveBeenLastCalledWith(0);
  });

  it('clears the wait on a frame with no consumer_stats at all - the frame that actually arrives', () => {
    // The clear used to live inside the delivery_order_active guard, so the most ordinary frame
    // there is - status plus messages, no stats - left the last non-zero count on a chip that is
    // sticky-visible. "Waiting" is a claim about NOW: present means SET, anything else means
    // CLEAR. The server is also growing the habit of carrying this field on stats frames outside
    // any skip; present-SET/absent-CLEAR is exactly what composes with that.
    const sinks = makeSinks();

    handleResumeResponse(waitingFrame(3), sinks);
    expect(sinks.setOrderingWaitingStreams).toHaveBeenLastCalledWith(3);

    const plain = new ResumeResponse();
    plain.setStatus(makeStatus(Code.OK, ''));
    plain.setMessagesList([makeMessage({ value: '{"a":1}', processed: 1, sent: 1 })]);
    handleResumeResponse(plain, sinks);

    expect(sinks.setOrderingWaitingStreams).toHaveBeenLastCalledWith(0);
  });

  it('clears the wait on stats that stopped asserting the layer, without un-sticking the active flag', () => {
    const sinks = makeSinks();

    handleResumeResponse(waitingFrame(2), sinks);
    expect(sinks.setOrderingWaitingStreams).toHaveBeenLastCalledWith(2);

    // Stats present, delivery_order_active false (the proto3 default), no waiting field.
    const inactive = new ResumeResponse();
    inactive.setStatus(makeStatus(Code.OK, ''));
    inactive.setConsumerStats(new ConsumerStats());
    handleResumeResponse(inactive, sinks);

    expect(sinks.setOrderingWaitingStreams).toHaveBeenLastCalledWith(0);
    // The ACTIVE flag stays sticky: it is only ever raised, never written false by a frame.
    expect(sinks.setOrderingActive).not.toHaveBeenCalledWith(false);
  });
});

/**
 * The guaranteed replay's caught-up state carried on a ResumeResponse. The server auto-pauses the
 * runner at the replay boundary and the CLIENT learns only through this stats frame - and while
 * the session stays boundary-paused, every later response re-asserts the state, so the record
 * mirrors the frame exactly like the waiting status does: present means SET, anything else means
 * CLEAR. Leaving a stale record would pin a "caught up" banner over a session that resumed.
 */
describe('the guaranteed replay caught-up state carried on a ResumeResponse', () => {
  const caughtUpFrame = (over: {
    boundaryAtMs?: number;
    newerEntriesApprox?: number;
    seamViolations?: number;
    excludedTopics?: string[];
    excludedTopicCount?: number;
  } = {}) => {
    const res = new ResumeResponse();
    res.setStatus(makeStatus(Code.OK, ''));
    const stats = new ConsumerStats();
    stats.setDeliveryOrderActive(true);
    stats.setReplayCaughtUp(true);
    stats.setReplayBoundaryAtMs(over.boundaryAtMs ?? 1_754_700_000_000);
    stats.setReplayNewerEntriesApprox(over.newerEntriesApprox ?? 0);
    stats.setReplaySeamViolations(over.seamViolations ?? 0);
    stats.setReplayExcludedTopicsList(over.excludedTopics ?? []);
    stats.setReplayExcludedTopicCount(over.excludedTopicCount ?? 0);
    res.setConsumerStats(stats);
    return res;
  };

  const lastCaughtUp = (sinks: ReturnType<typeof makeSinks>) => {
    const calls = sinks.setReplayCaughtUp.mock.calls;
    return calls[calls.length - 1][0];
  };

  it('hands the caught-up record to its sink - boundary, indicators and exclusions included', () => {
    const sinks = makeSinks();

    handleResumeResponse(caughtUpFrame({
      boundaryAtMs: 1_754_700_000_000,
      newerEntriesApprox: 42,
      excludedTopics: ['persistent://t/ns/a', 'persistent://t/ns/b'],
      excludedTopicCount: 7,
    }), sinks);

    expect(lastCaughtUp(sinks)).toEqual({
      boundaryAtMs: 1_754_700_000_000,
      newerEntriesApprox: 42,
      excludedTopics: ['persistent://t/ns/a', 'persistent://t/ns/b'],
      excludedTopicCount: 7,
    });
  });

  it('clears the record on stats that stop asserting caught-up - the first frame after a Resume', () => {
    const sinks = makeSinks();

    handleResumeResponse(caughtUpFrame(), sinks);
    expect(lastCaughtUp(sinks)).toBeDefined();

    // Stats present (the ordering layer is running again), replay_caught_up absent - the proto3
    // default the server sends once the boundary was extended.
    const resumed = new ResumeResponse();
    resumed.setStatus(makeStatus(Code.OK, ''));
    const stats = new ConsumerStats();
    stats.setDeliveryOrderActive(true);
    resumed.setConsumerStats(stats);
    handleResumeResponse(resumed, sinks);

    expect(lastCaughtUp(sinks)).toBeUndefined();
  });

  it('clears the record on a frame with no consumer_stats at all - the ordinary data frame', () => {
    const sinks = makeSinks();

    handleResumeResponse(caughtUpFrame(), sinks);
    expect(lastCaughtUp(sinks)).toBeDefined();

    const plain = new ResumeResponse();
    plain.setStatus(makeStatus(Code.OK, ''));
    plain.setMessagesList([makeMessage({ value: '{"a":1}', processed: 1, sent: 1 })]);
    handleResumeResponse(plain, sinks);

    expect(lastCaughtUp(sinks)).toBeUndefined();
  });

  it('the seam-violation counter reaches its sink when the server confesses one', () => {
    // Monotonic from the server, exactly like the late counter: the count only ever grows, and a
    // frame that stops carrying stats leaves the last value standing.
    const sinks = makeSinks();

    handleResumeResponse(caughtUpFrame({ seamViolations: 2 }), sinks);

    expect(sinks.setReplaySeamViolations).toHaveBeenCalledWith(2);
  });

  it('stays quiet at zero seam violations, so an ordinary replay never touches the state', () => {
    const sinks = makeSinks();

    handleResumeResponse(caughtUpFrame(), sinks);

    expect(sinks.setReplaySeamViolations).not.toHaveBeenCalled();
  });
});

describe('a frame from a superseded (draining) stream', () => {
  // The policy handleDrainingResumeResponse enforces: a superseded stream's tail frames deliver
  // their messages - sent and acknowledged server-side, existing nowhere else - and NOTHING else.
  // The counters and stats on such a frame describe an older moment than what the live stream
  // already reported; the wiring that swaps the full handler for this one is pinned by the
  // live-session test below.
  it('appends only the valued messages', () => {
    const res = new ResumeResponse();
    res.setStatus(makeStatus(Code.OK, ''));
    res.setMessagesList([
      makeMessage({ value: '{"a":1}', processed: 3, sent: 3 }),
      // A count-only placeholder: advances counters on the live handler, renders no row - and on
      // a draining stream must reach neither the buffer nor the counters.
      makeMessage({ processed: 4, sent: 4 }),
    ]);

    const messagesBuffer = { current: [] as ReturnType<typeof makeMessage>[] };
    handleDrainingResumeResponse(res, messagesBuffer);

    expect(messagesBuffer.current).toHaveLength(1);
    expect(messagesBuffer.current[0].getValue()?.getValue()).toBe('{"a":1}');
  });

  it('tolerates the message-less shapes a closing stream sends', () => {
    const statusOnly = new ResumeResponse();
    statusOnly.setStatus(makeStatus(Code.FAILED_PRECONDITION, 'No such consumer'));

    const messagesBuffer = { current: [] as ReturnType<typeof makeMessage>[] };
    expect(() => handleDrainingResumeResponse(statusOnly, messagesBuffer)).not.toThrow();
    expect(messagesBuffer.current).toHaveLength(0);
  });
});

/**
 * Live-session tests: the full component against a scriptable consumer service and hand-driven
 * resume streams. Everything the session believes - counters, panels, chips - is read back
 * through the DOM, exactly as a user would see it.
 */
describe('a live consumer session', () => {
  /** A minimal grpc-web ClientReadableStream the session can subscribe to and the test can drive. */
  const makeFakeStream = () => {
    const listeners = new Map<string, Set<(arg?: unknown) => void>>();
    const stream = {
      on: (ev: string, cb: (arg?: unknown) => void) => {
        if (!listeners.has(ev)) {
          listeners.set(ev, new Set());
        }
        listeners.get(ev)!.add(cb);
        return stream;
      },
      removeListener: (ev: string, cb: (arg?: unknown) => void) => {
        listeners.get(ev)?.delete(cb);
      },
      cancel: jest.fn(),
      emit: (ev: string, arg?: unknown) => {
        Array.from(listeners.get(ev) ?? []).forEach((cb) => cb(arg));
      },
      listenerCount: (ev: string) => listeners.get(ev)?.size ?? 0,
    };
    return stream;
  };

  const okStatus = () => makeStatus(Code.OK, '');

  const installFakeGrpcClients = (opts: { setDeliveryOrderWith?: { code: number; message: string } } = {}) => {
    const streams: Array<ReturnType<typeof makeFakeStream>> = [];
    const consumerServiceClient = {
      // The live delivery-order switch. A refusal (a direction the server does not perform on a
      // running session, an unknown session) is a RESOLVED response carrying a reason, exactly as
      // ConsumerServiceImpl answers - never a rejected call.
      setDeliveryOrder: jest.fn(() => {
        const res = new SetDeliveryOrderResponse();
        const s = opts.setDeliveryOrderWith ?? { code: Code.OK, message: '' };
        res.setStatus(makeStatus(s.code, s.message));
        return Promise.resolve(res);
      }),
      createConsumer: jest.fn(() => {
        const res = new CreateConsumerResponse();
        res.setStatus(okStatus());
        return Promise.resolve(res);
      }),
      resume: jest.fn(() => {
        const stream = makeFakeStream();
        streams.push(stream);
        return stream;
      }),
      pause: jest.fn(() => {
        const res = new PauseResponse();
        res.setStatus(okStatus());
        return Promise.resolve(res);
      }),
      deleteConsumer: jest.fn(() => {
        const res = new DeleteConsumerResponse();
        res.setStatus(okStatus());
        return Promise.resolve(res);
      }),
      // The configuration view's topic-selector info resolves the selection through the same
      // client. An empty OK answer renders "No topics found", which is all these tests need.
      resolveTopicSelector: jest.fn(() => Promise.resolve({
        getStatus: () => okStatus(),
        getTopicFqnsList: () => [] as string[],
      })),
    };
    (globalThis as Record<string, unknown>)['__csTestGrpcClients'] = { consumerServiceClient };
    return { consumerServiceClient, streams };
  };

  /** A ResumeResponse assembled from plain parts: valued/placeholder messages, progress, ordering. */
  const frame = (opts: {
    messages?: Array<{ value?: string; processed: number; sent: number }>;
    progress?: { skipped: number; toSkip: number; complete?: boolean };
    waiting?: number;
    active?: boolean;
    /** The guaranteed replay reached its boundary: the server auto-paused and says so. */
    caughtUp?: {
      boundaryAtMs?: number;
      newerEntriesApprox?: number;
      excludedTopics?: string[];
      excludedTopicCount?: number;
    };
    seamViolations?: number;
  }) => {
    const res = new ResumeResponse();
    res.setStatus(okStatus());
    res.setMessagesList((opts.messages ?? []).map(makeMessage));
    if (opts.progress !== undefined || opts.waiting !== undefined || opts.active !== undefined
      || opts.caughtUp !== undefined || opts.seamViolations !== undefined) {
      const stats = new ConsumerStats();
      if (opts.progress !== undefined) {
        const p = new StartFromProgress();
        p.setMessagesSkipped(opts.progress.skipped);
        p.setMessagesToSkip(opts.progress.toSkip);
        p.setComplete(opts.progress.complete ?? false);
        stats.setStartFromProgress(p);
      }
      if (opts.active !== undefined) {
        stats.setDeliveryOrderActive(opts.active);
      }
      if (opts.waiting !== undefined) {
        stats.setDeliveryOrderWaitingStreams(opts.waiting);
      }
      if (opts.caughtUp !== undefined) {
        stats.setReplayCaughtUp(true);
        stats.setReplayBoundaryAtMs(opts.caughtUp.boundaryAtMs ?? 1_754_700_000_000);
        stats.setReplayNewerEntriesApprox(opts.caughtUp.newerEntriesApprox ?? 0);
        stats.setReplayExcludedTopicsList(opts.caughtUp.excludedTopics ?? []);
        stats.setReplayExcludedTopicCount(opts.caughtUp.excludedTopicCount ?? 0);
      }
      if (opts.seamViolations !== undefined) {
        stats.setReplaySeamViolations(opts.seamViolations);
      }
      res.setConsumerStats(stats);
    }
    return res;
  };

  const topicLibraryContext = (topicPersistency: 'persistent' | 'non-persistent') => ({
    pulsarResource: {
      type: 'topic' as const,
      tenant: 'public',
      namespace: 'default',
      topicPersistency,
      topic: 'a-topic',
    },
  });

  const renderSession = (opts: {
    topicPersistency?: 'persistent' | 'non-persistent';
    startFrom?: unknown;
    /**
     * Pin the session's delivery order EXPLICITLY, like the e2e matrix does. Tests whose scenario
     * needs a particular mode (a Guaranteed stall, say) must not inherit it from the default-item
     * template - the default is a product decision that can move (and did: Best effort since
     * 2026-08-09), and a scenario riding on it silently stops testing what it says.
     */
    deliveryOrder?: 'guaranteed' | 'best-effort' | 'as-received';
    /**
     * Render the session against a REFERENCE to a library item rather than an own value. The
     * resolved item still rides along in `val` (the browser-local draft the config editor caches),
     * which is what lets the session run at all - see consumerSessionConfigFromValOrRef.
     */
    asReferenceTo?: string;
  } = {}) => {
    const libraryContext = topicLibraryContext(opts.topicPersistency ?? 'persistent');
    const config = getDefaultManagedItem('consumer-session-config', libraryContext) as {
      spec: { startFrom: { val: { spec: { startFrom: unknown } } }; messageDeliveryOrder?: string };
    };
    if (opts.startFrom !== undefined) {
      config.spec.startFrom.val.spec.startFrom = opts.startFrom;
    }
    if (opts.deliveryOrder !== undefined) {
      config.spec.messageDeliveryOrder = opts.deliveryOrder;
    }

    const initialConfig = opts.asReferenceTo === undefined
      ? { type: 'value', val: config }
      : { type: 'reference', ref: opts.asReferenceTo, val: config };

    render(
      React.createElement(
        SWRConfig,
        { value: { shouldRetryOnError: false, refreshInterval: 0, revalidateOnFocus: false } },
        React.createElement(ConsumerSession, {
          initialConfig: initialConfig as never,
          libraryContext,
        })
      )
    );
  };

  const session = () => screen.getByTestId('cs-session') as HTMLElement;
  const play = () => fireEvent.click(screen.getByTestId('cs-play'));
  const stop = () => fireEvent.click(screen.getByTestId('cs-stop'));
  const awaitState = (state: string) => waitFor(() => expect(session().dataset.csState).toBe(state));

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>)['__csTestGrpcClients'];
    window.localStorage.clear();
  });

  it('does not resurface a previous run\'s skip progress after pause and resume on an idle topic', async () => {
    const { streams } = installFakeGrpcClients();
    renderSession();

    play();
    await awaitState('running');
    await waitFor(() => expect(streams).toHaveLength(1));
    await waitFor(() => expect(streams[0].listenerCount('data')).toBe(1));

    // A big skip is resolving: the server pushes progress and nothing else.
    act(() => {
      streams[0].emit('data', frame({ progress: { skipped: 10, toSkip: 2_000_000 } }));
    });
    const panel = await screen.findByTestId('cs-start-from-progress');
    expect(panel.dataset.csToSkip).toBe('2000000');

    // Pause mid-skip: the panel hides (it is gated on `running`), the record used to stay behind.
    play();
    await awaitState('paused');
    expect(screen.queryByTestId('cs-start-from-progress')).toBeNull();

    // Play again. The NEW stream never sends a frame - an idle topic whose skip already resolved -
    // so nothing would ever clear a stale record: the panel must not re-appear on its own.
    play();
    await awaitState('running');
    await waitFor(() => expect(streams).toHaveLength(2));
    await waitFor(() => expect(screen.queryByTestId('cs-start-from-progress')).toBeNull());
    expect(screen.getByText('Awaiting for new messages...')).toBeTruthy();
  });

  it('a late frame from the superseded stream delivers its messages and moves nothing else', async () => {
    const { streams } = installFakeGrpcClients();
    renderSession();

    play();
    await awaitState('running');
    await waitFor(() => expect(streams).toHaveLength(1));
    await waitFor(() => expect(streams[0].listenerCount('data')).toBe(1));

    act(() => {
      streams[0].emit('data', frame({ messages: [{ value: '{"n":1}', processed: 5, sent: 5 }] }));
    });
    await waitFor(() => expect(session().dataset.csRetained).toBe('1'));
    await waitFor(() => expect(screen.getByTestId('cs-loaded').textContent).toBe('5'));

    play();
    await awaitState('paused');
    play();
    await awaitState('running');
    // The new stream's listener being attached proves the old one was superseded (the swap happens
    // in the same effect turnover).
    await waitFor(() => expect(streams).toHaveLength(2));
    await waitFor(() => expect(streams[1].listenerCount('data')).toBe(1));

    // The predecessor's last in-flight frame arrives late: smaller (older) counters, a stale skip
    // progress, a stale ordering wait - and one real message that exists nowhere else.
    act(() => {
      streams[0].emit('data', frame({
        messages: [{ value: '{"n":2}', processed: 3, sent: 3 }],
        progress: { skipped: 1, toSkip: 100 },
        active: true,
        waiting: 4,
      }));
    });

    // The message is kept - cancelling the stream instead would have dropped it silently.
    await waitFor(() => expect(session().dataset.csRetained).toBe('2'));
    // The counters are NOT regressed to the stale frame's 3 (that is what rendered a negative
    // per-second gauge), and the stale stats re-open nothing: no ordering chip, no skip panel.
    expect(screen.getByTestId('cs-loaded').textContent).toBe('5');
    expect(screen.queryByTestId('cs-order-chip')).toBeNull();
    expect(screen.queryByTestId('cs-start-from-progress')).toBeNull();
  });

  it('a history start-from on a non-persistent topic: Play sends the live tail, the stored config keeps the user\'s mode', async () => {
    const { consumerServiceClient } = installFakeGrpcClients();
    renderSession({ topicPersistency: 'non-persistent', startFrom: { type: 'nthMessageAfterEarliest', n: 5 } });

    // The configuration view says the substitution out loud, and the stored mode is NOT rewritten
    // from under the user - the selector still shows it.
    expect(await screen.findByTestId('cs-start-from-inapplicable-note')).toBeTruthy();
    expect((screen.getByTestId('cs-start-from') as HTMLSelectElement).value).toBe('nthMessageAfterEarliest');

    play();
    await waitFor(() => expect(consumerServiceClient.createConsumer).toHaveBeenCalledTimes(1));

    // What actually went to the server is the one start position a non-persistent topic has.
    const req = (consumerServiceClient.createConsumer as jest.Mock).mock.calls[0][0] as {
      getConsumerSessionConfig: () => { getStartFrom: () => { hasStartFromLatestMessage: () => boolean; hasStartFromNthMessageAfterEarliest: () => boolean } };
    };
    const startFromPb = req.getConsumerSessionConfig().getStartFrom();
    expect(startFromPb.hasStartFromLatestMessage()).toBe(true);
    expect(startFromPb.hasStartFromNthMessageAfterEarliest()).toBe(false);
  });

  /**
   * P2.16: a Guaranteed stall must be ESCAPABLE, not merely disclosed.
   *
   * Guaranteed - an explicit choice, since the product default is Best effort - waits, by design,
   * indefinitely for every topic or partition - on a silent one that is forever, and it looks
   * exactly like an empty topic. The chip discloses the wait and carries the escape; what is
   * asserted here is everything the escape has to do to be real:
   *
   *   - it reaches the LIVE session (a config-only edit would need a Play, which re-reads from the
   *     start position and throws away everything already held - the opposite of the point);
   *   - it is PERSISTED, so the next Play asks for what the session is now actually doing;
   *   - a reference-typed configuration becomes a VALUE first, because `val` on a reference is a
   *     browser-local draft that the wire conversion drops - writing the order there would leave
   *     the session disagreeing with the library item it names, unpersisted;
   *   - the disclosed wait is retired, because "waiting" only ever arrives on a response frame and
   *     a switch that releases nothing owes no frame;
   *   - and a refusal is SHOWN, changing nothing.
   */
  describe('ending a Guaranteed stall from the chip', () => {
    /** Play, then let the server disclose a stall: the ordering layer is running and held. */
    const runIntoAStall = async (streams: Array<ReturnType<typeof makeFakeStream>>) => {
      play();
      await awaitState('running');
      await waitFor(() => expect(streams).toHaveLength(1));
      await waitFor(() => expect(streams[0].listenerCount('data')).toBe(1));

      act(() => {
        streams[0].emit('data', frame({ active: true, waiting: 3 }));
      });
      await screen.findByTestId('cs-order-waiting');
    };

    const switchToBestEffort = async () => {
      await act(async () => {
        fireEvent.click(screen.getByTestId('cs-order-switch-best-effort'));
      });
    };

    const orderChipText = () => screen.getByTestId('cs-order-chip').textContent;
    const deliveryOrderSentByPlay = (client: { createConsumer: unknown }, call: number) => {
      const req = (client.createConsumer as jest.Mock).mock.calls[call][0] as {
        getConsumerSessionConfig: () => { getMessageDeliveryOrder: () => number };
      };
      return req.getConsumerSessionConfig().getMessageDeliveryOrder();
    };

    let reportedErrors: string[] = [];
    const deliveryOrderErrors = () => reportedErrors.filter((it) => it.includes('delivery order'));

    beforeEach(() => {
      reportedErrors = [];
      // The session reports through the notification context, whose default value is this object;
      // nothing renders a toast container in jsdom, so the report is captured at the source.
      jest.spyOn(notifications, 'notifyError').mockImplementation((content) => {
        reportedErrors.push(String(content));
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('switches the LIVE session, naming the consumer the session actually built', async () => {
      const { consumerServiceClient, streams } = installFakeGrpcClients();
      renderSession({ deliveryOrder: 'guaranteed' });
      await runIntoAStall(streams);

      await switchToBestEffort();

      // Not a config edit that waits for the next Play: the running consumer is switched in place,
      // which is what releases the held set without re-reading or losing it.
      expect(consumerServiceClient.setDeliveryOrder).toHaveBeenCalledTimes(1);
      const req = (consumerServiceClient.setDeliveryOrder as jest.Mock).mock.calls[0][0] as {
        getConsumerName: () => string;
        getMessageDeliveryOrder: () => number;
      };
      const built = (consumerServiceClient.createConsumer as jest.Mock).mock.calls[0][0] as {
        getConsumerName: () => string;
      };
      expect(req.getConsumerName()).toBe(built.getConsumerName());
      expect(req.getMessageDeliveryOrder()).toBe(MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME);
      // The session was NOT recreated to apply it - that would have re-read from the start position.
      expect(consumerServiceClient.createConsumer).toHaveBeenCalledTimes(1);
      // ...and it went through silently. Filtered rather than compared whole: the library panel
      // reports its own unrelated failures against the inert default client in this harness.
      expect(deliveryOrderErrors()).toEqual([]);
    });

    it('persists the new order, so the next Play asks for what the session is already doing', async () => {
      const { consumerServiceClient, streams } = installFakeGrpcClients();
      renderSession({ deliveryOrder: 'guaranteed' });
      await runIntoAStall(streams);
      expect(deliveryOrderSentByPlay(consumerServiceClient, 0)).toBe(MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED);

      await switchToBestEffort();

      // The session's own configuration now says Best effort - the chip reads it back.
      await waitFor(() => expect(orderChipText()).toContain('Best effort'));

      // ...and so does the next session built from it. Without the write, Play would silently put
      // the user back into the stall they just escaped.
      stop();
      await awaitState('new');
      play();
      await waitFor(() => expect(consumerServiceClient.createConsumer).toHaveBeenCalledTimes(2));
      expect(deliveryOrderSentByPlay(consumerServiceClient, 1))
        .toBe(MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME);
    });

    it('converts a referenced configuration to a value instead of writing into the reference', async () => {
      const { consumerServiceClient, streams } = installFakeGrpcClients();
      renderSession({ asReferenceTo: 'lib-cfg-1', deliveryOrder: 'guaranteed' });
      // The session starts out pointed at a library item - the configuration view says so.
      expect(await screen.findByTestId('lib-reference-icon')).toBeTruthy();

      await runIntoAStall(streams);
      await switchToBestEffort();

      expect(consumerServiceClient.setDeliveryOrder).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(orderChipText()).toContain('Best effort'));

      // The entry is a VALUE now, not a reference still carrying a rewritten draft: the session
      // owns its copy, and the library item it used to name is unchanged.
      stop();
      await awaitState('new');
      await waitFor(() => expect(screen.queryByTestId('lib-reference-icon')).toBeNull());
    });

    it('retires the disclosed wait the server just ended, without waiting for a frame', async () => {
      const { streams } = installFakeGrpcClients();
      renderSession({ deliveryOrder: 'guaranteed' });
      await runIntoAStall(streams);

      await switchToBestEffort();

      // A switch that released nothing owes no response frame, and `waiting` only ever rides one -
      // so nothing else would ever retire this status.
      await waitFor(() => expect(screen.queryByTestId('cs-order-waiting')).toBeNull());
      expect(screen.queryByTestId('cs-order-switch-best-effort')).toBeNull();
      // The chip itself stays: the session is still merging, in the other mode.
      expect(orderChipText()).toContain('Best effort');
    });

    it('shows a refused switch and leaves the session, its configuration and the wait alone', async () => {
      const refusal = 'Cannot promote a running session to Guaranteed';
      const { consumerServiceClient, streams } = installFakeGrpcClients({
        setDeliveryOrderWith: { code: Code.FAILED_PRECONDITION, message: refusal },
      });
      renderSession({ deliveryOrder: 'guaranteed' });
      await runIntoAStall(streams);

      await switchToBestEffort();

      // The reason is the whole value of a refusal - swallowing it leaves a button that looks like
      // it worked.
      await waitFor(() => expect(deliveryOrderErrors().join('\n')).toContain(refusal));
      // Nothing moved: the live session is still Guaranteed (whose chip reads as the replay it
      // is) and still held, so the disclosure and its escape both stay exactly where they were.
      expect(orderChipText()).toContain('Replaying history');
      expect(screen.getByTestId('cs-order-waiting').textContent).toContain('waiting for 3 topics/partitions');
      expect(screen.getByTestId('cs-order-switch-best-effort')).toBeTruthy();
      expect(deliveryOrderSentByPlay(consumerServiceClient, 0)).toBe(MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED);
    });

    it('offers no escape while Guaranteed is merging normally', async () => {
      const { consumerServiceClient, streams } = installFakeGrpcClients();
      renderSession({ deliveryOrder: 'guaranteed' });

      play();
      await awaitState('running');
      await waitFor(() => expect(streams).toHaveLength(1));
      await waitFor(() => expect(streams[0].listenerCount('data')).toBe(1));
      act(() => {
        streams[0].emit('data', frame({ active: true, waiting: 0 }));
      });

      // The chip is there - the merge is running - but there is no stall to escape.
      expect(await screen.findByTestId('cs-order-chip')).toBeTruthy();
      expect(screen.queryByTestId('cs-order-switch-best-effort')).toBeNull();
      expect(consumerServiceClient.setDeliveryOrder).not.toHaveBeenCalled();
    });
  });

  /**
   * The guaranteed replay reaching its boundary. The server AUTO-PAUSES the runner and announces
   * it on a stats frame - the server cannot flip browser state, so this frame is the only way the
   * session learns it is paused. The UI lands in the ordinary paused state (no parallel state) and
   * says WHY with a reason-differentiated banner; Resume extends the boundary through the ordinary
   * resume flow, and the banner's switch reuses the same applyDeliveryOrder the stall chip uses.
   */
  describe('the guaranteed replay catching up', () => {
    const banner = () => screen.queryByTestId('cs-replay-caught-up');

    /** Play, then let the server announce the boundary auto-pause. */
    const runUntilCaughtUp = async (
      streams: Array<ReturnType<typeof makeFakeStream>>,
      caughtUp: { boundaryAtMs?: number; newerEntriesApprox?: number; excludedTopics?: string[]; excludedTopicCount?: number } = {}
    ) => {
      play();
      await awaitState('running');
      await waitFor(() => expect(streams).toHaveLength(1));
      await waitFor(() => expect(streams[0].listenerCount('data')).toBe(1));

      act(() => {
        streams[0].emit('data', frame({ active: true, caughtUp }));
      });
      await awaitState('paused');
    };

    let reportedErrors: string[] = [];

    beforeEach(() => {
      reportedErrors = [];
      jest.spyOn(notifications, 'notifyError').mockImplementation((content) => {
        reportedErrors.push(String(content));
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('auto-pauses the session UI on the caught-up frame, without sending a redundant Pause', async () => {
      const { consumerServiceClient, streams } = installFakeGrpcClients();
      renderSession({ deliveryOrder: 'guaranteed' });

      await runUntilCaughtUp(streams);

      // The frame IS the server's confirmation - the runner is already holding everything - so
      // the session lands on `paused` directly instead of asking the server to pause again.
      expect(session().dataset.csState).toBe('paused');
      expect(consumerServiceClient.pause).not.toHaveBeenCalled();
    });

    it('says what it caught up TO, in the reader\'s clock', async () => {
      const { streams } = installFakeGrpcClients();
      renderSession({ deliveryOrder: 'guaranteed' });

      // 2026-08-09 00:00:00 UTC; the banner renders it through the app's date formatting.
      await runUntilCaughtUp(streams, { boundaryAtMs: Date.UTC(2026, 7, 9, 0, 0, 0) });

      expect(banner()).toBeTruthy();
      expect(banner()!.textContent).toContain('Caught up to');
      expect(banner()!.textContent).toContain('2026');
    });

    it('announces newer data only approximately - entries, never an exact message count', async () => {
      const { streams } = installFakeGrpcClients();
      renderSession({ deliveryOrder: 'guaranteed' });

      await runUntilCaughtUp(streams, { newerEntriesApprox: 12000 });

      const newer = screen.getByTestId('cs-replay-caught-up-newer');
      expect(newer.textContent).toContain('~12,000 newer entries');
      expect(newer.textContent).toMatch(/resume/i);
    });

    it('claims no newer data when the server reported none', async () => {
      const { streams } = installFakeGrpcClients();
      renderSession({ deliveryOrder: 'guaranteed' });

      await runUntilCaughtUp(streams);

      expect(banner()).toBeTruthy();
      expect(screen.queryByTestId('cs-replay-caught-up-newer')).toBeNull();
    });

    it('names the topics excluded from this replay, with the TRUE count past the listed five', async () => {
      const { streams } = installFakeGrpcClients();
      renderSession({ deliveryOrder: 'guaranteed' });

      // The server caps the listed names at 5; the count field carries the truth.
      await runUntilCaughtUp(streams, {
        excludedTopics: ['persistent://t/ns/a', 'persistent://t/ns/b', 'persistent://t/ns/c', 'persistent://t/ns/d', 'persistent://t/ns/e'],
        excludedTopicCount: 7,
      });

      const excluded = screen.getByTestId('cs-replay-caught-up-excluded');
      expect(excluded.textContent).toContain('7');
      expect(excluded.textContent).toMatch(/restart/i);
      expect(excluded.textContent).toContain('persistent://t/ns/a');
      expect(excluded.textContent).toContain('+2 more');
    });

    it('claims no exclusions when the server reported none', async () => {
      const { streams } = installFakeGrpcClients();
      renderSession({ deliveryOrder: 'guaranteed' });

      await runUntilCaughtUp(streams);

      expect(screen.queryByTestId('cs-replay-caught-up-excluded')).toBeNull();
    });

    it('a manual pause shows no caught-up banner - the reason differentiates the paused state', async () => {
      const { streams } = installFakeGrpcClients();
      renderSession({ deliveryOrder: 'guaranteed' });

      play();
      await awaitState('running');
      await waitFor(() => expect(streams).toHaveLength(1));
      await waitFor(() => expect(streams[0].listenerCount('data')).toBe(1));
      act(() => {
        streams[0].emit('data', frame({ active: true, messages: [{ value: '{"n":1}', processed: 1, sent: 1 }] }));
      });

      play();
      await awaitState('paused');

      expect(banner()).toBeNull();
    });

    it('Resume goes back to running through the ordinary resume flow and retires the banner', async () => {
      const { streams } = installFakeGrpcClients();
      renderSession({ deliveryOrder: 'guaranteed' });
      await runUntilCaughtUp(streams);

      await act(async () => {
        fireEvent.click(screen.getByTestId('cs-replay-resume'));
      });

      await awaitState('running');
      // The ordinary resume flow: a new resume stream against the same consumer - the server
      // extends the boundary on it.
      await waitFor(() => expect(streams).toHaveLength(2));
      expect(banner()).toBeNull();
    });

    it('Continue live with Best effort switches the LIVE session and resumes into live delivery', async () => {
      const { consumerServiceClient, streams } = installFakeGrpcClients();
      renderSession({ deliveryOrder: 'guaranteed' });
      await runUntilCaughtUp(streams);

      await act(async () => {
        fireEvent.click(screen.getByTestId('cs-replay-continue-best-effort'));
      });

      // The EXISTING applyDeliveryOrder wiring: the live switch RPC, once.
      expect(consumerServiceClient.setDeliveryOrder).toHaveBeenCalledTimes(1);
      const req = (consumerServiceClient.setDeliveryOrder as jest.Mock).mock.calls[0][0] as {
        getMessageDeliveryOrder: () => number;
      };
      expect(req.getMessageDeliveryOrder()).toBe(MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME);

      // The server resumed live delivery on the switch; the session follows it back to running.
      await awaitState('running');
      expect(banner()).toBeNull();

      // ...and the configuration was persisted through the same wiring, so the next Play asks for
      // what the session is now doing.
      stop();
      await awaitState('new');
      play();
      await waitFor(() => expect(consumerServiceClient.createConsumer).toHaveBeenCalledTimes(2));
      const nextPlay = (consumerServiceClient.createConsumer as jest.Mock).mock.calls[1][0] as {
        getConsumerSessionConfig: () => { getMessageDeliveryOrder: () => number };
      };
      expect(nextPlay.getConsumerSessionConfig().getMessageDeliveryOrder())
        .toBe(MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME);
    });

    it('a refused switch is shown and leaves the session paused at the boundary, banner intact', async () => {
      const refusal = 'Cannot switch this session';
      const { consumerServiceClient, streams } = installFakeGrpcClients({
        setDeliveryOrderWith: { code: Code.FAILED_PRECONDITION, message: refusal },
      });
      renderSession({ deliveryOrder: 'guaranteed' });
      await runUntilCaughtUp(streams);

      await act(async () => {
        fireEvent.click(screen.getByTestId('cs-replay-continue-best-effort'));
      });

      expect(reportedErrors.join('\n')).toContain(refusal);
      // Nothing moved: the server did not switch, so the session must not claim to be running.
      expect(session().dataset.csState).toBe('paused');
      expect(banner()).toBeTruthy();
      expect(consumerServiceClient.createConsumer).toHaveBeenCalledTimes(1);
    });

    it('the session-level seam count rides the chip area whenever the server confesses one', async () => {
      const { streams } = installFakeGrpcClients();
      renderSession({ deliveryOrder: 'guaranteed' });

      play();
      await awaitState('running');
      await waitFor(() => expect(streams).toHaveLength(1));
      await waitFor(() => expect(streams[0].listenerCount('data')).toBe(1));
      act(() => {
        streams[0].emit('data', frame({ active: true, seamViolations: 2 }));
      });

      const seam = await screen.findByTestId('cs-replay-seam-violations');
      expect(seam.textContent).toContain('2');
    });
  });
});

/**
 * The configuration half of the switch, on its own: what gets WRITTEN when the order changes.
 *
 * A reference names a library item and its `val` is only a browser-local draft that
 * `managed...ValOrRefToPb` drops on the way to the server. Writing the new order into that draft
 * while the entry still says `reference` produces a session disagreeing with the item it names, and
 * does not even persist - which is why the entry is converted to a value first.
 */
describe('the delivery order written into a session configuration', () => {
  const anItem = () => getDefaultManagedItem('consumer-session-config', {
    pulsarResource: {
      type: 'topic' as const,
      tenant: 'public',
      namespace: 'default',
      topicPersistency: 'persistent' as const,
      topic: 'a-topic',
    },
  }) as { spec: { messageDeliveryOrder?: string } };

  const orderOf = (v: unknown) => (v as { val: { spec: { messageDeliveryOrder?: string } } }).val.spec.messageDeliveryOrder;

  it('converts a reference to a value rather than leaving a rewritten draft under it', () => {
    const item = anItem();
    // Pin the source item to explicit Guaranteed - distinct from both the written order and the
    // template default (Best effort since the 2026-08-09 owner decision), so an in-place edit of
    // the library item cannot hide behind either.
    item.spec.messageDeliveryOrder = 'guaranteed';

    const written = configValOrRefWithDeliveryOrder(
      { type: 'reference', ref: 'lib-cfg-1', val: item } as never,
      'best-effort'
    );

    expect(written).toBeDefined();
    expect(written!.type).toBe('value');
    // Not `val`-plus-`reference`: that shape claims the library item's order and carries a
    // different one, and only the `ref` would ever reach the server.
    expect(Object.prototype.hasOwnProperty.call(written, 'ref')).toBe(false);
    expect(orderOf(written)).toBe('best-effort');
    // The item the reference named is not edited in place - other users of it are untouched.
    expect(item.spec.messageDeliveryOrder).toBe('guaranteed');
  });

  it('rewrites an own value in place, staying a value', () => {
    // Start from explicit Guaranteed so the written Best effort is provably the write's doing,
    // not the template default it now coincides with.
    const item = anItem();
    item.spec.messageDeliveryOrder = 'guaranteed';
    const written = configValOrRefWithDeliveryOrder(
      { type: 'value', val: item } as never,
      'best-effort'
    );

    expect(written!.type).toBe('value');
    expect(orderOf(written)).toBe('best-effort');
  });

  it('writes nothing when there is no resolved configuration to carry the change', () => {
    // An unresolved reference: the library item has not arrived, so there is no spec to rewrite and
    // a half-written one would be worse than none.
    expect(configValOrRefWithDeliveryOrder({ type: 'reference', ref: 'lib-cfg-1' } as never, 'best-effort'))
      .toBeUndefined();
  });
});
