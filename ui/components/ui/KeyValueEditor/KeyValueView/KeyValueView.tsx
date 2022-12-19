import React, { useState } from 'react';

import ActionButton from '../../ActionButton/ActionButton';
import Button from '../../Button/Button';
import { H3 } from '../../H/H';
import Input from '../../Input/Input';
import { KeyValues } from '../KeyValueEditor';

import s from '../KeyValueEditor.module.css';

type Props = {
  addKeyValue: (key: string, value: string) => void,
  changeView: () => void,
  deleteKeyValue: (key: string) => void,
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
    keyValues,
  } = props;

  const defaultKeyValue = { key: '', value: '' }

  const [newKeyValue, setNewKeyValue] = useState<NewKeyValue>(defaultKeyValue)

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
        
        {Object.keys(keyValues).map(key => (
          <div className={`${s.Line}`}>
            {/* <Input 
              type="text"
              value={key}
              onChange={(v) => delete Object.assign(keyValues, {[v]: keyValues[key] })[key]}
            />
            <Input
              value={keyValues[key]}
              onChange={(v) => setKeyValues({
                ...keyValues,
                [key]: v
              })}
            /> */}
            <div className={`${s.Field}`}>
              {key}
            </div>
            <div className={`${s.Field}`}>
              {keyValues[key]}
            </div>

            <div>
              <ActionButton
                action={{ type: 'predefined', action: 'edit' }}
                onClick={() => undefined}
              />
              <ActionButton
                action={{ type: 'predefined', action: "close" }}
                onClick={() => deleteKeyValue(key)}
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