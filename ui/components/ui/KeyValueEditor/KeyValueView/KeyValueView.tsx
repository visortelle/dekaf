import React, { useState } from 'react';

import ActionButton from '../../ActionButton/ActionButton';
import Button from '../../Button/Button';
import { H3 } from '../../H/H';
import Input from '../../Input/Input';
import SmallButton from '../../SmallButton/SmallButton';
import { KeyValues } from '../KeyValueEditor';

import s from '../KeyValueEditor.module.css';

type Props = {
  addKeyValue: (key: string, value: string) => void,
  changeView: () => void,
  deleteKeyValue: (key: string) => void,
  convertFromArray: (array: string[][]) => void,
  keyValues: KeyValues,
}

type NewKeyValue = {
  key: string,
  value: string,
}

const KeyValueView = (props: Props) => {

  const {
    addKeyValue,
    changeView,
    deleteKeyValue,
    convertFromArray,
    keyValues,
  } = props;

  const defaultKeyValue = { key: '', value: '' }

  const [newKeyValue, setNewKeyValue] = useState<NewKeyValue>(defaultKeyValue)
  const [convertedKeyValues, setConvertedKeyValues] = useState<string[][]>(Object.entries(keyValues))

  const addNewKey = () => {
    if (keyValues[newKeyValue.key] !== undefined) {
      return;
    }

    addKeyValue(newKeyValue.key, newKeyValue.value)
    setNewKeyValue(defaultKeyValue)
  }

  return (
    <>
      <div className={`${s.Line} ${s.LinkButton}`}>
        <Button
          type="primary"
          onClick={() => convertFromArray(convertedKeyValues)}
          text="Save"
        />
        <Button
          type="primary"
          onClick={() => changeView()}
          text="JSON view"
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

            <div className={`${s.Field}`}>
              <Input 
                type="text"
                value={keyValue[0]}
                onChange={(v) => setConvertedKeyValues(Object.assign([
                  ...convertedKeyValues],
                  {[index]: [v, keyValue[1]]}
                ))}
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
            <div>
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
          <div className={`${s.Field}`}>
            <Input
              placeholder='new-key'
              value={newKeyValue.key}
              onChange={(v) => setNewKeyValue({
                ...newKeyValue,
                key: v
              })}
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
          <Button
            type="primary"
            onClick={() => addNewKey()}
            text="Add"
            disabled={
              newKeyValue.key.length === 0 ||
              newKeyValue.value.length === 0
            }
          />
        </div>

      </div>
    </>
  )
}

export default KeyValueView