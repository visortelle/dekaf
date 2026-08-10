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

  // Guaranteed's chip reads as the replay it is (the 2026-08-09 redesign), never as a live wait.
  it.each([
    ['guaranteed', undefined, 'Replaying history - exact order · Publish time'],
    ['guaranteed', 'broker-publish-time', 'Replaying history - exact order · Broker publish time'],
    ['best-effort', 'event-time', 'Best effort · Event time']
  ] as const)('names %s with the selected time', (mode, time, expected) => {
    renderToolbar('running', orderedConfig(mode, time), jest.fn(), { orderingActive: true });

    expect(screen.getByTestId('cs-order-chip').textContent).toContain(expected);
  });

  it('treats an omitted legacy value as the Best effort default, exactly like the server does', () => {
    // Owner decision (2026-08-09, direct instruction): the default is Best effort - supersedes
    // the review-findings P1.1 note that said Guaranteed.
    renderToolbar('running', {} as ConsumerSessionConfig, jest.fn(), { orderingActive: true });

    expect(screen.getByTestId('cs-order-chip').textContent).toContain('Best effort · Publish time');
  });

  it('explains the guaranteed replay and its unavoidable source disorder concisely', () => {
    // Re-aimed with the 2026-08-09 replay redesign: the old text promised an indefinite wait for
    // every stream, which is no longer the contract - Guaranteed replays recorded history and
    // pauses at its boundary.
    renderToolbar('running', orderedConfig('guaranteed'), jest.fn(), { orderingActive: true });

    expect(screen.getByTestId('cs-order-chip').getAttribute('title')).toBe(
      'Replays everything recorded up to Play (or the last Resume), of what retention still holds, ' +
      'in exact order of the selected timestamp, then pauses when caught up. Stored order within ' +
      'each stream is preserved, so timestamp reversals and redeliveries are counted as out of order.'
    );
  });

  it('explains best-effort ordering without implying that late messages are dropped', () => {
    renderToolbar('running', orderedConfig('best-effort'), jest.fn(), { orderingActive: true });

    expect(screen.getByTestId('cs-order-chip').getAttribute('title')).toBe(
      'Merges by the selected timestamp within ~0.75 s. Late messages may ' +
      'appear out of order; none are dropped.'
    );
  });

  it('shows publish-time fallbacks and late counts in plain language', () => {
    // Re-aimed with the 2026-08-09 seam-counter finding: under guaranteed the late counter ticks
    // on the SAME commit-phase inversions as the seam counter, so the late chip is best-effort's
    // gauge only - the guaranteed case is pinned by the double-count test below.
    renderToolbar('running', orderedConfig('best-effort', 'event-time'), jest.fn(), {
      orderingActive: true,
      orderKeyFallbacks: 2,
      orderingLateDeliveries: 3
    });

    expect(screen.getByTestId('cs-order-key-fallbacks').textContent).toContain('2 used publish time');
    expect(screen.getByTestId('cs-order-late').textContent).toContain('3 late');
  });

  it('never counts the same violation twice: guaranteed renders the seam chip, not the late chip', () => {
    // The server ticks lateEmissions and seamViolations on the identical guaranteed commit-phase
    // condition; rendering both chips would show one event twice with two causal labels.
    renderToolbar('running', orderedConfig('guaranteed'), jest.fn(), {
      orderingActive: true,
      orderingLateDeliveries: 3,
      replaySeamViolations: 3,
    });

    expect(screen.queryByTestId('cs-order-late')).toBeNull();
    expect(screen.getByTestId('cs-replay-seam-violations').textContent).toContain('3 out of order');
  });

  it('shows a sustained wait without changing the selected mode label', () => {
    // The waiting disclosure survives the replay redesign for its documented corner: a stream a
    // time seek positioned past its end can still hold the merge, and the chip must say so.
    renderToolbar('running', orderedConfig('guaranteed'), jest.fn(), {
      orderingActive: true,
      orderingWaitingStreams: 2
    });

    expect(screen.getByTestId('cs-order-chip').textContent).toContain('Replaying history - exact order · Publish time');
    expect(screen.getByTestId('cs-order-waiting').textContent).toContain('waiting for 2 topics/partitions');
  });

  it('does not claim ordering when a requested merge has no active ordering layer', () => {
    renderToolbar('running', orderedConfig('guaranteed'));
    expect(screen.queryByTestId('cs-order-chip')).toBeNull();
  });

  it('reads Guaranteed as a replay, not as a live wait', () => {
    // The replay redesign: Guaranteed delivers recorded history exactly and then pauses - the
    // chip must say that, and the old hold-forever wording must be gone with the behaviour.
    renderToolbar('running', orderedConfig('guaranteed'), jest.fn(), { orderingActive: true });

    const chip = screen.getByTestId('cs-order-chip');
    expect(chip.textContent).toContain('Replaying history - exact order');
    expect(chip.getAttribute('title')).toMatch(/replays everything recorded/i);
    expect(chip.getAttribute('title')).not.toMatch(/indefinitely/i);
  });

  it('shows the cross-seam violation count whenever the server confessed one', () => {
    renderToolbar('running', orderedConfig('guaranteed'), jest.fn(), {
      orderingActive: true,
      replaySeamViolations: 2,
    });

    const seam = screen.getByTestId('cs-replay-seam-violations');
    expect(seam.textContent).toContain('2');
    // Re-aimed 2026-08-09: the chip label stays short; the tooltip names BOTH causes the proto
    // does (pause-window clock skew OR an inversion stored in the source log itself).
    expect(seam.textContent).toMatch(/out of order/i);
    expect(seam.getAttribute('title')).toMatch(/pause window/i);
    expect(seam.getAttribute('title')).toMatch(/source log itself stores an inversion/i);
  });

  it('claims no seam violations at zero', () => {
    renderToolbar('running', orderedConfig('guaranteed'), jest.fn(), {
      orderingActive: true,
      replaySeamViolations: 0,
    });

    expect(screen.queryByTestId('cs-replay-seam-violations')).toBeNull();
  });

  it('does not show an ordering chip for fastest delivery', () => {
    renderToolbar('running', { messageDeliveryOrder: 'as-received' } as ConsumerSessionConfig, jest.fn(), {
      orderingActive: true
    });

    expect(screen.queryByTestId('cs-order-chip')).toBeNull();
  });
});

/**
 * Guaranteed - an explicit choice, since the product default is Best effort - waits forever on a
 * silent stream by design. Disclosing the wait is not enough: the same chip that reports the
 * stall has to be able to END it, or the choice is a dead end that reads like an empty topic. The
 * switch is offered exactly where the stall is disclosed, and nowhere else.
 */
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
