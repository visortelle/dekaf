import React from 'react';
import s from './Toolbar.module.css'
import pauseIcon from '!!raw-loader!./icons/pause.svg';
import resumeIcon from '!!raw-loader!./icons/resume.svg';
import Button from '../../ui/Button/Button';
import * as I18n from '../../app/contexts/I18n/I18n';

export type ToolbarProps = {
  isPaused: boolean,
  onSetIsPaused: (isPaused: boolean) => void,
  messagesLoaded: number,
  messagesLoadedPerSecond: { prevMessagesLoaded: number, messagesLoadedPerSecond: number },
  onSeekByTimestamp: (date: Date) => void,
};

const Toolbar: React.FC<ToolbarProps> = (props) => {
  const i18n = I18n.useContext();

  return (
    <div className={s.Toolbar}>
      <div className={s.ToolbarLeft}>
        <div className={s.Buttons}>
          <div className={s.ButtonsButton}>
            <Button
              title={props.isPaused ? "Resume" : "Pause"}
              svgIcon={props.isPaused ? resumeIcon : pauseIcon}
              onClick={() => props.onSetIsPaused(!props.isPaused)}
              type={props.isPaused ? 'primary' : 'danger'}
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
