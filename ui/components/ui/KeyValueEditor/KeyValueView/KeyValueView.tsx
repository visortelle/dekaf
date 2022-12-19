import React, { useEffect, useState } from 'react';

import Button from '../../Button/Button';
import { H3 } from '../../H/H';
import Input from '../../Input/Input';
import SmallButton from '../../SmallButton/SmallButton';
import { KeyValues } from '../KeyValueEditor';

import s from '../KeyValueEditor.module.css';

type Props = {
  changeView: () => void,
  deleteKeyValue: (key: string) => void,
  convertFromArray: (array: string[][]) => void,
  keyValues: KeyValues,
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
    convertFromArray,
    keyValues,
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

  // const validityNewKey = (key: string) => {
  //   if (convertedKeyValues.find((keyValue) => keyValue[0] === key)) {
  //     return true
  //   } else {
  //     return false
  //   }
  // }

  // useEffect(() => {
  //   const newUnvalidKeys: UnvalidKeys = {}
  //   convertedKeyValues.map((сheckedKeyValue, checkedIndex) => {
  //     convertedKeyValues.map((keyValue, index) => {
  //       if (index !== checkedIndex && сheckedKeyValue[0] === keyValue[0]) {
  //         setIsValid(false)
  //         newUnvalidKeys[сheckedKeyValue[0]]= true
  //       }
  //     })
  //   })

  //   setUnvalidKeys(newUnvalidKeys)

  // }, [convertedKeyValues])

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

  return (
    <>
      <div className={`${s.Line} ${s.LinkButton}`}>
        <Button
          type="primary"
          onClick={() => convertFromArray(convertedKeyValues)}
          text="Save"
          disabled={!isValid}
        />
        <Button
          type="primary"
          onClick={() => changeView()}
          text="JSON view"
          disabled={!isValid}
        />
      </div>
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
                unvalidKeys && unvalidKeys[newKeyValue.key] > 0
              }
            />
          </div>
        </div>

      </div>
    </>
  )
}

export default KeyValueView