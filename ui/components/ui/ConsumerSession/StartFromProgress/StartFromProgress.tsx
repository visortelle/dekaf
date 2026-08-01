import React from 'react';
import s from './StartFromProgress.module.css';

/** How far a "skip first n messages" start-from has got, as the UI needs it. */
export type StartFromSkipProgress = {
  messagesSkipped: number;
  messagesToSkip: number;
};

/**
 * Below this many messages a skip resolves quickly enough that a progress panel would be pure noise,
 * so nothing is shown. Above it the skip takes real time and the session would otherwise look frozen.
 */
export const startFromProgressDisplayThreshold = 1000000;

const formatCount = (n: number) => n.toLocaleString('en-US');

export type StartFromProgressProps = {
  progress: StartFromSkipProgress;
};

/**
 * Shown while a large "skip first n messages" start-from is still being resolved.
 *
 * Skipping n messages exactly costs O(n): Pulsar keeps no message-ordinal index, so the only way to
 * land on message n is to count n messages. This panel exists so a big skip reads as "working" rather
 * than "hung".
 */
const StartFromProgress: React.FC<StartFromProgressProps> = ({ progress }) => {
  const { messagesSkipped, messagesToSkip } = progress;
  const percent = messagesToSkip > 0
    ? Math.min(100, Math.floor((messagesSkipped / messagesToSkip) * 100))
    : 0;

  return (
    <div
      className={s.StartFromProgress}
      data-testid="cs-start-from-progress"
      data-cs-skipped={messagesSkipped}
      data-cs-to-skip={messagesToSkip}
      data-cs-percent={percent}
    >
      <div>Skipping {formatCount(messagesToSkip)} messages before the first one is shown...</div>
      <progress
        className={s.Bar}
        data-testid="cs-start-from-progress-bar"
        value={messagesSkipped}
        max={messagesToSkip}
      />
      <div className={s.Counts}>
        {formatCount(messagesSkipped)} of {formatCount(messagesToSkip)} skipped ({percent}%)
      </div>
      <div className={s.Hint}>
        Skipping an exact number of messages means counting them one by one, so a large skip takes a while.
        "About % through the data" reaches roughly the same place immediately.
      </div>
    </div>
  );
};

export default StartFromProgress;
