import React from 'react';
import s from './ThemeSwitch.module.css';
import SvgIcon from '../SvgIcon/SvgIcon';
import * as Theme from '../../app/contexts/Theme/Theme';
import { tooltipId } from '../Tooltip/Tooltip';

// Inline rather than .svg files: *.svg is tracked by Git LFS in this repo.
const sunIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v3M12 19.5v3M4.57 4.57l2.12 2.12M17.31 17.31l2.12 2.12M1.5 12h3M19.5 12h3M4.57 19.43l2.12-2.12M17.31 6.69l2.12-2.12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`;
const moonIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1z"/></svg>`;
const systemIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 4h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-7v2h3v2H7v-2h3v-2H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1 2v9h16V6z"/></svg>`;

const options: { value: Theme.ThemePreference, icon: string, label: string }[] = [
  { value: 'light', icon: sunIcon, label: 'Light theme' },
  { value: 'dark', icon: moonIcon, label: 'Dark theme' },
  { value: 'system', icon: systemIcon, label: 'Follow system theme' },
];

const ThemeSwitch: React.FC = () => {
  const { preference, setPreference } = Theme.useContext();

  return (
    <div className={s.ThemeSwitch} role="radiogroup" aria-label="Theme" data-testid="theme-switch">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={preference === option.value}
          aria-label={option.label}
          className={`${s.Option} ${preference === option.value ? s.Selected : ''}`}
          onClick={() => setPreference(option.value)}
          data-tooltip-id={tooltipId}
          data-tooltip-content={option.label}
          data-testid={`theme-switch-${option.value}`}
        >
          <SvgIcon svg={option.icon} />
        </button>
      ))}
    </div>
  );
}

export default ThemeSwitch;
