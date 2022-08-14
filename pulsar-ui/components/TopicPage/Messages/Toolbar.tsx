import React from 'react';
import s from './Toolbar.module.css'
import pauseIcon from '!!raw-loader!./icons/pause.svg';
import resumeIcon from '!!raw-loader!./icons/resume.svg';
import resetIcon from '!!raw-loader!./icons/reset.svg';
import consoleIcon from '!!raw-loader!./icons/console.svg';
import Button from '../../ui/Button/Button';
import * as I18n from '../../app/contexts/I18n/I18n';
import { SessionState, SessionConfig } from './types';
import { quickDateToDate } from './SessionConfiguration/StartFromInput/quick-date';
import { timestampToDate } from './SessionConfiguration/StartFromInput/timestamp-to-date';

export type ToolbarProps = {
  sessionState: SessionState;
  config: SessionConfig;
  onSessionStateChange: (state: SessionState) => void;
  onStopSession: () => void;
  messagesLoaded: number;
  messagesProcessed: number;
  messagesLoadedPerSecond: { prevMessagesLoaded: number, messagesLoadedPerSecond: number };
  onToggleConsoleClick: () => void;
};

const Toolbar: React.FC<ToolbarProps> = (props) => {
  const i18n = I18n.useContext();

  const playButtonState = props.sessionState === 'new' || props.sessionState === 'paused' ? 'play' : 'pause';

  let playButtonOnClick: () => void;
  switch (props.sessionState) {
    case 'new': playButtonOnClick = () => props.onSessionStateChange('initializing'); break;
    case 'initializing': playButtonOnClick = () => { }; break;
    case 'awaiting-initial-cursor-positions': playButtonOnClick = () => { }; break;
    case 'got-initial-cursor-positions': playButtonOnClick = () => { }; break;
    case 'running': playButtonOnClick = () => props.onSessionStateChange('paused'); break;
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
            type={'regular'}
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
        </div>

        <div className={s.MessagesLoadedStats}>
          <div className={s.MessagesLoadedStat}>
            <strong className={s.MessagesLoadedStatValue}>{i18n.formatLongNumber(props.messagesLoaded)}</strong>
            <span className={s.MessagesLoadedStatTitle}>&nbsp; loaded</span>
          </div>
          <div className={s.MessagesLoadedStat}>
            <strong className={s.MessagesLoadedStatValue}>{i18n.formatLongNumber(props.messagesLoadedPerSecond.messagesLoadedPerSecond)}</strong>
            <span className={s.MessagesLoadedStatTitle}>&nbsp;per second</span>
          </div>
        </div>
      </div>
    </div >
  );
}

export default Toolbar;
