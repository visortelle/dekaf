import React, { useState } from 'react';

import KeyValueView from './KeyValueView/KeyValueView';
import JsonView from './JsonView/JsonView';
import * as Notifications from '../../app/contexts/Notifications';

import examples from './example.json'

import s from './KeyValueEditor.module.css'

export type KeyValues = {
  [key: string]: string
}

const KeyValueEditor = () => {
  const [initialData, setInitialData] = useState<KeyValues>(examples)
  const [keyValues, setKeyValues] = useState<KeyValues>(initialData)
  const [jsonView, setJsonView] = useState(false)

  const { notifySuccess } = Notifications.useContext();

  const deleteKeyValue = (key: string) => {
    const purifiedKeyValue = {...keyValues};
    delete purifiedKeyValue[key];
    setKeyValues(purifiedKeyValue)
  }

  const changeView = (array: KeyValues) => {
    setKeyValues(array)
    setJsonView(!jsonView)
  }

  const saveChanges = (array: KeyValues) => {
    setInitialData(array)
    setKeyValues(array)

    notifySuccess(
      <span>Successfully save keys</span>,
      `keys-save`
    );
  }

  return (
    <div className={`${s.KeyValueEditor}`}>
      
      {!jsonView &&
        <KeyValueView
          keyValues={keyValues}
          changeView={changeView}
          deleteKeyValue={deleteKeyValue}
          saveChanges={saveChanges}
          initialData={initialData}
        />
      }
      {jsonView &&
        <JsonView
          keyValues={keyValues}
          changeView={changeView}
          height="50vh"
        />
      }
    </div>
  )
}

export default KeyValueEditor;