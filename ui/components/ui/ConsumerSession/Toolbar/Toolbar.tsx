import React from 'react';
import useLocalStorage from 'use-local-storage-state';
import s from './Toolbar.module.css'
import pauseIcon from './icons/pause.svg';
import resumeIcon from './icons/resume.svg';
import resetIcon from './icons/reset.svg';
import consoleIcon from './icons/console.svg';
import * as I18n from '../../../app/contexts/I18n/I18n';
import { SessionState, ConsumerSessionConfig, MessageDescriptor } from '../types';
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
};

const Toolbar: React.FC<ToolbarProps> = (props) => {
  const i18n = I18n.useContext();

  // Browser-wide delivery controls, NOT session config: both live in localStorage and ride the
  // session's requests (the rate on each Resume, the auto-pause purely client-side), so neither
  // can travel with a saved session into a library item.
  const [rateLimit, setRateLimit] = useLocalStorage<number>(localStorageKeys.consumerSessionRateLimit, { defaultValue: 0 });
  const [pauseAfter, setPauseAfter] = useLocalStorage<number>(localStorageKeys.consumerSessionPauseAfterLoaded, { defaultValue: 0 });

  const playButtonState = (props.sessionState === 'new' || props.sessionState === 'paused') ? 'play' : 'pause';

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
            title={"Toggle additional tools"}
            svgIcon={consoleIcon}
            onClick={props.onToggleConsoleClick}
            text={"Tools"}
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
