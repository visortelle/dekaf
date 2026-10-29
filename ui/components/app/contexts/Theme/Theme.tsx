import React, { ReactNode, useEffect, useState } from 'react';
import useLocalStorage from 'use-local-storage-state';
import { localStorageKeys } from '../../../local-storage-keys';

export type ThemePreference = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';

export type Value = {
  preference: ThemePreference,
  setPreference: (preference: ThemePreference) => void,
  // The theme actually applied, with 'system' resolved.
  theme: Theme,
}

const defaultValue: Value = {
  preference: 'system',
  setPreference: () => undefined,
  theme: 'light',
};

const Context = React.createContext<Value>(defaultValue);

const darkMediaQuery = '(prefers-color-scheme: dark)';

const getSystemTheme = (): Theme =>
  typeof window !== 'undefined' && window.matchMedia?.(darkMediaQuery).matches ? 'dark' : 'light';

// Keep in sync with the boot script in server/src/main/resources/ui/index.ftl, which applies
// the same attributes before first paint to avoid a light flash.
export const applyTheme = (theme: Theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
};

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  const [storedPreference, setPreference] = useLocalStorage<ThemePreference>(
    localStorageKeys.theme,
    { defaultValue: 'system' }
  );
  const preference: ThemePreference = ['light', 'dark', 'system'].includes(storedPreference) ? storedPreference : 'system';
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme);

  useEffect(() => {
    const mql = window.matchMedia?.(darkMediaQuery);
    if (mql === undefined) {
      return;
    }

    const onChange = () => setSystemTheme(mql.matches ? 'dark' : 'light');
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const theme: Theme = preference === 'system' ? systemTheme : preference;

  useEffect(() => applyTheme(theme), [theme]);

  return (
    <Context.Provider value={{ preference, setPreference, theme }}>
      {children}
    </Context.Provider>
  );
};

export const useContext = () => React.useContext(Context);
