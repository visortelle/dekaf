import React, { useEffect, useState } from 'react';

import Input from '../../Input/Input';
import SmallButton from '../../SmallButton/SmallButton';

import s from './KeyValueView.module.css';

type Props = {
  onDelete: (index: number) => void,
  convertedKeyValues: string[][],
  changeConvertedKeyValues: (array: string[][]) => void,
  changeValidity: (validity: boolean) => void,
}

type NewKeyValue = {
  key: string,
  value: string,
}

type UnvalidKeys = {
  [key: string]: number,
}

const KeyValueView = (props: Props) => {

  const {
    onDelete,
    convertedKeyValues,
    changeConvertedKeyValues,
    changeValidity,
  } = props;

  const defaultKeyValue = { key: '', value: '' };

  const [newKeyValue, setNewKeyValue] = useState<NewKeyValue>(defaultKeyValue);
  const [unvalidKeys, setUnvalidKeys] = useState<UnvalidKeys>();

  const addNewKey = () => {
    changeConvertedKeyValues([
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

  useEffect(() => {
    if (!unvalidKeys) {
      return;
    }

    let valid = true
    Object.keys(unvalidKeys).map(key => {
      if (unvalidKeys[key] > 1 && key !== newKeyValue.key || unvalidKeys[key] > 2) {
        valid = false
      }
    });

    changeValidity(valid);
  }, [unvalidKeys])

  return (
    <div>

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
                changeConvertedKeyValues(Object.assign([
                  ...convertedKeyValues],
                  {[index]: [v, keyValue[1]]}
                ))
                validateField(v, index)
              }}
            />
          </div>
          <div className={`${s.Field}`}>
            <Input
              value={keyValue[1]}
              onChange={(v) => changeConvertedKeyValues(Object.assign([
                ...convertedKeyValues],
                {[index]: [keyValue[0], v]}
              ))}
            />
          </div>
          <div className={`${s.ButtonBlock}`}>
            <SmallButton
              onClick={() => onDelete(index)}
              type='danger'
              text='Delete'
              className={s.Button}
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
          />
        </div>
      </div>

    </div>
  )
}

export default KeyValueView