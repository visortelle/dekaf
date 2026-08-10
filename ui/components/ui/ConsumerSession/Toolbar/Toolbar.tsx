import React from 'react';
import useLocalStorage from 'use-local-storage-state';
import s from './Toolbar.module.css'
import pauseIcon from './icons/pause.svg';
import resumeIcon from './icons/resume.svg';
import resetIcon from './icons/reset.svg';
import consoleIcon from './icons/console.svg';
import * as I18n from '../../../app/contexts/I18n/I18n';
import { SessionState, ConsumerSessionConfig, MessageDescriptor, MessageDeliveryOrder } from '../types';
import SmallButton from '../../SmallButton/SmallButton';
import Input from '../../Input/Input';
import ExportMessagesButton from './ExportMessagesButton/ExportMessagesButton';
import { tooltipId } from '../../Tooltip/Tooltip';
import { localStorageKeys } from '../../../local-storage-keys';

/**
 * A small non-negative integer input committed on blur or Enter, with 0 meaning "off".
 *
 * DRAFT-COMMITTED, like the other numeric inputs in the session config: keystrokes edit a local
 * draft, and only a valid commit reaches storage - so a half-typed value can never become the
 * live setting, and an invalid one reverts to what was there before.
 */
export const DeliveryControlInput: React.FC<{
  testId: string;
  caption: string;
  title: string;
  value: number;
  onCommit: (n: number) => void;
}> = (props) => {
  const [draft, setDraft] = React.useState<string>(props.value > 0 ? String(props.value) : '');

  // An external change (another tab via the storage event, or a reset) replaces the draft - the
  // input shows the live value whenever the user is not mid-edit.
  React.useEffect(() => {
    setDraft(props.value > 0 ? String(props.value) : '');
  }, [props.value]);

  // Above this, "messages per second" and "messages to load" stop meaning anything - and the
  // wire carries an int64, so the ceiling also keeps the value inside every representation.
  const maxCommittable = 1_000_000_000;

  const commit = () => {
    // Digits only ever enter the draft (invalid text is REJECTED wholesale below, not stripped
    // into a different number), so the only invalid draft is the empty string - the explicit off.
    const parsed = draft === '' ? 0 : Number.parseInt(draft, 10);
    const next = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maxCommittable) : 0;
    setDraft(next > 0 ? String(next) : '');
    props.onCommit(next);
  };

  return (
    <div className={s.DeliveryControl} data-tooltip-id={tooltipId} data-tooltip-html={props.title}>
      <input
        className={s.DeliveryControlInput}
        data-testid={props.testId}
        value={draft}
        placeholder="off"
        inputMode="numeric"
        onChange={(e) => {
          // REJECT invalid text, never repair it: stripping turned a pasted "1.5" into 15 and
          // "1e3" into 13 - a different number than the user gave, silently.
          const next = e.target.value;
          if (/^[0-9]{0,10}$/.test(next)) {
            setDraft(next);
          }
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      <span className={s.DeliveryControlCaption}>{props.caption}</span>
    </div>
  );
};

export type ToolbarProps = {
  sessionState: SessionState;
  config: ConsumerSessionConfig | undefined;
  messages: MessageDescriptor[];
  onSessionStateChange: (state: SessionState) => void;
  onStopSession: () => void;
  messagesLoaded: number;
  messagesProcessed: number;
  messagesLoadedPerSecond: { prev: number, now: number };
  messagesProcessedPerSecond: { prev: number, now: number };
  onToggleConsoleClick: () => void;
  searchInResults: string,
  onSearchInResultsChange: (v: string) => void,
  numFoundInResults: number,
  /** How many messages the ordering layer emitted out of the selected-time order so far -
   * best-effort mode's honest quality gauge (clock skew past the reorder window, retries). Under
   * guaranteed the chip is NOT rendered: the server ticks this counter and the seam counter on
   * the same commit-phase inversions, so showing both would count each event twice. */
  orderingLateDeliveries: number,
  /** Whether the server actually RUNS an ordering layer for this session. A single-stream
   * session builds none and pays no reorder latency, whatever the config asked - the chip must
   * not claim otherwise. */
  orderingActive: boolean,
  /** Topic/partition streams that have held delivery past the server's warning interval. Under
   * the replay design this is the documented time-seek corner (a stream the seek positioned past
   * its end); the disclosure and its escape stay for it. */
  orderingWaitingStreams: number,
  /** Messages that used publish time because the selected time was absent. */
  orderKeyFallbacks: number,
  /** Ordering violations the guaranteed replay delivered flagged: a producer clock wrote an
   * earlier timestamp into a pause window, or the source log itself stores an inversion (the
   * proto names both causes). Monotonic per session. */
  replaySeamViolations: number,
  /** Switches THIS session's delivery order, applied by whoever owns the session configuration.
   *
   * A Guaranteed stream that a time seek positioned past its end can hold the merge (the
   * documented stall corner), so disclosing the wait is not enough - the same chip that reports
   * the stall has to be able to end it. When no caller can apply the change the control is not
   * rendered at all: a button that does nothing is worse than no button. */
  onDeliveryOrderChange?: (order: MessageDeliveryOrder) => void,
};

const Toolbar: React.FC<ToolbarProps> = (props) => {
  const i18n = I18n.useContext();

  // Browser-wide delivery controls, NOT session config: both live in localStorage and ride the
  // session's requests (the rate on each Resume, the auto-pause purely client-side), so neither
  // can travel with a saved session into a library item.
  const [rateLimit, setRateLimit] = useLocalStorage<number>(localStorageKeys.consumerSessionRateLimit, { defaultValue: 0 });
  const [pauseAfter, setPauseAfter] = useLocalStorage<number>(localStorageKeys.consumerSessionPauseAfterLoaded, { defaultValue: 0 });

  const playButtonState = (props.sessionState === 'new' || props.sessionState === 'paused') ? 'play' : 'pause';
  // Be defensive at this presentation boundary too: older/incomplete callers that omit the
  // field have the same meaning as protobuf UNSPECIFIED and old saved JSON - Best effort.
  const messageDeliveryOrder = props.config?.messageDeliveryOrder ?? 'best-effort';
  const deliveryOrderTime = props.config?.deliveryOrderKey === 'broker-publish-time'
    ? 'Broker publish time'
    : props.config?.deliveryOrderKey === 'event-time'
      ? 'Event time'
      : 'Publish time';

  // No runtime config means the stored configuration could not be converted into one - there is
  // nothing to send. Play used to stay enabled and start a session that could never leave
  // "initializing", which reads as a hang rather than as the configuration error it is. This only
  // matters for the transition that BUILDS a session from the config - Play from `new`; pause and
  // resume are name-only RPCs that never touch it (see the disabled scoping below).
  const isConfigUnusable = props.config === undefined;

  let playButtonOnClick: () => void;
  switch (props.sessionState) {
    case 'new': playButtonOnClick = () => props.onSessionStateChange('initializing'); break;
    case 'initializing': playButtonOnClick = () => undefined; break;
    case 'running': playButtonOnClick = () => props.onSessionStateChange('pausing'); break;
    case 'pausing': playButtonOnClick = () => undefined; break;
    case 'paused': playButtonOnClick = () => props.onSessionStateChange('running'); break;
  }

  return (
    <div className={s.Toolbar}>
      <div className={s.ToolbarLeft}>
        <div className={s.Control}>
          <SmallButton
            testId="cs-play"
            title={
              props.sessionState === 'running' || props.sessionState === 'pausing' ? "Pause"
                : props.sessionState === 'paused' ? "Resume"
                : "Start"
            }
            svgIcon={playButtonState === 'play' ? resumeIcon : pauseIcon}
            onClick={playButtonOnClick}
            type={'primary'}
            disabled={(isConfigUnusable && props.sessionState === 'new') || (props.sessionState !== 'new' && props.sessionState !== 'paused' && props.sessionState !== 'running')}
          />
        </div>

        <DeliveryControlInput
          testId="cs-rate-limit"
          caption="msg/s limit"
          value={rateLimit}
          onCommit={setRateLimit}
          title={'Show at most this many messages per second. Leave empty for full speed.<br/>Takes effect when you press Play. Your browser remembers it - it is not saved with the session.'}
        />
        <DeliveryControlInput
          testId="cs-pause-after"
          caption="pause after"
          value={pauseAfter}
          onCommit={setPauseAfter}
          title={'Load exactly this many more messages, then pause - Play loads the next batch. Leave empty to turn this off.<br/>Your browser remembers it - it is not saved with the session.'}
        />

        <div className={s.Control}>
          <SmallButton
            testId="cs-stop"
            title={"Stop and flush the current session loaded data"}
            svgIcon={resetIcon}
            onClick={() => props.onStopSession()}
            type={'danger'}
            disabled={props.sessionState === 'new'}
          />
        </div>

        <div className={s.Control}>
          <SmallButton
            testId="cs-tools"
            title={"Toggle More tools"}
            svgIcon={consoleIcon}
            onClick={props.onToggleConsoleClick}
            text={"More tools"}
            type="regular"
          />
        </div>

      </div>

      <div className={s.ToolbarRight}>
        <div
          className={s.Control}
          style={{ position: 'relative', width: '320rem' }}
          data-tooltip-id={tooltipId}
          data-tooltip-html={'Search in message keys and values.'}
        >
          <Input
            testId="cs-search"
            value={props.searchInResults}
            onChange={props.onSearchInResultsChange}
            placeholder='Search in loaded messages'
            size='small'
            clearable
          />
          {props.searchInResults !== '' && (
            <div className={s.NumFoundInResults}>
              <strong data-testid="cs-num-found">{props.numFoundInResults}</strong> found
            </div>
          )}
        </div>
        <div className={s.MessagesLoadedStats}>
          <div className={s.MessagesLoadedStat}>
            <strong className={s.MessagesLoadedStatValue} data-testid="cs-processed">{i18n.formatLongNumber(props.messagesProcessed)}</strong>
            <span className={s.MessagesLoadedStatTitle}>&nbsp;processed</span>
          </div>
          <div className={s.MessagesLoadedStat}>
            <strong className={s.MessagesLoadedStatValue}>{i18n.formatLongNumber(props.messagesProcessedPerSecond.now)}</strong>
            <span className={s.MessagesLoadedStatTitle}>&nbsp;per second</span>
          </div>
        </div>

        <div className={s.MessagesLoadedStats}>
          <div className={s.MessagesLoadedStat}>
            <strong className={s.MessagesLoadedStatValue} data-testid="cs-loaded">{i18n.formatLongNumber(props.messagesLoaded)}</strong>
            <span className={s.MessagesLoadedStatTitle}>&nbsp; loaded</span>
          </div>
          <div className={s.MessagesLoadedStat}>
            <strong className={s.MessagesLoadedStatValue}>{i18n.formatLongNumber(props.messagesLoadedPerSecond.now)}</strong>
            <span className={s.MessagesLoadedStatTitle}>&nbsp;per second</span>
          </div>
        </div>

        {props.config !== undefined && (messageDeliveryOrder === 'best-effort'
          || messageDeliveryOrder === 'guaranteed') && props.orderingActive && (
          <div
            className={s.MessagesLoadedStats}
            data-testid="cs-order-chip"
            role="status"
            title={
              messageDeliveryOrder === 'guaranteed'
                ? 'Replays everything recorded up to Play (or the last Resume), of what retention still holds, ' +
                  'in exact order of the selected timestamp, then pauses when caught up. Stored order within ' +
                  'each stream is preserved, so timestamp reversals and redeliveries are counted as out of order.'
                : 'Merges by the selected timestamp within ~0.75 s. Late messages may ' +
                  'appear out of order; none are dropped.'
            }
          >
            <div className={s.MessagesLoadedStat}>
              <span className={s.MessagesLoadedStatTitle}>
                {messageDeliveryOrder === 'guaranteed' ? 'Replaying history - exact order' : 'Best effort'} · {deliveryOrderTime}
              </span>
              {props.orderingWaitingStreams > 0 && (
                <strong className={s.MessagesLoadedStatValue} data-testid="cs-order-waiting">
                  &nbsp;· waiting for {i18n.formatLongNumber(props.orderingWaitingStreams)} topics/partitions
                </strong>
              )}
              {/* The escape from that wait, RIGHT NEXT TO IT. The replay waits only on streams
                  still inside their recorded range - but a range that can no longer be delivered
                  (trimmed by retention, or the start position seeked past the end) holds that
                  wait forever and looks exactly like an empty topic; the disclosure above says
                  so, and this ends it in one click, without going back through the configuration
                  screen. Offered only for a Guaranteed session that is actually stalled, and
                  only when a caller can apply the change. */}
              {messageDeliveryOrder === 'guaranteed'
                && props.orderingWaitingStreams > 0
                && props.onDeliveryOrderChange !== undefined && (
                <button
                  type="button"
                  data-testid="cs-order-switch-best-effort"
                  onClick={() => props.onDeliveryOrderChange?.('best-effort')}
                  title={
                    'Stop waiting for the silent topics/partitions. Switches this session to Best effort, ' +
                    'which merges within a bounded reorder window and delivers late messages out of order ' +
                    'rather than holding everything for them. Nothing already loaded is lost.'
                  }
                  style={{
                    marginLeft: '8rem',
                    padding: '0 6rem',
                    border: '1rem solid currentColor',
                    borderRadius: '3rem',
                    background: 'transparent',
                    color: 'inherit',
                    font: 'inherit',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Continue with Best effort
                </button>
              )}
              {props.orderKeyFallbacks > 0 && (
                <strong className={s.MessagesLoadedStatValue} data-testid="cs-order-key-fallbacks">
                  &nbsp;· {i18n.formatLongNumber(props.orderKeyFallbacks)} used publish time
                </strong>
              )}
              {/* Under guaranteed the seam chip below owns inversions - the server ticks both
                  counters on the same commit-phase events, so rendering both here would show
                  each violation twice with two different causal labels. */}
              {messageDeliveryOrder !== 'guaranteed' && props.orderingLateDeliveries > 0 && (
                <strong className={s.MessagesLoadedStatValue} data-testid="cs-order-late">
                  &nbsp;· {i18n.formatLongNumber(props.orderingLateDeliveries)} late
                </strong>
              )}
              {/* Replay ordering violations, loudly: the replay delivered these flagged (each
                  row carries its own marker); this is the session-level count. The tooltip names
                  both causes the proto does - the chip stays short. */}
              {props.replaySeamViolations > 0 && (
                <strong
                  className={s.MessagesLoadedStatValue}
                  data-testid="cs-replay-seam-violations"
                  title={
                    'Delivered flagged, never silently: a producer clock wrote an earlier timestamp ' +
                    'into a pause window, or the source log itself stores an inversion.'
                  }
                >
                  &nbsp;· {i18n.formatLongNumber(props.replaySeamViolations)} out of order
                </strong>
              )}
            </div>
          </div>
        )}

        <div>
          <ExportMessagesButton
            messages={props.messages}
            sessionState={props.sessionState}
          />
        </div>
      </div>
    </div>
  );
}

export default Toolbar;
