import React from 'react';
import s from './Toolbar.module.css'
import pauseIcon from '!!raw-loader!./icons/pause.svg';
import resumeIcon from '!!raw-loader!./icons/resume.svg';
import stopIcon from '!!raw-loader!./icons/stop.svg';
import Button from '../../ui/Button/Button';
import * as I18n from '../../app/contexts/I18n/I18n';
import { SessionState } from './types';

export type ToolbarProps = {
  sessionState: SessionState,
  onSessionStateChange: (state: SessionState) => void,
  messagesLoaded: number,
  messagesLoadedPerSecond: { prevMessagesLoaded: number, messagesLoadedPerSecond: number },
};

const Toolbar: React.FC<ToolbarProps> = (props) => {
  const i18n = I18n.useContext();

  const playButtonState = props.sessionState === 'new' || props.sessionState === 'paused' ? 'play' : 'pause';

  let playButtonOnClick: () => void;
  switch(props.sessionState) {
    case 'new': playButtonOnClick = () => props.onSessionStateChange('initializing'); break;
    case 'initializing': playButtonOnClick = () => {}; break;
    case 'running': playButtonOnClick = () => props.onSessionStateChange('paused'); break;
    case 'paused': playButtonOnClick = () => props.onSessionStateChange('running'); break;
  }

  return (
    <div className={s.Toolbar}>
      <div className={s.ToolbarLeft}>
        <div className={s.Controls}>
          <div className={s.Control}>
            <Button
              title={props.sessionState ? "Resume" : "Pause"}
              svgIcon={playButtonState === 'play' ? resumeIcon : pauseIcon}
              onClick={playButtonOnClick}
              type={'primary'}
              disabled={props.sessionState === 'initializing'}
            />
          </div>
          <div className={s.Control}>
            <Button
              title={"Stop"}
              svgIcon={stopIcon}
              onClick={() => props.onSessionStateChange('new')}
              type={'danger'}
              disabled={props.sessionState === 'new'}
            />
          </div>
        </div>
      </div>

      <div className={s.ToolbarRight}>
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
    </div>
  );
}

export default Toolbar;
