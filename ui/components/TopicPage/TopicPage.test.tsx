/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node"]}
 *
 * Which topic the page's children belong to.
 *
 * Pulsar allows `persistent://t/n/x` and `non-persistent://t/n/x` to exist at the same time: two
 * different topics whose tenant, namespace and name are identical. The route carries the scheme, so
 * navigating from one to the other changes NOTHING else about this page - and a child keyed only by
 * tenant/namespace/name is not remounted, so it keeps consuming the topic the user just left.
 *
 * Only the transport is replaced; the page, its router and the consumer session are real.
 *
 * Note: with a jest.mock() in the file, esbuild-jest runs babel's hoisting pass over untyped JS, so
 * imported bindings must not appear in type annotations here (inference only).
 */
jest.mock('nanoid', () => ({ nanoid: () => 'test-id' }));
jest.mock('mermaid', () => ({ __esModule: true, default: { initialize: () => undefined } }));

const mockClients = { current: undefined as unknown };
jest.mock('../app/contexts/GrpcClient/GrpcClient', () => ({
  useContext: () => mockClients.current,
}));

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { SWRConfig } from 'swr';
import TopicPage from './TopicPage';
import { Status } from '../../grpc-web/google/rpc/status_pb';
import { Code } from '../../grpc-web/google/rpc/code_pb';

const okStatus = () => {
  const s = new Status();
  s.setCode(Code.OK);
  s.setMessage('');
  return s;
};

const installClients = () => {
  mockClients.current = {
    topicServiceClient: {
      getIsPartitionedTopic: () =>
        Promise.resolve({
          getStatus: () => okStatus(),
          getIsPartitioned: () => false,
          getPartitionsCount: () => undefined,
          getActivePartitionsCount: () => undefined,
        }),
    },
    consumerServiceClient: {
      createConsumer: () => new Promise(() => undefined),
      resume: () => ({ on: () => undefined, removeListener: () => undefined, cancel: () => undefined }),
      pause: () => new Promise(() => undefined),
      deleteConsumer: () => Promise.resolve({ getStatus: () => okStatus() }),
      resolveTopicSelector: () => Promise.reject(new Error('not used by these tests')),
    },
    producerServiceClient: {
      createProducer: () => Promise.resolve({ getStatus: () => okStatus() }),
      deleteProducer: () => Promise.resolve({ getStatus: () => okStatus() }),
      send: () => Promise.resolve({ getStatus: () => okStatus() }),
    },
    libraryServiceClient: {
      listLibraryItems: () => Promise.reject(new Error('no library in these tests')),
      getLibraryItem: () => Promise.reject(new Error('no library in these tests')),
    },
  };
};

const page = (topicPersistency: 'persistent' | 'non-persistent') => (
  <SWRConfig value={{ shouldRetryOnError: false, refreshInterval: 0, revalidateOnFocus: false }}>
    <HelmetProvider>
    <MemoryRouter initialEntries={[`/tenants/public/namespaces/default/topics/${topicPersistency}/a-topic/consumer-session`]}>
      <TopicPage
        view={{ type: 'consumer-session' }}
        tenant="public"
        namespace="default"
        topic="a-topic"
        topicPersistency={topicPersistency}
      />
    </MemoryRouter>
    </HelmetProvider>
  </SWRConfig>
);

describe('navigating between the two topics that differ only in their scheme', () => {
  it('starts a new consumer session rather than keeping the previous topic\'s one', async () => {
    installClients();

    let rerender: any;
    await act(async () => {
      ({ rerender } = render(page('persistent')));
    });

    const before = screen.getByTestId('cs-session');
    // The session identifies itself; a remount produces a different element.
    (before as any).__markedByThisTest = true;

    await act(async () => {
      rerender(page('non-persistent'));
    });

    const after = screen.getByTestId('cs-session');
    expect((after as any).__markedByThisTest).toBeUndefined();
  });

  it('keeps the same session while the topic does not change', async () => {
    installClients();

    let rerender: any;
    await act(async () => {
      ({ rerender } = render(page('persistent')));
    });

    const before = screen.getByTestId('cs-session');
    (before as any).__markedByThisTest = true;

    await act(async () => {
      rerender(page('persistent'));
    });

    expect((screen.getByTestId('cs-session') as any).__markedByThisTest).toBe(true);
  });
});
