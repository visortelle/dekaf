/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node"]}
 *
 * The `customExportConditions` override keeps jsdom off its default "browser" export condition,
 * which resolves `uuid` (pulled in transitively by the exporters) to its untranspiled ESM build.
 *
 * Regression: MessagesExporter recovers from an ExportConfig poisoned in local storage by
 * resetting it to the default from ErrorBoundary#onError. It used to only bump the child's `key`,
 * but react-error-boundary keeps its own `error` state until the boundary is reset (or its
 * `resetKeys` change) - and the fallback here is empty. So the export modal went permanently blank
 * instead of coming back with a working, default configuration.
 *
 * CS-EXPORT (e2e) asserts the "Resetting to default" toast only, so it passes on a blank modal.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MessagesExporter from './MessagesExporter';
import { defaultExportConfig } from './defaults';
import { localStorageKeys } from '../../../../../local-storage-keys';

const key = localStorageKeys.messageExportConfig;

// `fields` is missing, so `_MessagesExporter` throws on `props.config.fields.fields` while rendering
// the "Message fields N of M" label - exactly the class of local-storage rot the boundary exists for.
const poisonedConfig = { format: { type: 'json-message-per-entry' } };

function readStoredConfig(): unknown {
  const raw = window.localStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
}

describe('MessagesExporter recovers from a poisoned export config', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    window.localStorage.clear();
    // React logs the caught render error; keep the suite output readable.
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
    window.localStorage.clear();
  });

  it('brings the controls back and persists a usable default config', async () => {
    window.localStorage.setItem(key, JSON.stringify(poisonedConfig));

    render(<MessagesExporter messages={[]} sessionState="paused" />);

    // The modal is usable again: format picker, Export and Reset buttons are all back.
    await waitFor(() => expect(screen.getByTestId('cs-export-run')).toBeTruthy());
    expect(screen.getByTestId('cs-export-format')).toBeTruthy();
    expect(screen.getByTestId('cs-export-reset')).toBeTruthy();

    // The very section that threw renders again, from the recovered config.
    const activeFields = defaultExportConfig.fields.fields.filter((f) => f.isActive).length;
    expect(screen.getByText(`Message fields ${activeFields} of ${defaultExportConfig.fields.fields.length}`)).toBeTruthy();

    // A subsequent export would run against the default config, not the poisoned one.
    expect(readStoredConfig()).toEqual(defaultExportConfig);
  });

  it('renders the controls normally when the stored config is valid', () => {
    window.localStorage.setItem(key, JSON.stringify(defaultExportConfig));

    render(<MessagesExporter messages={[]} sessionState="paused" />);

    expect(screen.getByTestId('cs-export-run')).toBeTruthy();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
