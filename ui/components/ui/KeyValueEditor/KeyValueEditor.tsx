import React, { useState } from 'react';
import _ from 'lodash';

import KeyValueView from './KeyValueView/KeyValueView';
import JsonView from '../JsonView/JsonView';
import SmallButton from '../SmallButton/SmallButton';

import s from './KeyValueEditor.module.css';

export type KeyValues = {
  [key: string]: string,
}

type Props = {
  height?: string,
  width?: string,
  keyValues: KeyValues,
  onSave: (keyValues: KeyValues) => void,
}

const KeyValueEditor = (props: Props) => {
  const [keyValues, setKeyValues] = useState<KeyValues>(props.keyValues);
  const [jsonView, setJsonView] = useState(false);

  const [convertedKeyValues, setConvertedKeyValues] = useState<string[][]>(Object.entries(keyValues));
  const [isValid, setIsValid] = useState(true);
  const [resetKey, setResetKey] = useState(0);

  const changeValidity = (validity: boolean) => {
    setIsValid(validity);
  }

  const saveChanges = (array: KeyValues) => {
    props.onSave(array);
    setKeyValues(array);
  }

  const changeConvertedKeyValues = (array: string[][]) => {
    setConvertedKeyValues(array);
  }
  const onDelete = (index: number) => {
    const copyKeyValues = [...convertedKeyValues];
    copyKeyValues.splice(index, 1);
    setConvertedKeyValues(copyKeyValues);
  }

  const jsonValidation = (json?: string) => {
    try {
      if (json) {
        const parsedJson = JSON.parse(json);
        setIsValid(true);
        setKeyValues(parsedJson);
      }
    } catch (err) {
      setIsValid(false);
    }
  }

  return (
    <div className={`${s.KeyValueEditor}`}>
      <div className={`${s.Line} ${s.LinkButton} ${!jsonView && s.JsonViewButton}`}>
        <SmallButton
          type="regular"
          onClick={() => {
            setJsonView(!jsonView)
            jsonView ? setConvertedKeyValues(Object.entries(keyValues)) :
            setKeyValues(Object.fromEntries(convertedKeyValues))
          }}
          text={jsonView ? 'Json display' : 'List display'}
          disabled={!isValid}
        />
      </div>
      {!jsonView &&
        <KeyValueView
          onDelete={onDelete}
          convertedKeyValues={convertedKeyValues}
          changeConvertedKeyValues={changeConvertedKeyValues}
          changeValidity={changeValidity}
          maxHeight={props.height || '50vh'}
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
      <div className={`${s.Line} ${s.LinkButtons} ${jsonView && s.JsonViewButtons}`}>
        <SmallButton
          type="regular"
          onClick={() => {
            setKeyValues(props.keyValues)
            setConvertedKeyValues(Object.entries(props.keyValues))
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
            jsonView ? _.isEqual(keyValues, props.keyValues) :
             _.isEqual(Object.fromEntries(convertedKeyValues), props.keyValues) 
          }
        />
      </div>
    </div>
  )
}

export default KeyValueEditor;