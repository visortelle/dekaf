import React, { FC } from 'react';
import s from './ConsumerSession.module.css';
import * as I18n from '../../app/contexts/I18n/I18n';
import { ReplayCaughtUpStats } from './types';

export type ReplayCaughtUpBannerProps = {
  caughtUp: ReplayCaughtUpStats;
  /** The ordinary resume flow: the server extends the replay boundary to now and replays the delta. */
  onResume: () => void;
  /** The one-click switch: the live session continues under Best effort, following live traffic. */
  onContinueWithBestEffort: () => void;
};

/**
 * The guaranteed replay's boundary pause, said out loud: everything recorded up to the boundary
 * was delivered in exact order, the server auto-paused, and these are the two ways on.
 *
 * The newer-data line is deliberately approximate ("~", entries): the broker's backlog counts
 * ENTRIES, and one entry can hold a whole batch - the banner must never claim an exact message
 * count it cannot know. The excluded-topics line exists for regex sessions whose pattern matched
 * NEW topics after Play: they are excluded from the running replay (a replay of a set fixed at
 * Play), and only a restart includes them. Each line renders ONLY when its record says something -
 * a zero is silence, not a claim.
 */
const ReplayCaughtUpBanner: FC<ReplayCaughtUpBannerProps> = (props) => {
  const i18n = I18n.useContext();

  const shownTopics = props.caughtUp.excludedTopics;
  const numUnlistedTopics = Math.max(0, props.caughtUp.excludedTopicCount - shownTopics.length);

  return (
    <div className={s.ReplayCaughtUp} data-testid="cs-replay-caught-up" role="status">
      <div>
        Caught up to {i18n.formatDateTime(new Date(props.caughtUp.boundaryAtMs))} - everything recorded up to that
        moment was replayed in order.
      </div>
      {props.caughtUp.newerEntriesApprox > 0 && (
        <div data-testid="cs-replay-caught-up-newer">
          ~{i18n.formatLongNumber(props.caughtUp.newerEntriesApprox)} newer entries - new messages waiting.
          Resume to catch up.
        </div>
      )}
      {props.caughtUp.excludedTopicCount > 0 && (
        <div data-testid="cs-replay-caught-up-excluded">
          {i18n.formatLongNumber(props.caughtUp.excludedTopicCount)} newly matched
          topic{props.caughtUp.excludedTopicCount === 1 ? '' : 's'} - restart to
          include: {shownTopics.join(', ')}{numUnlistedTopics > 0 ? `, +${i18n.formatLongNumber(numUnlistedTopics)} more` : ''}
        </div>
      )}
      <div className={s.ReplayCaughtUpActions}>
        <button
          type="button"
          className={s.ReplayCaughtUpButton}
          data-testid="cs-replay-resume"
          onClick={props.onResume}
          title="Extend the replay to now: the server replays everything recorded since the boundary, exactly, then pauses again when caught up."
        >
          Resume
        </button>
        <button
          type="button"
          className={s.ReplayCaughtUpButton}
          data-testid="cs-replay-continue-best-effort"
          onClick={props.onContinueWithBestEffort}
          title="Follow live traffic from here under Best effort, which orders within a bounded reorder window. Nothing already loaded is lost; the switch point is marked in the table."
        >
          Continue live with Best effort
        </button>
      </div>
    </div>
  );
};

export default ReplayCaughtUpBanner;
