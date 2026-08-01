/**
 * Which of a session's selected topics can retain history at all.
 *
 * A non-persistent topic stores NOTHING: a consumer only ever sees messages published after it
 * subscribed, and the admin `examineMessage` call the history-based start-from modes are built on
 * refuses non-persistent topics with a 405. So the start-from selector has to know, and the only
 * signal it needs is client-side: `non-persistent://` versus `persistent://`.
 *
 * The bias throughout is "never disable on a guess": anything this cannot resolve counts as
 * possibly-persistent, so an unresolved reference or an open-ended regex leaves every mode enabled.
 */
import {
  isNonPersistentTopicFqn,
  startFromPersistencyAdvice,
  targetTopicsPersistency,
} from './target-topics-persistency';

const topicContext = (topicPersistency: 'persistent' | 'non-persistent') => ({
  pulsarResource: {
    type: 'topic' as const,
    tenant: 'public',
    namespace: 'default',
    topicPersistency,
    topic: 'a-topic',
  },
});

const namespaceContext = { pulsarResource: { type: 'namespace' as const, tenant: 'public', namespace: 'default' } };

/** A target whose topic selector is `selector`; `isEnabled` defaults to true. */
const target = (selector: unknown, isEnabled = true) => ({
  type: 'value' as const,
  val: {
    metadata: { id: 'tg', name: '', descriptionMarkdown: '', type: 'consumer-session-target' as const },
    spec: {
      isEnabled,
      topicSelector: {
        type: 'value' as const,
        val: {
          metadata: { id: 'ts', name: '', descriptionMarkdown: '', type: 'topic-selector' as const },
          spec: { topicSelector: selector },
        },
      },
    },
  },
});

const multi = (...topicFqns: string[]) => ({ type: 'multi-topic-selector', topicFqns });
const regex = (regexSubscriptionMode: string) => ({
  type: 'namespaced-regex-topic-selector',
  namespaceFqn: 'public/default',
  pattern: '.*',
  regexSubscriptionMode,
});

const persistency = (targets: unknown[], context: unknown = topicContext('persistent')) =>
  targetTopicsPersistency(targets as never, context as never);

describe('isNonPersistentTopicFqn', () => {
  it('splits on the FQN scheme', () => {
    expect(isNonPersistentTopicFqn('non-persistent://public/default/t')).toBe(true);
    expect(isNonPersistentTopicFqn('persistent://public/default/t')).toBe(false);
  });

  it('does not mistake a persistent topic merely NAMED like one', () => {
    // The scheme is a prefix, not a substring - a topic called "non-persistent-audit" is persistent.
    expect(isNonPersistentTopicFqn('persistent://public/default/non-persistent-audit')).toBe(false);
  });
});

describe('targetTopicsPersistency', () => {
  it('reports a lone non-persistent target', () => {
    expect(persistency([target(multi('non-persistent://public/default/t'))])).toEqual({
      hasPersistent: false,
      hasNonPersistent: true,
    });
  });

  it('reports a lone persistent target', () => {
    expect(persistency([target(multi('persistent://public/default/t'))])).toEqual({
      hasPersistent: true,
      hasNonPersistent: false,
    });
  });

  it('reports a mix, whether it comes from two targets or one multi-topic target', () => {
    const acrossTargets = persistency([
      target(multi('persistent://public/default/a')),
      target(multi('non-persistent://public/default/b')),
    ]);
    expect(acrossTargets).toEqual({ hasPersistent: true, hasNonPersistent: true });

    const withinOneTarget = persistency([
      target(multi('persistent://public/default/a', 'non-persistent://public/default/b')),
    ]);
    expect(withinOneTarget).toEqual({ hasPersistent: true, hasNonPersistent: true });
  });

  it('ignores a disabled target - it is not consumed from', () => {
    expect(
      persistency([
        target(multi('persistent://public/default/a')),
        target(multi('non-persistent://public/default/b'), false),
      ])
    ).toEqual({ hasPersistent: true, hasNonPersistent: false });
  });

  it('reads the current topic from the page the session is mounted on', () => {
    const current = [target({ type: 'current-topic' })];

    expect(persistency(current, topicContext('non-persistent'))).toEqual({
      hasPersistent: false,
      hasNonPersistent: true,
    });
    expect(persistency(current, topicContext('persistent'))).toEqual({
      hasPersistent: true,
      hasNonPersistent: false,
    });
    // Mounted on a namespace: "current topic" pins nothing down.
    expect(persistency(current, namespaceContext)).toEqual({ hasPersistent: true, hasNonPersistent: false });
  });

  it('only treats a regex selector as non-persistent when it excludes persistent topics', () => {
    expect(persistency([target(regex('non-persistent-only'))])).toEqual({
      hasPersistent: false,
      hasNonPersistent: true,
    });
    expect(persistency([target(regex('persistent-only'))])).toEqual({
      hasPersistent: true,
      hasNonPersistent: false,
    });
  });

  it('treats an "all topics" regex as reaching BOTH domains, because the server makes it', () => {
    // NamespacedRegexTopicSelector lists the persistent and the non-persistent topics of the
    // namespace and concatenates them before matching the pattern, so a matching non-persistent
    // topic IS consumed. Claiming persistent-only here suppressed the one warning that says those
    // topics start from now whatever the start-from asks for - and nothing gets disabled by this,
    // since a mixed selection keeps every mode available.
    expect(persistency([target(regex('all-topics'))])).toEqual({ hasPersistent: true, hasNonPersistent: true });
    expect(startFromPersistencyAdvice(persistency([target(regex('all-topics'))]))).toBe('history-partial');
  });

  it('never concludes "non-persistent" from something it cannot resolve', () => {
    // No targets at all, an unresolved target reference, and an empty topic list: each is unknown,
    // and unknown must leave every mode available.
    expect(persistency([])).toEqual({ hasPersistent: true, hasNonPersistent: false });
    expect(persistency([{ type: 'reference', ref: 'some-id' }])).toEqual({
      hasPersistent: true,
      hasNonPersistent: false,
    });
    expect(persistency([target(multi())])).toEqual({ hasPersistent: true, hasNonPersistent: false });
  });

  it('lets an empty selector alongside a non-persistent one stay non-persistent', () => {
    // An empty selector picks no topics, so it must not dilute what the other target proved.
    expect(persistency([target(multi()), target(multi('non-persistent://public/default/b'))])).toEqual({
      hasPersistent: false,
      hasNonPersistent: true,
    });
  });
});

describe('startFromPersistencyAdvice', () => {
  it('classifies the three cases the selector reacts to', () => {
    expect(startFromPersistencyAdvice({ hasPersistent: false, hasNonPersistent: true })).toBe('history-unavailable');
    expect(startFromPersistencyAdvice({ hasPersistent: true, hasNonPersistent: true })).toBe('history-partial');
    expect(startFromPersistencyAdvice({ hasPersistent: true, hasNonPersistent: false })).toBe('none');
  });
});
