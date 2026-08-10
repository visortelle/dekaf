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
  effectiveStartFrom,
  historyDependentStartFromTypes,
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

/**
 * The session-local substitution that replaced the old in-place rewrite: when nothing selected
 * retains history and the configured mode needs one, the RUNTIME config runs from the live tail
 * while the stored configuration keeps exactly what the user wrote. These tests pin the decision;
 * the non-rewriting itself is pinned in StartFromInput.test.tsx, and the substituted request in
 * ConsumerSession.test.ts.
 */
describe('effectiveStartFrom', () => {
  const nonPersistentOnly = [target(multi('non-persistent://public/default/t'))];
  const persistentOnly = [target(multi('persistent://public/default/t'))];
  const mixed = [target(multi('persistent://public/default/a', 'non-persistent://public/default/b'))];
  const context = topicContext('persistent');
  const substitute = (startFrom: unknown, targets: unknown[], ctx: unknown = context) =>
    effectiveStartFrom(startFrom as never, targets as never, ctx as never);

  it('substitutes the live tail when a history mode meets a history-less selection', () => {
    expect(substitute({ type: 'nthMessageAfterEarliest', n: 5 }, nonPersistentOnly)).toEqual({ type: 'latestMessage' });
  });

  it('substitutes for EVERY history-dependent mode - the same set the selector disables', () => {
    // One shared list drives both the disabled options and this substitution; if a future mode
    // joins the selector without joining the list, this loop will not catch it - the selector
    // tests will - but a mode in the list must never slip through here.
    historyDependentStartFromTypes.forEach((type) => {
      expect(substitute({ type }, nonPersistentOnly)).toEqual({ type: 'latestMessage' });
    });
  });

  it('returns the very same object when the mode is the live tail already', () => {
    // Identity, not just equality: the caller uses it to keep the converted config untouched.
    const startFrom = { type: 'latestMessage' };
    expect(substitute(startFrom, nonPersistentOnly)).toBe(startFrom);
  });

  it('leaves a history mode alone when the selection retains history', () => {
    const startFrom = { type: 'nthMessageAfterEarliest', n: 5 };
    expect(substitute(startFrom, persistentOnly)).toBe(startFrom);
  });

  it('leaves a mixed selection alone - history modes are legal there', () => {
    const startFrom = { type: 'earliestMessage' };
    expect(substitute(startFrom, mixed)).toBe(startFrom);
  });

  it('never substitutes on a guess - the unresolvable counts as possibly-persistent', () => {
    const startFrom = { type: 'dateTime', dateTime: new Date(0) };
    expect(substitute(startFrom, [])).toBe(startFrom);
    expect(substitute(startFrom, [{ type: 'reference', ref: 'some-id' }])).toBe(startFrom);
  });
});
