/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import ThemeSwitch from './ThemeSwitch';
import * as Theme from '../../app/contexts/Theme/Theme';

// jsdom has no matchMedia. A controllable stand-in for the OS color scheme.
let systemIsDark = false;
const mediaListeners = new Set<() => void>();
const setSystemDark = (isDark: boolean) => {
  systemIsDark = isDark;
  mediaListeners.forEach(listener => listener());
};

beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    get matches() { return query === '(prefers-color-scheme: dark)' && systemIsDark; },
    media: query,
    addEventListener: (_: string, listener: () => void) => mediaListeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => mediaListeners.delete(listener),
  })) as unknown as typeof window.matchMedia;
});

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  systemIsDark = false;
  mediaListeners.clear();
});

const renderSwitch = () => render(
  <Theme.DefaultProvider>
    <ThemeSwitch />
  </Theme.DefaultProvider>
);

const appliedTheme = () => document.documentElement.getAttribute('data-theme');

describe('ThemeSwitch', () => {
  it('defaults to following the system theme', () => {
    systemIsDark = true;
    renderSwitch();

    expect(screen.getByTestId('theme-switch-system').getAttribute('aria-checked')).toBe('true');
    expect(appliedTheme()).toBe('dark');
  });

  it('applies and persists an explicit choice', () => {
    renderSwitch();

    fireEvent.click(screen.getByTestId('theme-switch-dark'));
    expect(appliedTheme()).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    // JSON-encoded, as the boot script in index.ftl expects.
    expect(window.localStorage.getItem('theme')).toBe('"dark"');

    fireEvent.click(screen.getByTestId('theme-switch-light'));
    expect(appliedTheme()).toBe('light');
    expect(window.localStorage.getItem('theme')).toBe('"light"');
  });

  it('follows OS changes only while set to system', () => {
    renderSwitch();
    expect(appliedTheme()).toBe('light');

    act(() => setSystemDark(true));
    expect(appliedTheme()).toBe('dark');

    fireEvent.click(screen.getByTestId('theme-switch-light'));
    act(() => setSystemDark(false));
    act(() => setSystemDark(true));
    expect(appliedTheme()).toBe('light');
  });

  it('falls back to system for an unknown stored value', () => {
    window.localStorage.setItem('theme', '"sepia"');
    renderSwitch();

    expect(screen.getByTestId('theme-switch-system').getAttribute('aria-checked')).toBe('true');
  });
});
