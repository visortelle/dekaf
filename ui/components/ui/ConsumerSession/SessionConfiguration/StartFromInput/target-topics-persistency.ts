import { LibraryContext } from '../../../LibraryBrowser/model/library-context';
import { ManagedConsumerSessionTargetValOrRef } from '../../../LibraryBrowser/model/user-managed-items';
import { ConsumerSessionStartFrom } from '../../types';

/**
 * What the session's selected topics can offer the start-from selector.
 *
 * A non-persistent topic retains nothing: a consumer only ever receives messages published after it
 * subscribed, and every history-based start-from mode is built on an admin call that refuses
 * non-persistent topics outright. So the selector needs to know whether ANY selected topic can
 * retain history - not whether all of them can.
 */
export type TargetTopicsPersistency = {
  /** At least one selected topic can retain history. Anything unresolvable counts here. */
  hasPersistent: boolean;
  /** At least one selected topic is non-persistent and therefore retains nothing. */
  hasNonPersistent: boolean;
};

/** Pulsar FQNs carry the persistency in the scheme: `non-persistent://tenant/namespace/topic`. */
export function isNonPersistentTopicFqn(topicFqn: string): boolean {
  return topicFqn.trim().startsWith('non-persistent://');
}

/**
 * Classify the topics the session's enabled targets point at.
 *
 * Every branch that cannot resolve a topic reports `hasPersistent` instead of staying silent: this
 * result disables controls, and disabling a control on a guess is worse than leaving a useless one
 * enabled. An empty selector is the one exception - it selects no topics, so it contributes nothing
 * either way and must not dilute what a sibling target proved.
 */
export function targetTopicsPersistency(
  targets: ManagedConsumerSessionTargetValOrRef[],
  libraryContext: LibraryContext
): TargetTopicsPersistency {
  let hasPersistent = false;
  let hasNonPersistent = false;

  const observeTopicFqn = (topicFqn: string) => {
    if (isNonPersistentTopicFqn(topicFqn)) {
      hasNonPersistent = true;
      return;
    }

    hasPersistent = true;
  };

  targets.forEach((target) => {
    const targetSpec = target.val?.spec;

    // An unresolved target reference - what it points at is unknown.
    if (targetSpec === undefined) {
      hasPersistent = true;
      return;
    }

    if (targetSpec.isEnabled === false) {
      return;
    }

    const topicSelector = targetSpec.topicSelector?.val?.spec?.topicSelector;
    if (topicSelector === undefined) {
      hasPersistent = true;
      return;
    }

    switch (topicSelector.type) {
      case 'current-topic': {
        const pulsarResource = libraryContext.pulsarResource;
        if (pulsarResource.type !== 'topic') {
          // Mounted on a namespace: "the current topic" pins nothing down yet.
          hasPersistent = true;
          return;
        }

        if (pulsarResource.topicPersistency === 'non-persistent') {
          hasNonPersistent = true;
          return;
        }

        hasPersistent = true;
        return;
      }
      case 'multi-topic-selector': {
        topicSelector.topicFqns.forEach(observeTopicFqn);
        return;
      }
      case 'namespaced-regex-topic-selector': {
        if (topicSelector.regexSubscriptionMode === 'non-persistent-only') {
          hasNonPersistent = true;
          return;
        }

        // "all-topics" really does mean both domains: the server lists the namespace's persistent
        // AND non-persistent topics and concatenates them before matching the pattern
        // (NamespacedRegexTopicSelector), so a matching non-persistent topic is consumed from.
        // Reporting it as possibly-mixed costs nothing - a mixed selection disables no mode - and
        // it restores the note saying those topics start from now whatever is chosen here.
        if (topicSelector.regexSubscriptionMode === 'all-topics') {
          hasPersistent = true;
          hasNonPersistent = true;
          return;
        }

        hasPersistent = true;
        return;
      }
    }
  });

  // Nothing resolvable at all (no targets, or only empty selectors).
  if (!hasPersistent && !hasNonPersistent) {
    return { hasPersistent: true, hasNonPersistent: false };
  }

  return { hasPersistent, hasNonPersistent };
}

export type StartFromPersistencyAdvice =
  /** Nothing selected retains history: only a live tail is possible. */
  | 'history-unavailable'
  /** Some selected topics retain history and some do not. */
  | 'history-partial'
  | 'none';

export function startFromPersistencyAdvice(persistency: TargetTopicsPersistency): StartFromPersistencyAdvice {
  if (!persistency.hasPersistent && persistency.hasNonPersistent) {
    return 'history-unavailable';
  }

  if (persistency.hasPersistent && persistency.hasNonPersistent) {
    return 'history-partial';
  }

  return 'none';
}

/**
 * Every start-from mode except the live tail needs the topic to have kept something. On a
 * non-persistent topic they are all unusable - including "Earliest message", the misleading one:
 * nothing is retained, so it quietly behaves as "from now" instead of failing. Both approximate
 * modes are proportions OF a history, so neither can be computed where there is none: one needs
 * the topic's entry count, the other its first and last publish times.
 *
 * Shared by the selector (which disables these modes and says why) and the session-local fallback
 * below (which decides what a Play actually sends): one list, so the two cannot disagree.
 */
export const historyDependentStartFromTypes: ConsumerSessionStartFrom['type'][] = [
  'earliestMessage',
  'messageId',
  'dateTime',
  'relativeDateTime',
  'nthMessageAfterEarliest',
  'nthMessageBeforeLatest',
  'approximateEntryPosition',
  'approximatePublishTimePosition'
];

/**
 * The start-from a session should ACTUALLY RUN with, given what its selected topics retain.
 *
 * When nothing selected retains history and the configured mode needs one, the session runs from
 * the live tail instead - the only position a non-persistent topic has. This is a SESSION-LOCAL
 * substitution, applied where the stored configuration is converted into a runtime one. The
 * stored configuration is deliberately left as the user wrote it: rewriting it in place (the old
 * behaviour) silently destroyed the configured message id / time / count with no undo, and for a
 * REFERENCED library item it wrote a local `val` while keeping `type: 'reference'` - a session
 * that disagreed with the item it named, and not even durably, since references persist by ref
 * alone. The selector shows a note naming this exact substitution while it is in effect.
 */
export function effectiveStartFrom(
  startFrom: ConsumerSessionStartFrom,
  targets: ManagedConsumerSessionTargetValOrRef[],
  libraryContext: LibraryContext
): ConsumerSessionStartFrom {
  if (!historyDependentStartFromTypes.includes(startFrom.type)) {
    return startFrom;
  }

  if (startFromPersistencyAdvice(targetTopicsPersistency(targets, libraryContext)) !== 'history-unavailable') {
    return startFrom;
  }

  return { type: 'latestMessage' };
}
