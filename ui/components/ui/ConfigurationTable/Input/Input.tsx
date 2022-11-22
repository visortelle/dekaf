import s from './Input.module.css';
import { InputHTMLAttributes, useEffect, useRef } from 'react';
import SvgIcon from '../../SvgIcon/SvgIcon';

export type InputProps = {
  value: string,
  onChange: (v: string) => void,
  placeholder?: string,
  type?: 'text' | 'number' | 'password',
  iconSvg?: string,
  focusOnMount?: boolean,
  inputProps?: InputHTMLAttributes<HTMLInputElement>
}
const Input: React.FC<InputProps> = (props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (props.focusOnMount) {
      inputRef?.current?.focus();
    }
  }, []);

  return (
    <div className={s.Input}>
      <input
        ref={inputRef}
        className={`${s.InputInput} ${props.iconSvg ? s.InputInputWithIcon : ''}`}
        type={props.type || 'text'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        {...props.inputProps}
      />
      {props.iconSvg && (<div className={s.InputIcon}>
        <SvgIcon svg={props.iconSvg} />
      </div>
      )}
    </div>
  );
};

export default Input;
