import React, { FC, useState } from 'react';
import s from './ConsumerSession.module.css';
import * as Notifications from '../../app/contexts/Notifications';
import { copyToClipboard, copyFailureMessage } from '../../app/clipboard';

/**
 * How many topic names the disclosed banner puts in the DOM.
 *
 * A topic selector admits up to 2,000 streams, and one `<li>` per abandoned stream built a
 * ~2,000-node subtree by default - on a session that is already degraded and under load. The count
 * is still stated in full, and the remaining names are one click (or one copy) away, so the bound
 * costs no information.
 */
export const startFromDegradedPreviewLimit = 5;

export type StartFromDegradedBannerProps = {
  /** The streams the start-from resolution gave up waiting for, as `<consumer>@<topic fqn>`. */
  abandonedStreams: string[],
};

/**
 * The sticky disclosure for a start position that could not be resolved against every topic. It
 * stays expanded by default on purpose - the result really is degraded - and is collapsible to a
 * compact badge. Its own disclosure state is deliberately local: the record is cleared by
 * unmounting the banner, which is also what re-arms a new session's disclosure.
 */
const StartFromDegradedBanner: FC<StartFromDegradedBannerProps> = (props) => {
  const { notifySuccess, notifyWarn } = Notifications.useContext();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isShowAllTopics, setIsShowAllTopics] = useState(false);

  // The stream ids are internal (`<consumer>@<topic fqn>`); the person reading the banner
  // owns TOPICS, so that is what is shown.
  const topics = props.abandonedStreams.map(id => (id.includes('@') ? id.slice(id.indexOf('@') + 1) : id));
  const plural = topics.length !== 1;
  const shownTopics = isShowAllTopics ? topics : topics.slice(0, startFromDegradedPreviewLimit);
  const numHiddenTopics = topics.length - shownTopics.length;

  const copyTopics = () => {
    // The WHOLE list, never what happens to be on screen - the bound above must not become the
    // limit of what can be got out of here.
    void copyToClipboard(topics.join('\n')).then((ok) => {
      if (ok) notifySuccess(`${topics.length} topic${plural ? 's' : ''} copied to clipboard.`);
      else notifyWarn(copyFailureMessage());
    });
  };

  return (
    <div className={s.StartFromDegraded} data-testid="cs-start-from-degraded" role="status">
      {isCollapsed ? (
        <button
          type="button"
          className={s.StartFromDegradedToggle}
          data-testid="cs-start-from-degraded-expand"
          onClick={() => setIsCollapsed(false)}
        >
          Best effort: {topics.length} silent topic{plural ? 's' : ''} skipped - details
        </button>
      ) : (
        <>
          <div>
            Best effort: {topics.length} topic{plural ? 's' : ''} stayed silent while the start position was being
            resolved and {plural ? 'were' : 'was'} skipped past. The start cut across topics is approximate
            {plural ? ' for these topics' : ' for this topic'}:
          </div>
          <ul className={s.StartFromDegradedTopics} data-testid="cs-start-from-degraded-topics">
            {shownTopics.map(topic => <li key={topic}>{topic}</li>)}
          </ul>
          <div className={s.StartFromDegradedActions}>
            {topics.length > startFromDegradedPreviewLimit && (
              <button
                type="button"
                className={s.StartFromDegradedToggle}
                data-testid="cs-start-from-degraded-show-all"
                onClick={() => setIsShowAllTopics(!isShowAllTopics)}
              >
                {isShowAllTopics ? `Show first ${startFromDegradedPreviewLimit}` : `and ${numHiddenTopics} more`}
              </button>
            )}
            <button
              type="button"
              className={s.StartFromDegradedToggle}
              data-testid="cs-start-from-degraded-copy"
              onClick={copyTopics}
            >
              Copy all topics
            </button>
            <button
              type="button"
              className={s.StartFromDegradedToggle}
              data-testid="cs-start-from-degraded-collapse"
              onClick={() => setIsCollapsed(true)}
            >
              Collapse
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default StartFromDegradedBanner;
