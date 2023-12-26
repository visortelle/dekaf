import React from 'react';
import s from './Toolbar.module.css'
import pauseIcon from './icons/pause.svg';
import resumeIcon from './icons/resume.svg';
import resetIcon from './icons/reset.svg';
import consoleIcon from './icons/console.svg';
import * as I18n from '../../app/contexts/I18n/I18n';
import { SessionState, ConsumerSessionConfig } from './types';
import SmallButton from '../../ui/SmallButton/SmallButton';
import Input from '../../ui/Input/Input';

export type ToolbarProps = {
  sessionState: SessionState;
  config: ConsumerSessionConfig | undefined;
  onSessionStateChange: (state: SessionState) => void;
  onStopSession: () => void;
  messagesLoaded: number;
  messagesProcessed: number;
  messagesLoadedPerSecond: { prev: number, now: number };
  messagesProcessedPerSecond: { prev: number, now: number };
  onToggleConsoleClick: () => void;
  displayMessagesLimit: number;
  onDisplayMessagesLimitChange: (limit: number) => void;
};

const Toolbar: React.FC<ToolbarProps> = (props) => {
  const i18n = I18n.useContext();

  const playButtonState = (props.sessionState === 'new' || props.sessionState === 'paused') ? 'play' : 'pause';

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
            title={props.sessionState ? "Start or Resume" : "Pause"}
            svgIcon={playButtonState === 'play' ? resumeIcon : pauseIcon}
            onClick={playButtonOnClick}
            type={'primary'}
            disabled={props.sessionState !== 'new' && props.sessionState !== 'paused' && props.sessionState !== 'running'}
          />
        </div>

        <div className={s.Control}>
          <SmallButton
            title={"Stop and flush the current session loaded data"}
            svgIcon={resetIcon}
            onClick={() => props.onStopSession()}
            type={'danger'}
            disabled={props.sessionState === 'new'}
          />
        </div>

        <div className={s.Control}>
          <SmallButton
            title={"Session Inspector"}
            svgIcon={consoleIcon}
            onClick={props.onToggleConsoleClick}
            text={"Tools"}
            type="regular"
            // appearance="borderless-semitransparent"
          />
        </div>
      </div>

      <div className={s.ToolbarRight}>
        <div className={s.MessagesLoadedStats}>
          <div className={s.MessagesLoadedStat}>
            <strong className={s.MessagesLoadedStatValue}>{i18n.formatLongNumber(props.messagesProcessed)}</strong>
            <span className={s.MessagesLoadedStatTitle}>&nbsp;processed</span>
          </div>
          <div className={s.MessagesLoadedStat}>
            <strong className={s.MessagesLoadedStatValue}>{i18n.formatLongNumber(props.messagesProcessedPerSecond.now)}</strong>
            <span className={s.MessagesLoadedStatTitle}>&nbsp;per second</span>
          </div>
        </div>

        <div className={s.MessagesLoadedStats}>
          <div className={s.MessagesLoadedStat}>
            <strong className={s.MessagesLoadedStatValue}>{i18n.formatLongNumber(props.messagesLoaded)}</strong>
            <span className={s.MessagesLoadedStatTitle}>&nbsp; loaded</span>
          </div>
          <div className={s.MessagesLoadedStat}>
            <strong className={s.MessagesLoadedStatValue}>{i18n.formatLongNumber(props.messagesLoadedPerSecond.now)}</strong>
            <span className={s.MessagesLoadedStatTitle}>&nbsp;per second</span>
          </div>
        </div>

        <div className={s.MessagesLoadedStats}>
          <div className={s.MessagesLoadedStat}>
            <strong className={s.MessagesLoadedStatValue}>
              <Input
                type="number"
                value={String(props.displayMessagesLimit)}
                onChange={v => props.onDisplayMessagesLimitChange(Number(v))}
              />
            </strong>
            <span className={s.MessagesLoadedStatTitle}>&nbsp; max messages shown</span>
          </div>
        </div>
      </div>
    </div >
  );
}

export default Toolbar;
