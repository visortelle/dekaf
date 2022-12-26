import React, { useEffect, useState } from 'react';

import Input from '../../Input/Input';
import SmallButton from '../../SmallButton/SmallButton';
import { KeyValues } from '../KeyValueEditor';

import s from './KeyValueView.module.css';

type Props = {
  onChange: (v: KeyValues) => void,
  changeValidity: (validity: boolean) => void,
  maxHeight: string,
  testId?: string,
  value: KeyValues,
}

type NewKeyValue = {
  key: string,
  value: string,
}

type UnvalidKeys = {
  [key: string]: number,
}

const KeyValueView = (props: Props) => {

  const defaultKeyValue = { key: '', value: '' };

  const [newKeyValue, setNewKeyValue] = useState<NewKeyValue>(defaultKeyValue);
  const [unvalidKeys, setUnvalidKeys] = useState<UnvalidKeys>();
  const [convertedKeyValues, setConvertedKeyValues] = useState(Object.entries(props.value))

  const addNewKey = () => {
    setConvertedKeyValues([
      ...convertedKeyValues,
      [newKeyValue.key, newKeyValue.value]
    ]);
    setNewKeyValue(defaultKeyValue);
  }

  const validateField = (key: string, index?: number) => {
    let repeating = 1;

    convertedKeyValues.map((keyValue) => {
      if (keyValue[0] === key) {
        repeating++
      }
    })

    if (newKeyValue.key === key && index) [
      repeating++
    ]

    if (!unvalidKeys) {
      setUnvalidKeys({[key]: repeating})
    } else if (index) {
      setUnvalidKeys({
        ...unvalidKeys,
        [key]: repeating,
        [convertedKeyValues[index][0]]: unvalidKeys[convertedKeyValues[index][0]] - 1
      })
    } else {
      setUnvalidKeys({
        ...unvalidKeys,
        [key]: repeating,
        [newKeyValue.key]: unvalidKeys[newKeyValue.key] - 1
      })
    }
  }

  const onDelete = (index: number) => {
    const copyKeyValues = [...convertedKeyValues];
    copyKeyValues.splice(index, 1);
    setConvertedKeyValues(copyKeyValues);
  }

  useEffect(() => {
    if (!unvalidKeys) {
      return;
    }

    let valid = true;
    Object.keys(unvalidKeys).map(key => {
      if (unvalidKeys[key] > 1 && key !== newKeyValue.key || unvalidKeys[key] > 2) {
        valid = false;
      }
    });

    props.changeValidity(valid);
  }, [unvalidKeys]);

  useEffect(() => {
    props.onChange(Object.fromEntries(convertedKeyValues));
  }, [convertedKeyValues]);

  return (
    <div className={`${s.List}`} style={{ maxHeight: props.maxHeight }} >

      <div className={`${s.Line}  ${s.Titles}`}>
        <span>
          Key
        </span>
        <span>
          Value
        </span>
      </div>
      
      {convertedKeyValues.map((keyValue, index) => (
        <div className={`${s.Line}`}>

          <div className={`${s.Field} ${unvalidKeys && unvalidKeys[keyValue[0]] > 1 && s.ErrorField}`}>
            <Input 
              type="text"
              value={keyValue[0]}
              onChange={(v) => {
                setConvertedKeyValues(Object.assign([
                  ...convertedKeyValues],
                  {[index]: [v, keyValue[1]]}
                ))
                validateField(v, index)
              }}
              testId={`key-${keyValue[0]}-${props.testId}`}
            />
          </div>
          <div className={`${s.Field}`}>
            <Input
              value={keyValue[1]}
              onChange={(v) => setConvertedKeyValues(Object.assign(
                [...convertedKeyValues],
                {[index]: [keyValue[0], v]}
              ))}
              testId={`value-${keyValue[1]}-${props.testId}`}
            />
          </div>
          <div className={`${s.ButtonBlock}`}>
            <SmallButton
              onClick={() => onDelete(index)}
              type='danger'
              text='Delete'
              className={s.Button}
              testId={`key-value-delete-${keyValue[0]}-${props.testId}`}
            />
          </div>
        </div>
      ))}

      <div className={`${s.Line}`}>
        <div className={`${s.Field} ${unvalidKeys && unvalidKeys[newKeyValue.key] > 1 && s.ErrorField}`}>
          <Input
            placeholder='new-key'
            value={newKeyValue.key}
            onChange={(v) => {
              setNewKeyValue({
                ...newKeyValue,
                key: v
              })
              validateField(v)
            }}
            testId={`new-key-${props.testId}`}
          />
        </div>
        <div className={`${s.Field}`}>
          <Input
            placeholder='new-value'
            value={newKeyValue.value}
            onChange={(v) => setNewKeyValue({
              ...newKeyValue,
              value: v
            })}
            testId={`new-value-${props.testId}`}
          />
        </div>
        <div className={`${s.ButtonBlock}`}>
          <SmallButton
            onClick={() => addNewKey()}
            type="primary"
            text="Add"
            className={s.Button}
            disabled={
              newKeyValue.key.length === 0 ||
              newKeyValue.value.length === 0 ||
              unvalidKeys && unvalidKeys[newKeyValue.key] > 1
            }
            testId={`key-value-add-${props.testId}`}
          />
        </div>
      </div>

    </div>
  )
}

export default KeyValueView