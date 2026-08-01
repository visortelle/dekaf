/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node"]}
 *
 * The Topic Positions tab as a component, now built on the shared Table: what it polls, when it
 * polls at all, and what it renders for each answer. The loader's TRANSITIONS (keep-last-good,
 * error recovery, vanished session) are pinned in topic-positions.spec.ts against the extracted
 * loader; here the wiring is pinned - gating by tab visibility and session state, the deadline
 * on the RPC, the aggregate row reaching the screen.
 */
const mockClients = { current: undefined as unknown };
jest.mock('../../../../app/contexts/GrpcClient/GrpcClient', () => ({
  useContext: () => mockClients.current
}));

// react-virtuoso (inside the shared Table) measures itself with ResizeObserver, which jsdom does
// not provide. A no-op stand-in is enough: nothing here asserts on measured sizes.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver =
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver ?? ResizeObserverStub;

import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import TopicPositions from './TopicPositions';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';

// With jest.mock in the file, esbuild-jest runs babel's hoisting over untyped JS, so imported
// bindings must not appear in type annotations here (the lifecycle suite documents the same
// constraint) - hence the inlined literal union instead of the imported SessionState.
type SessionStateLiteral = 'new' | 'initializing' | 'running' | 'pausing' | 'paused';

const statusOf = (code: number, message = '') => ({
  getCode: () => code,
  getMessage: () => message
});

type FakePosition = {
  getTopicFqn: () => string;
  getFirstMessageId: () => undefined;
  getFirstPublishTime: () => { getValue: () => number } | undefined;
  getLastMessageId: () => undefined;
  getLastPublishTime: () => { getValue: () => number } | undefined;
  getCursorMessageId: () => undefined;
  getCursorPublishTime: () => { getValue: () => number } | undefined;
  getCursorTimeFraction: () => undefined;
  getCursorEntryFraction: () => undefined;
  getCursorEntryOrdinal: () => { getValue: () => number } | undefined;
  getRetainedEntries: () => { getValue: () => number } | undefined;
  getUnavailableReason: () => undefined;
};

const position = (fqn: string, over: { first?: number; last?: number; cursor?: number; ordinal?: number; retained?: number } = {}): FakePosition => ({
  getTopicFqn: () => fqn,
  getFirstMessageId: () => undefined,
  getFirstPublishTime: () => (over.first === undefined ? undefined : { getValue: () => over.first as number }),
  getLastMessageId: () => undefined,
  getLastPublishTime: () => (over.last === undefined ? undefined : { getValue: () => over.last as number }),
  getCursorMessageId: () => undefined,
  getCursorPublishTime: () => (over.cursor === undefined ? undefined : { getValue: () => over.cursor as number }),
  getCursorTimeFraction: () => undefined,
  getCursorEntryFraction: () => undefined,
  getCursorEntryOrdinal: () => (over.ordinal === undefined ? undefined : { getValue: () => over.ordinal as number }),
  getRetainedEntries: () => (over.retained === undefined ? undefined : { getValue: () => over.retained as number }),
  getUnavailableReason: () => undefined
});

const answer = (code: number, message: string, positions: FakePosition[]) => ({
  getStatus: () => statusOf(code, message),
  getPositionsList: () => positions
});

const withClient = (getTopicPositions: jest.Mock) => {
  mockClients.current = { consumerServiceClient: { getTopicPositions } };
  return getTopicPositions;
};

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const renderTab = async (sessionState: SessionStateLiteral, isVisible = true) => {
  await act(async () => {
    render(
      // A FRESH SWR cache per test: the Table polls through useSWR, and a shared cache would leak
      // one test's rows into the next.
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, revalidateOnFocus: false }}>
        <TopicPositions consumerName="__dekaf_test" sessionState={sessionState as never} isVisible={isVisible} />
      </SWRConfig>
    );
  });
};

describe('when the tab may not poll', () => {
  it('session not started: no RPC at all - nothing exists to ask about', async () => {
    // The poll is simply not armed before Play, which is cheaper than polling into a server
    // refusal and cannot leak an internal session name.
    const rpc = withClient(jest.fn());
    await renderTab('new');

    expect(screen.getByTestId('topic-positions-not-started')).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('hidden tab: no polling - only the tab on screen pays the broker cost', async () => {
    const rpc = withClient(jest.fn());
    await renderTab('running', false);

    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('a polling tab', () => {
  it('renders every topic plus the ALL TOPICS aggregate, and asks with a DEADLINE', async () => {
    const rpc = withClient(
      jest.fn().mockResolvedValue(
        answer(Code.OK, '', [
          position('persistent://t/n/a', { first: 1000, last: 2000, cursor: 1500, ordinal: 5, retained: 10 }),
          position('persistent://t/n/b', { first: 1200, last: 2400, cursor: 1300, ordinal: 2, retained: 10 })
        ])
      )
    );
    await renderTab('running');

    // Virtuoso does not lay rows out in a zero-height jsdom viewport, so the ROWS are the e2e
    // suite's job (CS-TP-3/6 assert them against a real browser). What jsdom CAN pin is the
    // Table's own accounting: two topics PLUS the aggregate = 3, proving the aggregate was
    // prepended and the data arrived.
    // The count is split across <strong> elements, so match on the flattened text.
    await waitFor(() => expect(document.body.textContent).toContain('3 of 3 topics'));

    // The deadline is what keeps one hung RPC from wedging the poll forever.
    const opts = rpc.mock.calls[0][1];
    expect(opts?.deadline).toBeDefined();
  });

  it('a session that vanished mid-run empties the table without a crash or an error banner', async () => {
    withClient(jest.fn().mockResolvedValue(answer(Code.FAILED_PRECONDITION, 'no such session', [])));
    await renderTab('running');

    await waitFor(() => expect(screen.queryByTestId('topic-positions-error')).toBeNull());
    expect(document.body.textContent).not.toContain('no such session');
  });

  it('a transport failure surfaces as the stale-data banner, not a throw', async () => {
    withClient(jest.fn().mockRejectedValue(new Error('connection refused')));
    await renderTab('running');

    await waitFor(() => expect(screen.getByTestId('topic-positions-error')).toBeTruthy());
    expect(screen.getByTestId('topic-positions-error').textContent).toContain('connection refused');
    expect(screen.getByTestId('topic-positions-error').textContent).toContain('showing the last data');
  });
});
