import React from 'react';
import s from './Toolbar.module.css'
import pauseIcon from './icons/pause.svg';
import resumeIcon from './icons/resume.svg';
import resetIcon from './icons/reset.svg';
import consoleIcon from './icons/console.svg';
import Button from '../../ui/Button/Button';
import * as I18n from '../../app/contexts/I18n/I18n';
import { SessionState, SessionConfig } from './types';
import { quickDateToDate } from './SessionConfiguration/StartFromInput/quick-date';
import { timestampToDate } from './SessionConfiguration/StartFromInput/timestamp-to-date';
import SmallButton from '../../ui/SmallButton/SmallButton';
import Input from '../../ui/Input/Input';

export type ToolbarProps = {
  sessionState: SessionState;
  config: SessionConfig;
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
    case 'awaiting-initial-cursor-positions': playButtonOnClick = () => undefined; break;
    case 'got-initial-cursor-positions': playButtonOnClick = () => undefined; break;
    case 'running': playButtonOnClick = () => props.onSessionStateChange('pausing'); break;
    case 'pausing': playButtonOnClick = () => undefined; break;
    case 'paused': playButtonOnClick = () => props.onSessionStateChange('running'); break;
  }

  return (
    <div className={s.Toolbar}>
      <div className={s.ToolbarLeft}>
        <div className={s.Control}>
          <Button
            title={props.sessionState ? "Resume" : "Pause"}
            svgIcon={playButtonState === 'play' ? resumeIcon : pauseIcon}
            onClick={playButtonOnClick}
            type={'primary'}
            disabled={props.sessionState !== 'new' && props.sessionState !== 'paused' && props.sessionState !== 'running'}
          />
        </div>
        <div className={s.Control}>
          <Button
            title={"Stop and empty current session"}
            svgIcon={resetIcon}
            onClick={() => props.onStopSession()}
            type={'danger'}
            disabled={props.sessionState === 'new'}
          />
        </div>
        <div className={s.Control}>
          <Button
            title={"Toggle console"}
            svgIcon={consoleIcon}
            onClick={props.onToggleConsoleClick}
            text="Tools"
            type={'primary'}
            size='small'
          />
        </div>
        <div className={s.Control}>
          <div className={s.ConfigParamName}>Started from</div>
          <div>
            {props.config.startFrom.type === 'earliest' && <div>Earliest</div>}
            {props.config.startFrom.type === 'latest' && <div>Latest</div>}
            {(props.config.startFrom.type === 'messageId') && (() => {
              const str = i18n.bytesToHexString(i18n.hexStringToBytes(props.config.startFrom.hexString), 'hex-with-space');
              return (
                props.config.startFrom.hexString.length === 0 ?
                  <div className={s.NoData}>-</div> :
                  <div style={{ maxWidth: '48ch', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={str}>
                    {str}
                  </div>
              )
            })()}
            {(props.config.startFrom.type === 'date') && <div>{i18n.formatDate(props.config.startFrom.date)}</div>}
            {(props.config.startFrom.type === 'timestamp') && <div>{i18n.formatDate(timestampToDate(props.config.startFrom.ts))}</div>}
            {props.config.startFrom.type === 'quickDate' && <div>{i18n.formatDate(quickDateToDate(props.config.startFrom.quickDate, props.config.startFrom.relativeTo))}</div>}
          </div>
        </div>
        <div className={s.Control}>
          <div className={s.ConfigParamName}>Filters</div>
          <div style={{ display: 'flex' }}>
            <div>{Object.keys(props.config.messageFilter.filters).length - props.config.messageFilter.disabledFilters.length}</div>
            <div>&nbsp;</div>
          </div>
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
                value={props.displayMessagesLimit}
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
