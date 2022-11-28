import s from './Input.module.css';
import { Attributes, HTMLAttributes, HTMLInputTypeAttribute, InputHTMLAttributes, useEffect, useRef } from 'react';
import SvgIcon from '../SvgIcon/SvgIcon';
import clearIcon from './clear.svg';

export type InputProps = {
  value: string,
  onChange: (v: string) => void,
  iconSvg?: string,
  focusOnMount?: boolean
  clearable?: boolean,
  type?: HTMLInputTypeAttribute,
  inputProps?: InputHTMLAttributes<any>,
  placeholder?: string
}
const Input: React.FC<InputProps> = ({ value, placeholder, iconSvg, clearable, onChange, focusOnMount, type, inputProps }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusOnMount) {
      inputRef?.current?.focus();
    }
  }, [inputRef.current]);

  return (
    <div className={s.Input}>
      <input
        ref={inputRef}
        className={`${s.InputInput} ${iconSvg ? s.InputInputWithIcon : ''} ${clearable ? s.InputInputClearable : ''}`}
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
      />
      {iconSvg && (<div className={s.InputIcon}>
        <SvgIcon svg={iconSvg} />
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
