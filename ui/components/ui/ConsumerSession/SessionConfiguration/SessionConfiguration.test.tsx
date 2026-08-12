/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node"]}
 *
 * BUG-4 regression (e2e RES-2): `/consumer-session?id=<library item id>` accepts ANY persisted
 * library item id. When the stored item is not a consumer-session config, the editor used to
 * dereference `spec.targets` (and the other chains) during render and throw
 * "Cannot read properties of undefined (reading 'map')" - with no error boundary on the route,
 * React unmounted the whole SPA and the document rendered EMPTY.
 *
 * The fixtures are built with the app's own `getDefaultManagedItem`, so the malformed case is the
 * same shape the e2e produces by saving a message-filter through the Library.
 *
 * Note: with a jest.mock() in the file, esbuild-jest runs babel's hoisting pass over untyped JS, so
 * imported bindings must not appear in type annotations here (inference only).
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { SWRConfig } from 'swr';

// mermaid/nanoid are ESM-only and jest does not transform node_modules; both are pulled in far away
// from what is under test (markdown preview in the library item editor / session id generation).
jest.mock('mermaid', () => ({ __esModule: true, default: { initialize: () => undefined } }));
jest.mock('nanoid', () => ({ nanoid: () => 'test-id' }));

import SessionConfiguration from './SessionConfiguration';
import { getDefaultManagedItem } from '../../LibraryBrowser/default-library-items';
import { consumerSessionConfigFromValOrRef } from '../../LibraryBrowser/model/resolved-items-conversions';
import { defaultNumDisplayItems } from './display-items';
import { decodeConsumerSessionConfig, describeProblem } from './decode-session-config';

const contextForTopic = (topicPersistency: 'persistent' | 'non-persistent') => ({
  pulsarResource: {
    type: 'topic' as const,
    tenant: 'public',
    namespace: 'default',
    topicPersistency,
    topic: 'a-topic',
  },
});

const libraryContext = contextForTopic('persistent');

// The same SWR settings the app itself installs (components/app/app.tsx) - without them the data
// hooks deep in the editor keep a retry timer alive past the jsdom teardown.
const renderConfig = (val: unknown, context: unknown = libraryContext) =>
  render(
    <SWRConfig value={{ shouldRetryOnError: false, refreshInterval: 0, revalidateOnFocus: false }}>
      <SessionConfiguration
        value={{ type: 'value', val } as never}
        onChange={() => undefined}
        libraryContext={context as never}
      />
    </SWRConfig>
  );

describe('BUG-4: a malformed persisted consumer session config', () => {
  it('shows an error instead of crashing when the item is a foreign type', () => {
    // Exactly what the e2e does: a message-filter saved through the Library, opened as `?id=`.
    const foreignItem = getDefaultManagedItem('message-filter', libraryContext);

    expect(() => renderConfig(foreignItem)).not.toThrow();
    expect(screen.getByText(/not a valid Consumer Session configuration/i)).toBeTruthy();
    expect(document.body.textContent).not.toBe('');
  });

  it('shows an error instead of crashing when the stored spec is incomplete', () => {
    // Right item type, but the persisted spec is missing `targets` - the field whose `.map` threw.
    const item = getDefaultManagedItem('consumer-session-config', libraryContext);
    const truncated = { ...item, spec: { ...item.spec, targets: undefined } };

    expect(() => renderConfig(truncated)).not.toThrow();
    expect(screen.getByText(/not a valid Consumer Session configuration/i)).toBeTruthy();
  });

  // Every field the runtime conversion dereferences has to be checked here, not just the ones whose
  // absence happened to throw during RENDER. A spec that renders happily but cannot be converted
  // leaves the session with no runtime config at all, and the editor claiming it is fine.
  it.each([
    ['targets'],
    ['startFrom'],
    ['messageFilterChain'],
    ['coloringRuleChain'],
    ['valueProjectionList'],
    ['pauseTriggerChain'],
  ])('shows an error when the stored spec is missing %s', (field) => {
    const item = getDefaultManagedItem('consumer-session-config', libraryContext);
    const spec = { ...(item as any).spec };
    delete spec[field];

    expect(() => renderConfig({ ...item, spec })).not.toThrow();
    expect(screen.getByText(/not a valid Consumer Session configuration/i)).toBeTruthy();
  });

  it.each([
    ['an empty object', {}],
    ['a value wrapper with no val', { type: 'value' }],
    ['a reference wrapper with no ref', { type: 'reference' }],
  ])('shows an error when startFrom is %s - malformed must say broken, not spin', (_name, startFrom) => {
    // `{ startFrom: {} }` used to pass the shallow object check and then sit in
    // useManagedItemValue forever: neither a value to render nor a reference to resolve -
    // an endless spinner where an error belongs.
    const item = getDefaultManagedItem('consumer-session-config', libraryContext);
    const spec = { ...(item as any).spec, startFrom };

    expect(() => renderConfig({ ...item, spec })).not.toThrow();
    expect(screen.getByText(/not a valid Consumer Session configuration/i)).toBeTruthy();
  });

  it('still renders the editor for a well-formed config', () => {
    const item = getDefaultManagedItem('consumer-session-config', libraryContext);

    renderConfig(item);

    expect(screen.queryByText(/not a valid Consumer Session configuration/i)).toBeNull();
    // The default config has exactly one target column.
    expect(screen.getAllByTestId('cs-target')).toHaveLength(1);
  });
});

/**
 * P2.5 - the shape check has to be RECURSIVE.
 *
 * `/consumer-session?id=` accepts any persisted library item, and a persisted item is JSON on disk:
 * written by an older build, hand-edited, truncated, or saved by a build with a different model. A
 * check that asks only "is targets an array" and "are the four chains objects" lets a whole family
 * of corrupt items through the front door, where they crash a few frames deeper (`topic.val.metadata.id`)
 * or sit in `useManagedItemValue` forever - neither a value to render nor a reference to resolve.
 *
 * So this is a TABLE, walked at every level of the document: the item, its spec, each val-or-ref
 * wrapper, each target, and the chains inside a target. Each row asserts the same two things - the
 * decoder REFUSES and names the offending path, and the editor degrades through the one existing
 * `cs-invalid-config` path instead of throwing.
 */
describe('malformed saved items, level by level', () => {
  /** The default item is Date-free, so a JSON round trip is a faithful deep clone here. */
  const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

  const base = () => clone(getDefaultManagedItem('consumer-session-config', libraryContext)) as any;

  const corrupt = (mutate: (item: any) => void) => {
    const item = base();
    mutate(item);
    return item;
  };

  /** A second target, so a row can corrupt one target and leave a sound one beside it. */
  const withTwoTargets = (mutate: (item: any) => void) => {
    const item = base();
    const second = clone(item.spec.targets[0]);
    second.val.metadata.id = 'second-target';
    item.spec.targets.push(second);
    mutate(item);
    return item;
  };

  const targetSpec = (item: any, index: number) => item.spec.targets[index].val.spec;

  const cases: [string, any, string][] = [
    // The item itself.
    [
      'a foreign library item type',
      clone(getDefaultManagedItem('markdown-document', libraryContext)),
      'metadata.type'
    ],
    ['no spec at all', corrupt((item) => delete item.spec), 'spec'],
    ['a spec that is an array, not an object', corrupt((item) => (item.spec = [])), 'spec'],

    // The config spec's own fields.
    ['targets missing', corrupt((item) => delete item.spec.targets), 'spec.targets'],
    ['targets not an array', corrupt((item) => (item.spec.targets = {})), 'spec.targets'],
    ['targets EMPTY - a session with nothing to consume', corrupt((item) => (item.spec.targets = [])), 'spec.targets'],
    ['startFrom missing', corrupt((item) => delete item.spec.startFrom), 'spec.startFrom'],
    ['numDisplayItems stored as text', corrupt((item) => (item.spec.numDisplayItems = '500')), 'spec.numDisplayItems'],
    [
      'a delivery order this build does not have',
      corrupt((item) => (item.spec.messageDeliveryOrder = 'whatever-comes-next')),
      'spec.messageDeliveryOrder'
    ],

    // The val-or-ref wrappers.
    ['a wrapper with no discriminant', corrupt((item) => (item.spec.startFrom = {})), 'spec.startFrom.type'],
    ['a value wrapper with no val', corrupt((item) => (item.spec.startFrom = { type: 'value' })), 'spec.startFrom.val'],
    [
      'a reference wrapper with an empty ref',
      corrupt((item) => (item.spec.startFrom = { type: 'reference', ref: '' })),
      'spec.startFrom.ref'
    ],
    ['a NULL nested wrapper', corrupt((item) => (item.spec.coloringRuleChain = null)), 'spec.coloringRuleChain'],
    [
      'a val-PLUS-reference hybrid',
      corrupt((item) => (item.spec.valueProjectionList = { ...item.spec.valueProjectionList, ref: 'some-other-item' })),
      'spec.valueProjectionList'
    ],
    [
      'a chain whose item is of the wrong managed type',
      corrupt((item) => (item.spec.messageFilterChain.val.metadata.type = 'coloring-rule-chain')),
      'spec.messageFilterChain.val.metadata.type'
    ],
    [
      'a chain spec missing its own list',
      corrupt((item) => delete item.spec.messageFilterChain.val.spec.filters),
      'spec.messageFilterChain.val.spec.filters'
    ],

    // Into the targets.
    ['a NULL target', withTwoTargets((item) => (item.spec.targets[1] = null)), 'spec.targets[1]'],
    ['an empty target object', withTwoTargets((item) => (item.spec.targets[1] = {})), 'spec.targets[1].type'],
    [
      'a target wrapper whose val has no metadata',
      withTwoTargets((item) => delete item.spec.targets[1].val.metadata),
      'spec.targets[1].val.metadata'
    ],
    [
      'a target holding some other managed item',
      withTwoTargets((item) => (item.spec.targets[1].val.metadata.type = 'message-filter')),
      'spec.targets[1].val.metadata.type'
    ],
    [
      'a target flag of the wrong type',
      withTwoTargets((item) => (targetSpec(item, 1).isEnabled = 'yes')),
      'spec.targets[1].val.spec.isEnabled'
    ],

    // Inside one target: consumption mode, deserializer, topic selector, and the three chains.
    [
      'a target with no consumption mode',
      withTwoTargets((item) => delete targetSpec(item, 1).consumptionMode),
      'spec.targets[1].val.spec.consumptionMode'
    ],
    [
      'a consumption mode this build cannot run',
      withTwoTargets((item) => (targetSpec(item, 1).consumptionMode.mode = { type: 'read-backwards' })),
      'spec.targets[1].val.spec.consumptionMode.mode.type'
    ],
    [
      'a deserializer this build cannot run',
      withTwoTargets((item) => (targetSpec(item, 1).messageValueDeserializer.val.spec.deserializer.deserializer = { type: 'avro' })),
      'spec.targets[1].val.spec.messageValueDeserializer.val.spec.deserializer.deserializer.type'
    ],
    [
      'a topic selector that is a bare object',
      withTwoTargets((item) => (targetSpec(item, 1).topicSelector = {})),
      'spec.targets[1].val.spec.topicSelector.type'
    ],
    [
      'a topic selector kind this build does not have',
      withTwoTargets((item) => (targetSpec(item, 1).topicSelector.val.spec.topicSelector = { type: 'all-topics' })),
      'spec.targets[1].val.spec.topicSelector.val.spec.topicSelector.type'
    ],
    [
      'a topic list holding something that is not a topic name',
      withTwoTargets(
        (item) =>
          (targetSpec(item, 1).topicSelector.val.spec.topicSelector = {
            type: 'multi-topic-selector',
            topicFqns: ['persistent://t/n/a', 7]
          })
      ),
      'spec.targets[1].val.spec.topicSelector.val.spec.topicSelector.topicFqns[1]'
    ],
    [
      "a target's coloring rule list holding a null",
      withTwoTargets((item) => (targetSpec(item, 1).coloringRuleChain.val.spec.coloringRules = [null])),
      'spec.targets[1].val.spec.coloringRuleChain.val.spec.coloringRules[0]'
    ],
    [
      "a target's filter chain mode this build does not have",
      withTwoTargets((item) => (targetSpec(item, 1).messageFilterChain.val.spec.mode = 'most')),
      'spec.targets[1].val.spec.messageFilterChain.val.spec.mode'
    ],
    [
      "a target's value projection missing its short name",
      withTwoTargets((item) => {
        const projection = clone(getDefaultManagedItem('value-projection', libraryContext)) as any;
        delete projection.spec.shortName;
        targetSpec(item, 1).valueProjectionList.val.spec.projections = [{ type: 'value', val: projection }];
      }),
      'spec.targets[1].val.spec.valueProjectionList.val.spec.projections[0].val.spec.shortName'
    ]
  ];

  it.each(cases)('refuses %s and degrades instead of crashing', (_name, item, path) => {
    // The decoder refuses it, and names the level it refused at.
    const decoded = decodeConsumerSessionConfig(item);
    expect(decoded.ok).toBe(false);
    expect((decoded as any).problem.path).toBe(path);

    // And the editor degrades through the SAME `cs-invalid-config` path a malformed config
    // already used - no crash, no endless spinner, no third mechanism.
    expect(() => renderConfig(item)).not.toThrow();

    const shown = screen.getByTestId('cs-invalid-config');
    expect(shown.textContent).toContain('not a valid Consumer Session configuration');
    // The path is the point: "something is wrong somewhere" is not actionable on a config with
    // several targets and a chain inside each of them.
    expect(shown.textContent).toContain(path);
  });

  /**
   * The other half of a decoder: what it must NOT refuse. A shape check that rejects legitimate
   * saved items is a worse bug than the one it fixes, because it locks people out of their own
   * library instead of showing them one broken screen.
   */
  const accepted: [string, () => any][] = [
    ['the item a new session starts from', () => base()],
    [
      'a saved config with several targets',
      () =>
        withTwoTargets(() => {
          /* two sound targets, nothing corrupted */
        })
    ],
    [
      'chains stored as library REFERENCES, not resolved yet',
      () =>
        corrupt((item) => {
          item.spec.messageFilterChain = { type: 'reference', ref: 'shared-filter-chain' };
          item.spec.coloringRuleChain = { type: 'reference', ref: 'shared-coloring' };
          item.spec.targets[0] = { type: 'reference', ref: 'shared-target' };
        })
    ],
    [
      'a reference carrying an unsaved in-browser edit',
      () =>
        corrupt((item) => {
          item.spec.valueProjectionList = { type: 'reference', ref: 'shared-projections', val: item.spec.valueProjectionList.val };
        })
    ],
    [
      'a start position that names a nested library item',
      () =>
        corrupt((item) => {
          item.spec.startFrom.val.spec.startFrom = {
            type: 'relativeDateTime',
            relativeDateTime: {
              type: 'value',
              val: {
                metadata: { id: 'rel-1', name: '', descriptionMarkdown: '', type: 'relative-date-time' },
                spec: { value: 15, unit: 'minute', isRoundedToUnitStart: false }
              }
            }
          };
        })
    ],
    [
      'an older spec with no delivery order and no display limit',
      () =>
        corrupt((item) => {
          delete item.spec.messageDeliveryOrder;
          delete item.spec.numDisplayItems;
        })
    ],
    [
      'a regex target with a populated topic list beside it',
      () =>
        withTwoTargets((item) => {
          targetSpec(item, 0).topicSelector.val.spec.topicSelector = {
            type: 'multi-topic-selector',
            topicFqns: ['persistent://t/n/a', 'persistent://t/n/b']
          };
          targetSpec(item, 1).topicSelector.val.spec.topicSelector = {
            type: 'namespaced-regex-topic-selector',
            namespaceFqn: 't/n',
            pattern: '.*',
            regexSubscriptionMode: 'persistent-only'
          };
        })
    ]
  ];

  it.each(accepted)('accepts %s', (_name, build) => {
    const decoded = decodeConsumerSessionConfig(build());

    expect(decoded.ok ? undefined : describeProblem((decoded as any).problem)).toBeUndefined();
  });

  it('will not let the editor delete its way into the shape it just refused', () => {
    // The decoder refuses an empty target list, so the editor must not be able to produce one -
    // otherwise removing the last target replaces the editor with its own error page, for good.
    renderConfig(base());

    expect((screen.getByTestId('cs-target-remove') as HTMLButtonElement).disabled).toBe(true);
  });
});
/**
 * "Limit num. display messages" is the only thing standing between a long session and a tab that
 * runs out of memory: the session keeps `messages.slice(-limit)` and nothing else bounds it. The
 * field committed `Number(v)` of whatever was on screen, and every non-positive answer it produced
 * turns that slice into "keep everything" - `slice(-0)` IS `slice(0)`. Clearing the field to retype
 * the number is the ordinary way to reach it.
 */
describe('the display-message limit', () => {
  const configWithLimit = (numDisplayItems: unknown) => {
    const item = getDefaultManagedItem('consumer-session-config', libraryContext);
    return { ...item, spec: { ...(item as any).spec, numDisplayItems } };
  };

  /** The editor with a parent that applies what it is handed, as the session does. */
  const renderControlled = (numDisplayItems: unknown) => {
    const onChange = jest.fn();
    const Controlled = () => {
      const [value, setValue] = React.useState<unknown>(() => ({ type: 'value', val: configWithLimit(numDisplayItems) }));
      return (
        <SessionConfiguration
          value={value as never}
          onChange={(v) => {
            setValue(v);
            onChange(v);
          }}
          libraryContext={libraryContext as never}
        />
      );
    };

    render(
      <SWRConfig value={{ shouldRetryOnError: false, refreshInterval: 0, revalidateOnFocus: false }}>
        <Controlled />
      </SWRConfig>
    );
    return onChange;
  };

  const limitInput = () => screen.getByTestId('cs-num-display-items') as HTMLInputElement;
  const error = () => screen.queryByTestId('cs-num-display-items-error');
  const lastLimit = (onChange: jest.Mock) =>
    onChange.mock.calls[onChange.mock.calls.length - 1][0].val.spec.numDisplayItems;

  it('commits a typed limit', () => {
    const onChange = renderControlled(1000);

    fireEvent.change(limitInput(), { target: { value: '250' } });

    expect(error()).toBeNull();
    expect(lastLimit(onChange)).toBe(250);
  });

  it('refuses an emptied field rather than committing a limit that keeps everything', () => {
    const onChange = renderControlled(1000);

    fireEvent.change(limitInput(), { target: { value: '' } });

    expect(error()).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each([['0'], ['-5'], ['2.5'], ['1e3'], ['abc']])('refuses a limit of %p', (text) => {
    const onChange = renderControlled(1000);

    fireEvent.change(limitInput(), { target: { value: text } });

    expect(error()).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps the refused text on screen so it can be corrected, and recovers', () => {
    const onChange = renderControlled(1000);

    fireEvent.change(limitInput(), { target: { value: '0' } });
    expect(limitInput().value).toBe('0');

    fireEvent.change(limitInput(), { target: { value: '25' } });

    expect(error()).toBeNull();
    expect(lastLimit(onChange)).toBe(25);
  });

  it('says which limit is still in effect while the entry is refused', () => {
    renderControlled(1000);

    fireEvent.change(limitInput(), { target: { value: '0' } });

    expect(error()?.textContent).toMatch(/\b1000\b/);
  });

  it('cannot be edited in a read-only (library-owned) configuration', () => {
    render(
      <SWRConfig value={{ shouldRetryOnError: false, refreshInterval: 0, revalidateOnFocus: false }}>
        <SessionConfiguration
          value={{ type: 'value', val: configWithLimit(1000) } as never}
          onChange={() => undefined}
          libraryContext={libraryContext as never}
          isReadOnly
        />
      </SWRConfig>
    );

    expect(limitInput().disabled).toBe(true);
  });

  /**
   * A persisted spec is JSON on disk - written by an older build, hand-edited, or committed by a
   * field that did not validate - so the conversion that turns it into a runtime config is the
   * boundary that has to hold, whatever the editor does.
   */
  describe('a limit read back from a persisted config', () => {
    const limitOf = (numDisplayItems: unknown) =>
      consumerSessionConfigFromValOrRef({ type: 'value', val: configWithLimit(numDisplayItems) } as never, undefined)
        .numDisplayItems;

    it.each([[0], [-5], [2.5], [Number.NaN], [Number.POSITIVE_INFINITY]])(
      'does not let a stored limit of %p disable retention',
      (stored) => {
        // Every one of these makes `slice(-limit)` keep the whole array, or drop from the wrong end.
        const limit = limitOf(stored);

        expect(Number.isSafeInteger(limit)).toBe(true);
        expect(limit).toBeGreaterThan(0);
      }
    );

    it('falls back to the default when nothing is stored', () => {
      expect(limitOf(undefined)).toBe(defaultNumDisplayItems);
    });

    it('keeps a stored limit that is usable', () => {
      expect(limitOf(250)).toBe(250);
    });
  });
});

describe('start-from is told what the targets retain', () => {
  it('disables the history modes when the session sits on a non-persistent topic', () => {
    const nonPersistent = contextForTopic('non-persistent');
    const item = getDefaultManagedItem('consumer-session-config', nonPersistent);

    renderConfig(item, nonPersistent);

    const options = Array.from(screen.getByTestId('cs-start-from').querySelectorAll('option'));
    expect(options.find((o) => o.value === 'latestMessage')?.disabled).toBe(false);
    expect(options.find((o) => o.value === 'earliestMessage')?.disabled).toBe(true);
    expect(screen.getByTestId('cs-start-from-non-persistent-note')).toBeTruthy();
  });

  it('leaves them alone on a persistent topic', () => {
    const item = getDefaultManagedItem('consumer-session-config', libraryContext);

    renderConfig(item);

    const options = Array.from(screen.getByTestId('cs-start-from').querySelectorAll('option'));
    expect(options.every((o) => !o.disabled)).toBe(true);
    expect(screen.queryByTestId('cs-start-from-non-persistent-note')).toBeNull();
  });
});

// Owner decision (2026-08-11, direct instruction): the default is Guaranteed - third move of
// this default (the plan file's decision log is the record), superseding the 2026-08-09
// Best effort default.
describe('delivery order', () => {
  const pbModule = require('../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb');
  const { consumerSessionConfigToPb, messageDeliveryOrderToPb } = require('../conversions/conversions');

  const renderControlledOrder = (initial = getDefaultManagedItem('consumer-session-config', libraryContext)) => {
    const Controlled = () => {
      const [value, setValue] = React.useState<unknown>(() => ({ type: 'value', val: initial }));
      return (
        <SessionConfiguration
          value={value as never}
          onChange={setValue as never}
          libraryContext={libraryContext as never}
        />
      );
    };

    render(
      <SWRConfig value={{ shouldRetryOnError: false, refreshInterval: 0, revalidateOnFocus: false }}>
        <Controlled />
      </SWRConfig>
    );
  };

  const orderSelect = () => screen.getByTestId('cs-delivery-order') as HTMLSelectElement;
  // The help moved into the label's question-mark circle (2026-08-11), which renders through the
  // app-wide tooltip - so what the reader gets is the data-tooltip-html payload, and that is what
  // these read.
  const helpHtml = (labelTestId: string) =>
    screen.getByTestId(labelTestId).querySelector('[data-tooltip-html]')?.getAttribute('data-tooltip-html') ?? '';
  const orderHelp = () => helpHtml('cs-delivery-order-help');
  const timeSelect = () => screen.getByTestId('cs-delivery-order-key') as HTMLSelectElement;
  const timeHelp = () => helpHtml('cs-delivery-order-key-help');

  it('a new spec resolves to the Guaranteed default and serializes it explicitly', () => {
    // The product default, by owner decision (2026-08-11; the third move of this default - the
    // plan file's decision log is the record): a new session replays recorded history exactly and
    // auto-pauses when caught up. Best effort remains the explicit choice for live following.
    const item = getDefaultManagedItem('consumer-session-config', libraryContext);
    const resolved = consumerSessionConfigFromValOrRef({ type: 'value', val: item } as never, undefined);

    expect(resolved.messageDeliveryOrder).toBe('guaranteed');
    expect(consumerSessionConfigToPb(resolved).getMessageDeliveryOrder())
      .toBe(pbModule.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED);
  });

  it('an older spec without the field resolves and serializes as Guaranteed, like every other absence', () => {
    // Pre-branch saved sessions carry no field. They inherit the same product default as a new
    // one - a session that never named an order runs the default, not something it chose.
    const item = getDefaultManagedItem('consumer-session-config', libraryContext);
    const legacy = { ...item, spec: { ...item.spec, messageDeliveryOrder: undefined } };
    const resolved = consumerSessionConfigFromValOrRef({ type: 'value', val: legacy } as never, undefined);

    expect(resolved.messageDeliveryOrder).toBe('guaranteed');
    expect(consumerSessionConfigToPb(resolved).getMessageDeliveryOrder())
      .toBe(pbModule.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED);
  });

  it('an absent value at the wire boundary itself serializes as Guaranteed, the default', () => {
    // The one mapping Play and the live switch share. Its catch-all branch is what an
    // unresolved absent value falls into, so the branch has to name the default - and explicit
    // Best effort has to stay untouched next to it.
    expect(messageDeliveryOrderToPb(undefined))
      .toBe(pbModule.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED);
    expect(messageDeliveryOrderToPb('best-effort'))
      .toBe(pbModule.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME);
  });

  it('an explicit Guaranteed choice survives spec -> resolved config -> protobuf, undisturbed by the default', () => {
    const item = getDefaultManagedItem('consumer-session-config', libraryContext);
    const merged = { ...item, spec: { ...item.spec, messageDeliveryOrder: 'guaranteed' } };
    const resolved = consumerSessionConfigFromValOrRef({ type: 'value', val: merged } as never, undefined);

    expect(resolved.messageDeliveryOrder).toBe('guaranteed');
    expect(consumerSessionConfigToPb(resolved).getMessageDeliveryOrder())
      .toBe(pbModule.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED);
  });

  it('shows all session settings immediately with Guaranteed order selected by default', () => {
    renderConfig(getDefaultManagedItem('consumer-session-config', libraryContext));

    expect(screen.queryByTestId('cs-advanced-toggle')).toBeNull();
    expect(orderSelect().value).toBe('guaranteed');
    expect(screen.getByText('Limit num. display messages')).toBeTruthy();
    expect(screen.getByTestId('cs-session-filters')).toBeTruthy();
    expect(screen.getByTestId('cs-session-projections')).toBeTruthy();
    expect(screen.getByTestId('cs-session-coloring')).toBeTruthy();
  });

  it('orders and names the modes as Guaranteed, Best effort, Fastest', () => {
    renderConfig(getDefaultManagedItem('consumer-session-config', libraryContext));

    expect(Array.from(orderSelect().options).map((option) => option.textContent)).toEqual([
      'Guaranteed',
      'Best effort',
      'Fastest',
    ]);
  });

  it('documents ALL modes in the help circle, and hides Order by only for Fastest', () => {
    // Re-aimed 2026-08-11: the help became a chooser's aid in the label's circle, describing every
    // mode at once - a reader deciding between modes should not have to select each one to learn
    // what it does. The mode contracts themselves are unchanged.
    renderControlledOrder();

    expect(orderHelp()).toContain('Guaranteed');
    expect(orderHelp()).toContain('exact timestamp order');
    expect(orderHelp()).toContain('Best effort');
    expect(orderHelp()).toContain('~0.75 s');
    expect(orderHelp()).toContain('nothing is dropped');
    expect(orderHelp()).toContain('Fastest');
    expect(orderHelp()).toContain('no ordering across topics');
    // The old hold-forever framing must never come back.
    expect(orderHelp()).not.toContain('Waits indefinitely');
    expect(timeSelect()).toBeTruthy();

    // The help is selection-independent; the Order by row is not - Fastest sorts nothing.
    fireEvent.change(orderSelect(), { target: { value: 'guaranteed' } });
    expect(timeSelect()).toBeTruthy();
    fireEvent.change(orderSelect(), { target: { value: 'as-received' } });
    expect(orderHelp()).toContain('Guaranteed'); // still the full catalogue
    expect(screen.queryByTestId('cs-delivery-order-key')).toBeNull();
  });

  it('uses Pulsar timestamp names and explains their fallbacks', () => {
    renderControlledOrder();

    expect(Array.from(timeSelect().options).map((option) => option.textContent)).toEqual([
      'Publish time',
      'Broker publish time',
      'Event time',
    ]);
    // One circle documents all three timestamps, whatever is selected.
    expect(timeHelp()).toContain('Publish time');
    expect(timeHelp()).toContain('stamped by the producer');
    expect(timeHelp()).toContain('Broker publish time');
    expect(timeHelp()).toContain('broker entry metadata');
    expect(timeHelp()).toContain('cannot start');
    expect(timeHelp()).toContain('Event time');
    expect(timeHelp()).toContain('fall back to');
  });

  it('shows a spec without the field as the Guaranteed default', () => {
    const item = getDefaultManagedItem('consumer-session-config', libraryContext);
    renderConfig({ ...item, spec: { ...item.spec, messageDeliveryOrder: undefined } });

    expect(orderSelect().value).toBe('guaranteed');
    expect(screen.getByTestId('cs-delivery-order-key')).toBeTruthy();
  });

  it('shows a saved Guaranteed choice as itself, not as the Best effort default', () => {
    const item = getDefaultManagedItem('consumer-session-config', libraryContext);
    const merged = { ...item, spec: { ...item.spec, messageDeliveryOrder: 'guaranteed' } };
    renderConfig(merged);

    const select = screen.getByTestId('cs-delivery-order') as HTMLSelectElement;
    expect(select.value).toBe('guaranteed');
  });
});

/**
 * Latest x Guaranteed, approached from the ORDER side: the start-from already says Latest and the
 * user picks Guaranteed in the delivery-order select. The combination gets the same one-line note
 * the start-from side shows - and neither field is rewritten from under the user (the M4 lesson):
 * the order becomes what was just chosen, the start-from stays Latest, and Play on the combo
 * yields the server's instant caught-up answer.
 */
describe('choosing Guaranteed while the start-from is Latest', () => {
  const renderControlledOrder = (initial: unknown) => {
    const Controlled = () => {
      const [value, setValue] = React.useState<unknown>(() => ({ type: 'value', val: initial }));
      return (
        <SessionConfiguration
          value={value as never}
          onChange={setValue as never}
          libraryContext={libraryContext as never}
        />
      );
    };

    render(
      <SWRConfig value={{ shouldRetryOnError: false, refreshInterval: 0, revalidateOnFocus: false }}>
        <Controlled />
      </SWRConfig>
    );
  };

  const withLatestStartFrom = () => {
    const item = getDefaultManagedItem('consumer-session-config', libraryContext) as {
      spec: { startFrom: { val: { spec: { startFrom: unknown } } } };
    };
    item.spec.startFrom.val.spec.startFrom = { type: 'latestMessage' };
    return item;
  };

  it('rewrites neither field, and renders no note (removed 2026-08-11, owner instruction)', () => {
    renderControlledOrder(withLatestStartFrom());

    fireEvent.change(screen.getByTestId('cs-delivery-order'), { target: { value: 'guaranteed' } });

    // The order is what the user just chose; the start-from is untouched - the gate is the
    // disabled option alone, with the why in the delivery-order help circle.
    expect((screen.getByTestId('cs-delivery-order') as HTMLSelectElement).value).toBe('guaranteed');
    expect((screen.getByTestId('cs-start-from') as HTMLSelectElement).value).toBe('latestMessage');
    expect(screen.queryByTestId('cs-start-from-latest-guaranteed-note')).toBeNull();

    fireEvent.change(screen.getByTestId('cs-delivery-order'), { target: { value: 'best-effort' } });
    expect((screen.getByTestId('cs-start-from') as HTMLSelectElement).value).toBe('latestMessage');
  });
});
