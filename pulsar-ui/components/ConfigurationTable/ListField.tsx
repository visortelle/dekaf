import { useState } from "react";
import { ConfigurationField, ListValue } from "./values";
import s from './ListField.module.css'
import SvgIcon from '../ui/SvgIcon/SvgIcon';
import removeIcon from '!!raw-loader!./remove.svg';
import addIcon from '!!raw-loader!./add.svg';
import { useEffect, useRef } from "react";
import * as Either from 'fp-ts/Either';

export function ListField(props: ConfigurationField<ListValue<string>>): React.ReactElement {
  const [inputValue, setInputValue] = useState('');

  const onCreate = () => {
    if (props.value.onCreate) {
      props.value.onCreate(inputValue);
      setInputValue('');
    }
  }

  return (
    <div>
      <div className={s.ListFieldInput}>
        <Input
          onChange={(v) => setInputValue(v)}
          placeholder=""
          value={inputValue}
          isWithValues={props.value.value.length > 0}
          onEnter={onCreate}
        />
        {props.value.onCreate && (
          <button
            className={`${s.ListFieldAdd} ${Either.isRight(props.value.isValid(inputValue)) ? s.ListFieldAddValid : s.ListFieldAddInvalid}`}
            type="button"
            onClick={onCreate}
          >
            <SvgIcon svg={addIcon} />
          </button>
        )}
      </div>

      {props.value.value.length !== 0 && (
        <div className={s.ListFieldValues}>
          {props.value.value.map(v => {
            return (
              <div key={props.value.getId(v)} className={s.ListFieldValue}>
                {v}
                {props.value.onRemove && (
                  <button type="button" className={s.ListFieldRemoveValue} onClick={() => props.value.onRemove!(props.value.getId(v))}>
                    <SvgIcon svg={removeIcon} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div>
        {props.value.options?.map(opt => {
          return (
            <div key={props.value.getId(opt)}>
              {props.value.render(opt)}
            </div>
          );
        })}
      </div>
    </div>
  )
}

export type InputProps = {
  placeholder: string,
  value: string,
  onChange: (v: string) => void,
  onEnter: () => void,
  isWithValues: boolean
  iconSvg?: string,
  focusOnMount?: boolean
}
const Input: React.FC<InputProps> = ({ value, placeholder, iconSvg, onChange, onEnter, isWithValues, focusOnMount }) => {
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
        className={`${s.InputInput} ${iconSvg ? s.InputInputWithIcon : ''} ${isWithValues ? s.InputInputWithValues : ''}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onEnter();
          }
        }}
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

