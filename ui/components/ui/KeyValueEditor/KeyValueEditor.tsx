import React, { useState } from 'react';
import ActionButton from '../ActionButton/ActionButton';
import Button from '../Button/Button';
import Input from '../Input/Input';

import examples from './example.json'

import s from './KeyValueEditor.module.css'

const KeyValueEditor = () => {

  type KeyValues = {
    [key: string]: string
  }

  type NewKeyValue = {
    key: string,
    value: string,
  }

  const defaultKeyValue = {
    key: '',
    value: '',
  }
  const [keyValues, setKeyValues] = useState<KeyValues>(examples)
  const [newKeyValue, setNewKeyValue] = useState<NewKeyValue>(defaultKeyValue)

  return (
    <div className={`${s.KeyValueEditor}`}>
      <div className={`${s.Line} ${s.LinkButton}`}>
        <Button
          type="primary"
          onClick={() => undefined}
          text="JSON view"
        />
      </div>

      <div className={`${s.Line}`}>
        <div>
          KEY
        </div>
        <div>
          VALUE
        </div>
      </div>

      {Object.keys(keyValues).map(key => (
        <div className={`${s.Line}`}>
          <div>
            {key}
          </div>
          <div>
            {keyValues[key]}
          </div>
          {/* <Input
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
          <ActionButton
            action={{ type: 'predefined', action: 'edit' }}
            onClick={() => undefined}
          />
          <ActionButton
            action={{ type: 'predefined', action: "close" }}
            onClick={() => undefined}
          />
        </div>
      ))}

      <div className={`${s.Line}`}>
        <Input
          value={newKeyValue.key}
          onChange={(v) => setNewKeyValue({
            ...newKeyValue,
            key: v
          })}
        />
        <Input
          value={newKeyValue.value}
          onChange={(v) => setNewKeyValue({
            ...newKeyValue,
            value: v
          })}
        />
        <Button
          type="primary"
          onClick={() => undefined}
          text="Add"
        />
      </div>

    </div>
  )
}

export default KeyValueEditor;