import React, { useState } from 'react';
import _ from 'lodash';

import KeyValueView from './KeyValueView/KeyValueView';
import JsonView from '../JsonView/JsonView';
import * as Notifications from '../../app/contexts/Notifications';
import SmallButton from '../SmallButton/SmallButton';

import s from './KeyValueEditor.module.css'

export type KeyValues = {
  [key: string]: string,
}

type Props = {
  height?: string,
  width?: string,
  keyValues: KeyValues
}

const KeyValueEditor = (props: Props) => {
  const [initialData, setInitialData] = useState<KeyValues>(props.keyValues)
  const [keyValues, setKeyValues] = useState<KeyValues>(initialData)
  const [jsonView, setJsonView] = useState(false)

  const [convertedKeyValues, setConvertedKeyValues] = useState<string[][]>(Object.entries(keyValues))
  const [isValid, setIsValid] = useState(true)
  const [resetKey, setResetKey] = useState(0)

  const { notifySuccess } = Notifications.useContext();

  const changeValidity = (validity: boolean) => {
    setIsValid(validity)
  }

  const saveChanges = (array: KeyValues) => {
    setInitialData(array)
    setKeyValues(array)

    notifySuccess(
      <span>Successfully save keys</span>,
      `keys-save`
    );
  }

  const changeConvertedKeyValues = (array: string[][]) => {
    setConvertedKeyValues(array)
  }
  const deleteKeyValue = (index: number) => {
    const copyKeyValues = [...convertedKeyValues]
    copyKeyValues.splice(index, 1)
    setConvertedKeyValues(copyKeyValues)
  }

  const jsonValidation = (json?: string) => {
    try {
      if (json) {
        const parsedJson = JSON.parse(json)
        setIsValid(true)
        setKeyValues(parsedJson)
      }
    } catch (err) {
      setIsValid(false)
    }
  }

  return (
    <div className={`${s.KeyValueEditor}`}>
      <div className={`${s.Line} ${s.LinkButton}`}>
        <SmallButton
          type="regular"
          onClick={() => {
            setKeyValues(initialData)
            setConvertedKeyValues(Object.entries(initialData))
            setResetKey(resetKey + 1)
            setIsValid(true)
          }}
          text="Reset"
        />
        <SmallButton
          type="primary"
          onClick={() => {
            jsonView ? saveChanges(keyValues) : 
            saveChanges(Object.fromEntries(convertedKeyValues))
          }}
          text="Save"
          disabled={
            !isValid ||
            jsonView ? _.isEqual(keyValues, initialData) :
             _.isEqual(Object.fromEntries(convertedKeyValues), initialData) 
          }
        />
        <SmallButton
          type="primary"
          onClick={() => {
            setJsonView(!jsonView)
            jsonView ? setConvertedKeyValues(Object.entries(keyValues)) :
            setKeyValues(Object.fromEntries(convertedKeyValues))
          }}
          text="json view"
          disabled={!isValid}
        />
      </div>
      {!jsonView &&
        <KeyValueView
          deleteKeyValue={deleteKeyValue}
          convertedKeyValues={convertedKeyValues}
          changeConvertedKeyValues={changeConvertedKeyValues}
          changeValidity={changeValidity}
        />
      }
      {jsonView &&
        <JsonView
          key={resetKey}
          json={JSON.stringify(keyValues)}
          height={props.height || '50vh'}
          width={props.width || '100%'}
          readonly={false}
          onChange={jsonValidation}
        />
      }
    </div>
  )
}

export default KeyValueEditor;