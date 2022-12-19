import React, { useState } from 'react';

import Button from '../Button/Button';
import KeyValueView from './KeyValueView/KeyValueView';
import JsonView from './JsonView/JsonView';

import examples from './example.json'

import s from './KeyValueEditor.module.css'

export type KeyValues = {
  [key: string]: string
}

const KeyValueEditor = () => {
  const [keyValues, setKeyValues] = useState<KeyValues>(examples)
  const [jsonView, setJsonView] = useState(false)

  const addKeyValue = (key: string, value: string) => {
    setKeyValues({
      ...keyValues,
      [key]: value
    })
  }

  const deleteKeyValue = (key: string) => {
    const purifiedKeyValue = {...keyValues};
    delete purifiedKeyValue[key];
    setKeyValues(purifiedKeyValue)
  }

  const changeView = () => {
    setJsonView(!jsonView)
  }

  const changeKeyValues = (json: string) => {
    setKeyValues(JSON.parse(json))
  }

  return (
    <div className={`${s.KeyValueEditor}`}>
      {!jsonView &&
        <KeyValueView
          keyValues={keyValues}
          addKeyValue={addKeyValue}
          changeView={changeView}
          deleteKeyValue={deleteKeyValue}
        />
      }
      {jsonView &&
        <JsonView
          keyValues={keyValues}
          changeView={changeView}
          changeKeyValues={changeKeyValues}
          height="50vh"
        />
      }
    </div>
  )
}

export default KeyValueEditor;