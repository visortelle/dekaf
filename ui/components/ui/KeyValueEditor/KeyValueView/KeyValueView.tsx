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

type InvalidKeys = {
  [key: string]: number,
}

const KeyValueView = (props: Props) => {

  const defaultKeyValue = { key: '', value: '' };

  const [newKeyValue, setNewKeyValue] = useState<NewKeyValue>(defaultKeyValue);
  const [invalidKeys, setInvalidKeys] = useState<InvalidKeys>();
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

    if (!invalidKeys) {
      setInvalidKeys({ [key]: repeating })
    } else if (index) {
      setInvalidKeys({
        ...invalidKeys,
        [key]: repeating,
        [convertedKeyValues[index][0]]: invalidKeys[convertedKeyValues[index][0]] - 1
      })
    } else {
      setInvalidKeys({
        ...invalidKeys,
        [key]: repeating,
        [newKeyValue.key]: invalidKeys[newKeyValue.key] - 1
      })
    }
  }

  const onDelete = (index: number) => {
    const copyKeyValues = [...convertedKeyValues];
    copyKeyValues.splice(index, 1);
    setConvertedKeyValues(copyKeyValues);
  }

  useEffect(() => {
    if (!invalidKeys) {
      return;
    }

    let valid = true;
    Object.keys(invalidKeys).map(key => {
      if (invalidKeys[key] > 1 && key !== newKeyValue.key || invalidKeys[key] > 2) {
        valid = false;
      }
    });

    props.changeValidity(valid);
  }, [invalidKeys]);

  useEffect(() => {
    props.onChange(Object.fromEntries(convertedKeyValues));
  }, [convertedKeyValues]);

  return (
    <div className={`${s.List}`} style={{ maxHeight: props.maxHeight }} >
      <div className={`${s.Row} ${s.Header}`}>
        <span>
          Key
        </span>
        <span>
          Value
        </span>
      </div>

      <div className={s.Rows}>
        {convertedKeyValues.map((keyValue, index) => (
          <div className={`${s.Row}`}>

            <div className={`${s.Field}`}>
              <Input
                type="text"
                value={keyValue[0]}
                onChange={(v) => {
                  setConvertedKeyValues(Object.assign([
                    ...convertedKeyValues],
                    { [index]: [v, keyValue[1]] }
                  ))
                  validateField(v, index)
                }}
                testId={`key-${keyValue[0]}-${props.testId}`}
                isError={invalidKeys && invalidKeys[keyValue[0]] > 1}
              />
            </div>
            <div className={`${s.Field}`}>
              <Input
                value={keyValue[1]}
                onChange={(v) => setConvertedKeyValues(Object.assign(
                  [...convertedKeyValues],
                  { [index]: [keyValue[0], v] }
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

        <div className={`${s.Row}`}>
          <div className={`${s.Field} ${invalidKeys && invalidKeys[newKeyValue.key] > 1 && s.ErrorField}`}>
            <Input
              placeholder='New key'
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
              placeholder='New value'
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
                invalidKeys && invalidKeys[newKeyValue.key] > 1
              }
              testId={`key-value-add-${props.testId}`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default KeyValueView
