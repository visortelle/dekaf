import s from './StringEditor.module.css';
import { useEffect, useRef } from 'react';
import SvgIcon from '../../../ui/SvgIcon/SvgIcon';

export type StringEditorProps = InputProps;
const StringEditor: React.FC<StringEditorProps> = (props) => {
  return (
    <div className={s.StringEditor}>
      <Input
        {...props}
      />
    </div>
  );
}

export type InputProps = {
  value: string,
  onChange: (v: string) => void,
  placeholder?: string,
  iconSvg?: string,
  focusOnMount?: boolean
}
const Input: React.FC<InputProps> = ({ value, placeholder, iconSvg, onChange, focusOnMount }) => {
  const inputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (focusOnMount) {
      inputRef?.current?.focus();
    }
  }, []);

  return (
    <div className={s.Input}>
      <input
        ref={inputRef}
        className={`${s.InputInput} ${iconSvg ? s.InputInputWithIcon : ''}`}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {iconSvg && (<div className={s.InputIcon}>
        <SvgIcon svg={iconSvg} />
      </div>
      )}
    </div>
  );
};

export default StringEditor;
