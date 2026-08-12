import React, { FC } from 'react';
import s from './ConsumerSession.module.css';
import * as I18n from '../../app/contexts/I18n/I18n';
import { ReplayCaughtUpStats } from './types';
import SmallButton from '../SmallButton/SmallButton';
import ActionButton from '../ActionButton/ActionButton';
import resumeIcon from './Toolbar/icons/resume.svg';

export type ReplayCaughtUpBannerProps = {
  caughtUp: ReplayCaughtUpStats;
  /** "Load new messages up to now": the ordinary resume flow - the server extends the replay
   * boundary to the present and replays the delta, then pauses at the new boundary. */
  onResume: () => void;
  /** The one-click switch: the live session continues under Best effort, following live traffic. */
  onContinueWithBestEffort: () => void;
  /** The explicit close - the only dismiss gesture the panel has (its body holds controls). */
  onClose: () => void;
};

/**
 * The guaranteed replay's boundary pause, said out loud: everything recorded up to the boundary
 * was delivered in exact order, the server auto-paused, and these are the two ways on.
 *
 * It deliberately says nothing about how much is waiting past the boundary. That figure could only
 * ever be the broker's backlog, which counts ENTRIES rather than messages, so it was approximate in
 * a unit no reader thinks in - removed 2026-08-11 rather than kept as a number needing a caveat.
 *
 * The excluded-topics line exists for regex sessions whose pattern matched NEW topics after Play:
 * they are excluded from the running replay (a replay of a set fixed at Play), and only a restart
 * includes them. Each line renders ONLY when its record says something - a zero is silence, not a
 * claim. The actions are the shared SmallButton, so this banner ages with the rest of the app
 * rather than carrying its own button styling.
 */
const ReplayCaughtUpBanner: FC<ReplayCaughtUpBannerProps> = (props) => {
  const i18n = I18n.useContext();

  const shownTopics = props.caughtUp.excludedTopics;
  const numUnlistedTopics = Math.max(0, props.caughtUp.excludedTopicCount - shownTopics.length);
  const numExcluded = props.caughtUp.excludedTopicCount;

  return (
    <div className={s.ReplayCaughtUp} data-testid="cs-replay-caught-up" role="status">
      <div className={s.ReplayCaughtUpClose}>
        <ActionButton
          testId="cs-replay-caught-up-close"
          onClick={props.onClose}
          title="Close"
          action={{ type: 'predefined', action: 'close' }}
          buttonProps={{ appearance: 'borderless-semitransparent' }}
        />
      </div>
      <div className={s.ReplayCaughtUpTitle}>Guaranteed order consumer session finished</div>
      <div className={s.ReplayCaughtUpHeadline}>
        Caught up to {i18n.formatDateTime(new Date(props.caughtUp.boundaryAtMs))}
      </div>
      <div>Everything recorded up to that moment was replayed in exact order.</div>

      {numExcluded > 0 && (
        <div data-testid="cs-replay-caught-up-excluded">
          {i18n.formatLongNumber(numExcluded)} topic{numExcluded === 1 ? '' : 's'} started matching after this
          session began, so {numExcluded === 1 ? 'it is' : 'they are'} not part of this
          replay - restart the session to include {numExcluded === 1 ? 'it' : 'them'}:{' '}
          {shownTopics.join(', ')}{numUnlistedTopics > 0 ? `, +${i18n.formatLongNumber(numUnlistedTopics)} more` : ''}
        </div>
      )}

      <div className={s.ReplayCaughtUpActions}>
        <SmallButton
          type="primary"
          svgIcon={resumeIcon}
          text="Load new messages up to now"
          testId="cs-replay-resume"
          title="Replay everything recorded since this point, in exact order, then pause again when caught up."
          onClick={props.onResume}
        />
        <SmallButton
          type="primary"
          svgIcon={resumeIcon}
          text="Switch to Best effort and follow live"
          testId="cs-replay-continue-best-effort"
          title={
            'Stop replaying and follow live traffic from here. Best effort orders within a short '
            + 'window, so a late message can appear out of order - none are dropped. Nothing already '
            + 'loaded is lost, and the switch point is marked in the table.'
          }
          onClick={props.onContinueWithBestEffort}
        />
      </div>
    </div>
  );
};

export default ReplayCaughtUpBanner;
