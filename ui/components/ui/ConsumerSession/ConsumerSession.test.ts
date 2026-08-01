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
  Message,
  PauseResponse,
  ResumeResponse,
  StartFromProgress,
} from '../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import { startFromProgressDisplayThreshold } from './StartFromProgress/StartFromProgress';

// nanoid@4 ships ESM only and jest does not transform node_modules, so importing ConsumerSession
// (which uses it purely to name the consumer/subscription) would fail to parse. Nothing under test
// depends on the generated id.
jest.mock('nanoid', () => ({ nanoid: () => 'test-id' }));
// Same story for mermaid (ESM-only, pulled in far away through the library item editor's markdown
// preview). Neither library is exercised by these tests.
jest.mock('mermaid', () => ({ __esModule: true, default: { initialize: () => undefined } }));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SWRConfig } from 'swr';
import ConsumerSession, { handleResumeResponse, pauseConsumer } from './ConsumerSession';
import { getDefaultManagedItem } from '../LibraryBrowser/default-library-items';

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
  it('surfaces a skip that is big enough to be worth explaining', () => {
    const sinks = makeSinks();

    handleResumeResponse(makeResumeWithProgress({ skipped: 2_000_000, toSkip: 10_000_000 }), sinks);

    expect(lastProgress(sinks)).toEqual({ messagesSkipped: 2_000_000, messagesToSkip: 10_000_000 });
  });

  it('stays quiet for a skip that resolves fast enough not to need a UI', () => {
    const sinks = makeSinks();

    // Exactly at the threshold is still "small" - the requirement is EXCEEDS 1,000,000.
    handleResumeResponse(makeResumeWithProgress({ skipped: 10, toSkip: startFromProgressDisplayThreshold }), sinks);
    expect(lastProgress(sinks)).toBeUndefined();

    handleResumeResponse(makeResumeWithProgress({ skipped: 10, toSkip: 500 }), sinks);
    expect(lastProgress(sinks)).toBeUndefined();

    // One message over the line, and it is worth showing.
    handleResumeResponse(
      makeResumeWithProgress({ skipped: 10, toSkip: startFromProgressDisplayThreshold + 1 }),
      sinks
    );
    expect(lastProgress(sinks)).toEqual({
      messagesSkipped: 10,
      messagesToSkip: startFromProgressDisplayThreshold + 1,
    });
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
  it('renders a visible error instead of unmounting the app', () => {
    // A config the top-level shape check accepts, whose TARGET is a foreign persisted item - the
    // per-target editor then throws mid-render. The route must not end up as an empty document.
    const libraryContext = {
      pulsarResource: {
        type: 'topic' as const,
        tenant: 'public',
        namespace: 'default',
        topicPersistency: 'persistent' as const,
        topic: 'a-topic',
      },
    };
    const config = getDefaultManagedItem('consumer-session-config', libraryContext);
    const foreignTarget = getDefaultManagedItem('message-filter', libraryContext);
    const broken = {
      ...config,
      spec: { ...(config as { spec: Record<string, unknown> }).spec, targets: [{ type: 'value', val: foreignTarget }] },
    };

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
