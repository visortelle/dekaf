import s from './Input.module.css';
import { HTMLInputTypeAttribute, InputHTMLAttributes, useEffect, useRef } from 'react';
import SvgIcon from '../SvgIcon/SvgIcon';
import clearIcon from './clear.svg';
import { tooltipId } from '../Tooltip/Tooltip';
import { renderToStaticMarkup } from 'react-dom/server';

export type InputAddon = {
  id: string,
  isEnabled: boolean,
  onClick: () => void,
  label?: string,
  iconSvg?: string,
  help?: string | React.ReactElement
}

export type InputProps = {
  value: string,
  onChange: (v: string) => void,
  isError?: boolean,
  iconSvg?: string,
  focusOnMount?: boolean,
  annotation?: string,
  clearable?: boolean,
  type?: HTMLInputTypeAttribute,
  size?: 'regular' | 'small',
  inputProps?: InputHTMLAttributes<any>,
  placeholder?: string,
  testId?: string,
  appearance?: 'default' | 'no-borders',
  addons?: InputAddon[],
  isReadOnly?: boolean
}
const Input: React.FC<InputProps> = ({ value, placeholder, isError, iconSvg, clearable, onChange, focusOnMount, type, size, inputProps, testId, annotation, appearance, addons, isReadOnly }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current && focusOnMount) {
      setTimeout(() => {
        inputRef?.current?.focus();
      });
    }
  }, [inputRef.current]);

  let paddingRightRem = 12;
  addons?.forEach(() => paddingRightRem += 24);
  if (clearable) {
    paddingRightRem += 24
  }

  return (
    <div
      className={`
        ${s.Input}
        ${size === 'small' ? s.SmallInput : ''}
        ${annotation ? s.InputAnnotation : ''}
        ${appearance === 'no-borders' ? s.NoBorders : ''}
        ${isReadOnly ? s.ReadOnly : ''}
      `}
    >
      {annotation && <span className={s.Annotation}>{annotation}</span>}
      <input
        ref={inputRef}
        style={{ paddingRight: `${paddingRightRem}rem` }}
        className={`
          ${s.InputInput}
          ${isError ? s.InputInputWithError : ''}
          ${iconSvg ? s.InputInputWithIcon : ''}
          ${clearable ? s.InputInputClearable : ''}
        `}
        type={type || 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            inputRef?.current?.blur();
          }
        }}
        disabled={inputProps?.disabled || isReadOnly}
        {...inputProps}
        data-testid={testId}
      />
      {iconSvg && (<div className={s.InputIcon}>
        <SvgIcon svg={iconSvg} />
      </div>
      )}
      {addons && addons.length > 0 && (
        <div className={s.Addons}>
          {addons.map(addon => {
            return (
              <div
                key={addon.id}
                onClick={addon.onClick}
                className={`${s.Addon} ${addon.isEnabled ? '' : s.AddonDisabled}`}
                data-tooltip-id={addon.help ? tooltipId : undefined}
                data-tooltip-html={addon.help ? renderToStaticMarkup(<>{addon.help}</>) : undefined}
              >
                {addon.iconSvg && <SvgIcon svg={addon.iconSvg} />}
                {addon.label && <div className={s.AddonLabel}>{addon.label}</div>}
              </div>
            );
          })}
        </div>
      )}
      {clearable && (
        <div className={s.Clear} onClick={() => onChange('')}>
          <SvgIcon svg={clearIcon} />
        </div>
      )}
    </div>
  );
};

export default Input;
