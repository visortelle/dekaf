import s from './Input.module.css';
import { useEffect, useRef } from 'react';
import SvgIcon from '../SvgIcon/SvgIcon';
import clearIcon from '!!raw-loader!./clear.svg';

export type InputProps = {
  placeholder: string,
  value: string,
  onChange: (v: string) => void,
  iconSvg?: string,
  focusOnMount?: boolean
  clearable?: boolean,
}
const Input: React.FC<InputProps> = ({ value, placeholder, iconSvg, clearable, onChange, focusOnMount }) => {
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
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            inputRef?.current?.blur();
          }
        }}
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
