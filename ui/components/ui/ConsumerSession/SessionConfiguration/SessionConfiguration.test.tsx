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
 * The start-from selector reacts to what the session's TARGETS point at, but the targets live here -
 * so the editor has to hand that down. Nothing in the selector's own tests can prove it was passed.
 */
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
