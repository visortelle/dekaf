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

  // `disabled` stops typing into the native field and NOTHING else. The addons and the clear button
  // below are plain divs with an `onClick`, so a read-only field kept two working ways to edit the
  // value it was only supposed to be showing: an addon changes what the value MEANS (the regex
  // `m`/`i` flags, match-case), and clear empties it outright.
  //
  // The addons stay on screen, because which flags are set is part of what is being read; the clear
  // button does not, because it is nothing but a mutation.
  const isClearable = clearable && !isReadOnly;

  let paddingRightRem = 12;
  addons?.forEach(() => paddingRightRem += 24);
  if (isClearable) {
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
          ${isClearable ? s.InputInputClearable : ''}
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
        {...inputProps}
        // AFTER the spread, deliberately: callers forward native attributes through `inputProps`,
        // and one that mentions `disabled` at all - including the `disabled: props.disabled` that
        // evaluates to `undefined` - used to overwrite the computed value and hand a read-only
        // field back to the user.
        disabled={inputProps?.disabled || isReadOnly}
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
                onClick={isReadOnly ? undefined : addon.onClick}
                className={`${s.Addon} ${addon.isEnabled ? '' : s.AddonDisabled} ${isReadOnly ? s.AddonReadOnly : ''}`}
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
      {isClearable && (
        <div className={s.Clear} onClick={() => onChange('')}>
          <SvgIcon svg={clearIcon} />
        </div>
      )}
    </div>
  );
};

export default Input;
