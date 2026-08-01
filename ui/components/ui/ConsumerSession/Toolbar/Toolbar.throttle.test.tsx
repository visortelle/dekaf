/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node"]}
 *
 * The two browser-wide delivery controls in the toolbar: "msg/s limit" and "pause after". Both are
 * DRAFT-COMMITTED localStorage values - keystrokes edit a draft, only blur/Enter commits - so what
 * these tests pin is the commit boundary: what reaches storage, and what can never reach it.
 */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as Modals from '../../../app/contexts/Modals/Modals';
import Toolbar from './Toolbar';
import { ConsumerSessionConfig, SessionState } from '../types';
import { localStorageKeys } from '../../../local-storage-keys';

const renderToolbar = (sessionState: SessionState = 'new') => {
  render(
    <MemoryRouter>
      <Modals.DefaultProvider>
        <Toolbar
          sessionState={sessionState}
          config={{} as ConsumerSessionConfig}
          messages={[]}
          onSessionStateChange={jest.fn()}
          onStopSession={jest.fn()}
          messagesLoaded={0}
          messagesProcessed={0}
          messagesLoadedPerSecond={{ prev: 0, now: 0 }}
          messagesProcessedPerSecond={{ prev: 0, now: 0 }}
          onToggleConsoleClick={jest.fn()}
          searchInResults=""
          onSearchInResultsChange={jest.fn()}
          numFoundInResults={0}
        />
      </Modals.DefaultProvider>
    </MemoryRouter>
  );
};

const rateInput = () => screen.getByTestId('cs-rate-limit') as HTMLInputElement;
const pauseInput = () => screen.getByTestId('cs-pause-after') as HTMLInputElement;
const stored = (key: string) => window.localStorage.getItem(key);

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('the delivery controls commit to localStorage', () => {
  it('typing a number and leaving the field commits it', () => {
    renderToolbar();
    fireEvent.change(rateInput(), { target: { value: '250' } });
    // Storage still holds the mounted default mid-edit - a half-typed "2" must never become a
    // live 2 msg/s limit. (The hook persists its default on mount, so "unset" reads as '0'.)
    expect(stored(localStorageKeys.consumerSessionRateLimit)).toBe('0');
    fireEvent.blur(rateInput());
    expect(stored(localStorageKeys.consumerSessionRateLimit)).toBe('250');
  });

  it('Enter commits too', () => {
    renderToolbar();
    fireEvent.change(pauseInput(), { target: { value: '100' } });
    fireEvent.keyDown(pauseInput(), { key: 'Enter' });
    fireEvent.blur(pauseInput());
    expect(stored(localStorageKeys.consumerSessionPauseAfterLoaded)).toBe('100');
  });

  it('invalid text is REJECTED wholesale, never repaired into a different number', () => {
    // Stripping used to turn a pasted "1.5" into 15 and "1e3" into 13 - a number the user never
    // typed. Rejection keeps whatever was there before.
    renderToolbar();
    fireEvent.change(rateInput(), { target: { value: '250' } });
    fireEvent.change(rateInput(), { target: { value: '1e5-2.7' } });
    expect(rateInput().value).toBe('250');
    fireEvent.change(rateInput(), { target: { value: '1.5' } });
    expect(rateInput().value).toBe('250');
  });

  it('a committed value is capped at the operational ceiling', () => {
    renderToolbar();
    fireEvent.change(rateInput(), { target: { value: '9999999999' } });
    fireEvent.blur(rateInput());
    expect(stored(localStorageKeys.consumerSessionRateLimit)).toBe('1000000000');
  });

  it('clearing the field commits 0 - the explicit OFF', () => {
    window.localStorage.setItem(localStorageKeys.consumerSessionRateLimit, '250');
    renderToolbar();
    expect(rateInput().value).toBe('250');
    fireEvent.change(rateInput(), { target: { value: '' } });
    fireEvent.blur(rateInput());
    expect(stored(localStorageKeys.consumerSessionRateLimit)).toBe('0');
    expect(rateInput().placeholder).toBe('off');
  });

  it('initializes from what an earlier session stored', () => {
    window.localStorage.setItem(localStorageKeys.consumerSessionPauseAfterLoaded, '42');
    renderToolbar();
    expect(pauseInput().value).toBe('42');
  });
});
