import _ from 'lodash';
import React, { useEffect, useState } from 'react';

import Button from '../../Button/Button';
import { H3 } from '../../H/H';
import Input from '../../Input/Input';
import SmallButton from '../../SmallButton/SmallButton';
import { KeyValues } from '../KeyValueEditor';

import s from '../KeyValueEditor.module.css';

type Props = {
  changeView: (array: KeyValues) => void,
  deleteKeyValue: (key: string) => void,
  saveChanges: (array: KeyValues) => void,
  keyValues: KeyValues,
  initialData: KeyValues,
}

type NewKeyValue = {
  key: string,
  value: string,
}

type UnvalidKeys = {
  [key: string]: number
}

const KeyValueView = (props: Props) => {

  const {
    changeView,
    deleteKeyValue,
    saveChanges,
    keyValues,
    initialData,
  } = props;

  const defaultKeyValue = { key: '', value: '' }

  const [newKeyValue, setNewKeyValue] = useState<NewKeyValue>(defaultKeyValue)
  const [convertedKeyValues, setConvertedKeyValues] = useState<string[][]>(Object.entries(keyValues))
  const [isValid, setIsValid] = useState(true)
  const [unvalidKeys, setUnvalidKeys] = useState<UnvalidKeys>()

  const addNewKey = () => {
    setConvertedKeyValues([
      ...convertedKeyValues,
      [newKeyValue.key, newKeyValue.value]
    ])
    setNewKeyValue(defaultKeyValue)
  }

  const fieldValidity = (key: string, index?: number) => {
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
    })

    setIsValid(valid)
  }, [unvalidKeys])

  return (
    <div style={{ padding: "0% 10%" }}>

      <div className={`${s.Line}  ${s.Titles}`}>
        <H3>
          KEY
        </H3>
        <H3>
          VALUE
        </H3>
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
                fieldValidity(v, index)
              }}
            />
          </div>
          <div className={`${s.Field}`}>
            <Input
              value={keyValue[1]}
              onChange={(v) => setConvertedKeyValues(Object.assign([
                ...convertedKeyValues],
                {[index]: [keyValue[0], v]}
              ))}
            />
          </div>
          <div className={`${s.ButtonBlock}`}>
            <SmallButton
              onClick={() => deleteKeyValue(keyValue[0])}
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
              fieldValidity(v)
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