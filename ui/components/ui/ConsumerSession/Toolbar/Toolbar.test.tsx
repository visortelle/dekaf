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
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as Modals from '../../../app/contexts/Modals/Modals';
import Toolbar from './Toolbar';
import { SessionState, ConsumerSessionConfig } from '../types';

const renderToolbar = (
  sessionState: SessionState,
  config: ConsumerSessionConfig | undefined,
  onToggleConsoleClick = jest.fn(),
  overrides: Partial<React.ComponentProps<typeof Toolbar>> = {}
) => {
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
        orderingLateDeliveries={0}
        orderingActive={false}
        orderingWaitingStreams={0}
        orderKeyFallbacks={0}
        replaySeamViolations={0}
        onToggleConsoleClick={onToggleConsoleClick}
        searchInResults=""
        onSearchInResultsChange={jest.fn()}
        numFoundInResults={0}
        {...overrides}
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

describe('the More tools control', () => {
  afterEach(cleanup);

  it('uses the user-facing name and invokes the panel toggle', () => {
    const onToggle = jest.fn();
    renderToolbar('new', usableConfig, onToggle);

    const button = screen.getByTestId('cs-tools');
    expect(button.textContent).toContain('More tools');
    fireEvent.click(button);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe('the delivery-order status', () => {
  afterEach(cleanup);

  const orderedConfig = (
    messageDeliveryOrder: 'guaranteed' | 'best-effort',
    deliveryOrderKey?: 'publish-time' | 'broker-publish-time' | 'event-time'
  ) => ({ messageDeliveryOrder, deliveryOrderKey } as ConsumerSessionConfig);

  // 2026-08-11 (owner instruction): the always-visible mode label ("Best effort · Publish time")
  // and its contract tooltip were REMOVED from the bar - the mode is configuration, documented at
  // the config's help circles. What the bar still owes a session: the stall disclosure with its
  // escape, the order-key fallbacks, and the out-of-order WARNING MARK beside the loaded count.

  it('shows no ordering status at all while an ordered run has nothing to disclose', () => {
    renderToolbar('running', orderedConfig('guaranteed'), jest.fn(), { orderingActive: true });

    expect(screen.queryByTestId('cs-order-chip')).toBeNull();
    expect(screen.queryByTestId('cs-order-warning')).toBeNull();
  });

  it('marks out-of-order deliveries beside the loaded count under Best effort, counting the LATE counter', () => {
    renderToolbar('running', orderedConfig('best-effort', 'event-time'), jest.fn(), {
      orderingActive: true,
      messagesLoaded: 120,
      orderingLateDeliveries: 3,
    });

    const warning = screen.getByTestId('cs-order-warning');
    const html = warning.getAttribute('data-tooltip-html') ?? '';
    // The count leads, in bold; the cause in plain words; the window named.
    expect(html).toContain('<strong>3</strong>');
    expect(html).toContain('arrived late');
    expect(html).toContain('Nothing is lost');
    expect(html).toContain('~0.75 s');
  });

  it('marks out-of-order rows under Guaranteed, counting the SEAM counter - never both counters', () => {
    // The server ticks lateEmissions and seamViolations on the identical guaranteed commit-phase
    // condition; the mark must count each violation once, and say causes delivery did not add.
    renderToolbar('running', orderedConfig('guaranteed'), jest.fn(), {
      orderingActive: true,
      orderingLateDeliveries: 3,
      replaySeamViolations: 2,
    });

    const warning = screen.getByTestId('cs-order-warning');
    const html = warning.getAttribute('data-tooltip-html') ?? '';
    expect(html).toContain('<strong>2</strong>');
    expect(html).toContain('did not reorder them');
    // The common real-world cause is NAMED, not alluded to: several producers, own clocks.
    expect(html).toContain('several producers');
    expect(html).toContain('stamps its own clock');
    expect(html).toContain('marked with');
  });

  it('claims nothing at zero - the mark exists only when a violation happened', () => {
    renderToolbar('running', orderedConfig('guaranteed'), jest.fn(), {
      orderingActive: true,
      replaySeamViolations: 0,
      orderingLateDeliveries: 0,
    });

    expect(screen.queryByTestId('cs-order-warning')).toBeNull();
  });

  it('shows a sustained wait as the status area, without any mode label around it', () => {
    // The waiting disclosure survives the label removal for its documented corner: a stream a
    // time seek positioned past its end can still hold the merge, and the bar must say so.
    renderToolbar('running', orderedConfig('guaranteed'), jest.fn(), {
      orderingActive: true,
      orderingWaitingStreams: 2
    });

    const chip = screen.getByTestId('cs-order-chip');
    expect(screen.getByTestId('cs-order-waiting').textContent).toContain('waiting for 2 topics/partitions');
    expect(chip.textContent).not.toContain('Replaying history');
    expect(chip.textContent).not.toContain('Best effort');
  });

  it('shows publish-time fallbacks in plain language', () => {
    renderToolbar('running', orderedConfig('best-effort', 'event-time'), jest.fn(), {
      orderingActive: true,
      orderKeyFallbacks: 2,
    });

    expect(screen.getByTestId('cs-order-key-fallbacks').textContent).toContain('2 used publish time');
  });

  it('shows no status for fastest delivery, which discloses nothing and warns of nothing', () => {
    renderToolbar('running', { messageDeliveryOrder: 'as-received' } as ConsumerSessionConfig, jest.fn(), {
      orderingActive: true
    });

    expect(screen.queryByTestId('cs-order-chip')).toBeNull();
    expect(screen.queryByTestId('cs-order-warning')).toBeNull();
  });
});

describe('a disclosed Guaranteed stall is actionable from the chip itself', () => {
  afterEach(cleanup);

  const stalled = { messageDeliveryOrder: 'guaranteed' } as ConsumerSessionConfig;

  it('switches the session to Best effort in one click, without opening configuration', () => {
    const onDeliveryOrderChange = jest.fn();
    renderToolbar('running', stalled, jest.fn(), {
      orderingActive: true,
      orderingWaitingStreams: 3,
      onDeliveryOrderChange
    });

    fireEvent.click(screen.getByTestId('cs-order-switch-best-effort'));

    expect(onDeliveryOrderChange).toHaveBeenCalledTimes(1);
    expect(onDeliveryOrderChange).toHaveBeenCalledWith('best-effort');
  });

  it('names the escape in the user\'s terms, next to the wait it ends', () => {
    renderToolbar('running', stalled, jest.fn(), {
      orderingActive: true,
      orderingWaitingStreams: 3,
      onDeliveryOrderChange: jest.fn()
    });

    const chip = screen.getByTestId('cs-order-chip');
    expect(chip.textContent).toContain('waiting for 3 topics/partitions');
    expect(screen.getByTestId('cs-order-switch-best-effort').textContent).toContain('Continue with Best effort');
  });

  it('offers nothing while Guaranteed is merging normally - there is no stall to escape', () => {
    renderToolbar('running', stalled, jest.fn(), {
      orderingActive: true,
      orderingWaitingStreams: 0,
      onDeliveryOrderChange: jest.fn()
    });

    expect(screen.queryByTestId('cs-order-switch-best-effort')).toBeNull();
  });

  it('offers nothing in Best effort, which is already the mode the switch selects', () => {
    renderToolbar('running', { messageDeliveryOrder: 'best-effort' } as ConsumerSessionConfig, jest.fn(), {
      orderingActive: true,
      orderingWaitingStreams: 3,
      onDeliveryOrderChange: jest.fn()
    });

    expect(screen.queryByTestId('cs-order-switch-best-effort')).toBeNull();
  });

  it('offers nothing when no caller can apply the change - a dead control is worse than none', () => {
    renderToolbar('running', stalled, jest.fn(), {
      orderingActive: true,
      orderingWaitingStreams: 3
    });

    expect(screen.getByTestId('cs-order-waiting')).toBeTruthy();
    expect(screen.queryByTestId('cs-order-switch-best-effort')).toBeNull();
  });
});
