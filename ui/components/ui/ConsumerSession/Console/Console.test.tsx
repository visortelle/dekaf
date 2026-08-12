/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node"]}
 */
jest.mock('./Producer/Producer', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-producer">Produce content</div>
}));
jest.mock('./TopicPositions/TopicPositions', () => ({
  __esModule: true,
  default: (props: { isVisible: boolean }) => props.isVisible ? <div data-testid="mock-topic-positions" /> : null
}));
jest.mock('./ContextRepl/ContextRepl', () => ({
  __esModule: true,
  default: (props: { isVisible: boolean }) => props.isVisible ? <div data-testid="mock-repl" /> : null
}));
jest.mock('./ContextLogs/ContextLogs', () => ({
  __esModule: true,
  default: (props: { isVisible: boolean }) => props.isVisible ? <div data-testid="mock-logs" /> : null
}));

import React from 'react';
import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Console from './Console';
import { localStorageKeys } from '../../../local-storage-keys';

const topicContext = {
  pulsarResource: {
    type: 'topic' as const,
    tenant: 'public',
    namespace: 'default',
    topicPersistency: 'persistent' as const,
    topic: 'events'
  }
};

const namespaceContext = {
  pulsarResource: {
    type: 'namespace' as const,
    tenant: 'public',
    namespace: 'default'
  }
};

const props = (overrides: Record<string, unknown> = {}) => ({
  isShow: true,
  onClose: jest.fn(),
  sessionKey: 0,
  sessionSubscriptionName: 'subscription',
  sessionConfig: {} as never,
  sessionState: 'new' as const,
  onSessionStateChange: jest.fn(),
  messages: [],
  consumerName: 'consumer',
  currentTopic: 'persistent://public/default/events',
  libraryContext: topicContext,
  onResizeStart: jest.fn(),
  ...overrides
});

describe('More tools interactions and selected-tab persistence', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('opens on Topic Positions, remembers an interactive tab selection, and restores it on remount', () => {
    const first = render(<Console {...props()} />);
    expect(screen.getByTestId('mock-topic-positions')).toBeVisible();

    fireEvent.click(screen.getByTestId('console-tab-logs'));
    expect(screen.getByTestId('mock-logs')).toBeVisible();
    expect(window.localStorage.getItem(localStorageKeys.consumerSessionToolsTab)).toBe('"context-logs"');

    first.unmount();
    render(<Console {...props()} />);
    expect(screen.getByTestId('mock-logs')).toBeVisible();
  });

  it('falls back safely and heals storage when a saved tab no longer exists', async () => {
    window.localStorage.setItem(localStorageKeys.consumerSessionToolsTab, JSON.stringify('removed-in-a-new-version'));

    render(<Console {...props()} />);

    expect(screen.getByTestId('mock-topic-positions')).toBeVisible();
    await waitFor(() => {
      expect(window.localStorage.getItem(localStorageKeys.consumerSessionToolsTab)).toBe('"topic-positions"');
    });
  });

  it('temporarily falls back from Produce where that tab is unavailable without erasing the preference', () => {
    window.localStorage.setItem(localStorageKeys.consumerSessionToolsTab, JSON.stringify('producer'));

    const first = render(<Console {...props({ libraryContext: namespaceContext, currentTopic: undefined })} />);
    expect(screen.getByTestId('mock-topic-positions')).toBeVisible();
    expect(window.localStorage.getItem(localStorageKeys.consumerSessionToolsTab)).toBe('"producer"');

    first.unmount();
    render(<Console {...props()} />);
    expect(screen.getByTestId('mock-producer')).toBeVisible();
  });

  it('closes from the top-right cross', () => {
    const onClose = jest.fn();
    render(<Console {...props({ onClose })} />);

    fireEvent.click(screen.getByTestId('cs-tools-close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not expose the close or active debug content while the panel is closed', () => {
    window.localStorage.setItem(localStorageKeys.consumerSessionToolsTab, JSON.stringify('context-logs'));
    render(<Console {...props({ isShow: false })} />);

    expect(screen.queryByTestId('cs-tools-close')).toBeNull();
    expect(screen.queryByTestId('mock-logs')).toBeNull();
  });
});
