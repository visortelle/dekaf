/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node"]}
 *
 * The play/pause/resume button's disabled logic. An unconvertible stored config (no runtime config)
 * must block only the transition that BUILDS a session from it - Play from `new`. Pause (`running` ->
 * `pausing`) and Resume (`paused` -> `running`) are name-only RPCs that never touch the runtime
 * config, so an unusable config must NOT strand a live session with Stop (which throws away the
 * loaded messages) as its only move.
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as Modals from '../../../app/contexts/Modals/Modals';
import Toolbar from './Toolbar';
import { SessionState, ConsumerSessionConfig } from '../types';

const renderToolbar = (sessionState: SessionState, config: ConsumerSessionConfig | undefined) => {
  render(
    <MemoryRouter>
      <Modals.DefaultProvider>
        <Toolbar
        sessionState={sessionState}
        config={config}
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

const playButton = () => screen.getByTestId('cs-play') as HTMLButtonElement;

// A defined config is "usable"; Toolbar only reads whether it is undefined.
const usableConfig = {} as ConsumerSessionConfig;

describe('an unusable (undefined) config disables only the build-from-config transition', () => {
  afterEach(cleanup);

  it('disables Play from `new`, which is the only state that builds a session from config', () => {
    renderToolbar('new', undefined);
    expect(playButton().disabled).toBe(true);
  });

  it('keeps Pause enabled while running - pausing does not consume the config', () => {
    renderToolbar('running', undefined);
    expect(playButton().disabled).toBe(false);
  });

  it('keeps Resume enabled while paused - resuming does not consume the config', () => {
    renderToolbar('paused', undefined);
    expect(playButton().disabled).toBe(false);
  });
});

describe('a usable config leaves the ordinary transitions enabled', () => {
  afterEach(cleanup);

  it('enables Play from `new`', () => {
    renderToolbar('new', usableConfig);
    expect(playButton().disabled).toBe(false);
  });

  it('enables Pause while running', () => {
    renderToolbar('running', usableConfig);
    expect(playButton().disabled).toBe(false);
  });

  it('enables Resume while paused', () => {
    renderToolbar('paused', usableConfig);
    expect(playButton().disabled).toBe(false);
  });
});

describe('the transient states have no action, config aside', () => {
  afterEach(cleanup);

  it.each([['initializing'], ['pausing']] as const)('disables the button in %s', (state) => {
    renderToolbar(state, usableConfig);
    expect(playButton().disabled).toBe(true);
  });
});
