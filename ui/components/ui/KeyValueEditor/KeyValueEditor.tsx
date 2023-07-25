import React, { useState } from 'react';

import KeyValueView from './KeyValueView/KeyValueView';
import JsonView from '../JsonView/JsonView';
import SmallButton from '../SmallButton/SmallButton';

import s from './KeyValueEditor.module.css';

export type KeyValues = {
  [key: string]: string,
}

type Props =  {
  height?: string,
  width?: string,
  value: KeyValues,
  testId?: string,
  onChange: (keyValues: KeyValues) => void,
  className?: string,
}

const KeyValueEditor = (props: Props) => {

  const { onChange, value } = props;

  const [jsonView, setJsonView] = useState(false);
  const [isValid, setIsValid] = useState(true);

  const changeValidity = (validity: boolean) => {
    setIsValid(validity);
  }

  return (
    <div className={`${s.KeyValueEditor} ${props.className}`}>
      <div className={`${s.Line} ${s.LinkButton} ${!jsonView && s.JsonViewButton}`}>
        <SmallButton
          type="regular"
          onClick={() => {
            setJsonView(!jsonView)
          }}
          text={jsonView ? 'View as list' : 'View as JSON'}
          disabled={!isValid}
          testId={`key-value-display-changer-${props.testId}`}
        />
      </div>
      {!jsonView &&
        <KeyValueView
          value={value}
          onChange={onChange}
          changeValidity={changeValidity}
          maxHeight={props.height || '50vh'}
          testId={props.testId}
        />
      }
      {jsonView &&
        <JsonView
          value={value}
          onChange={onChange}
          changeValidity={changeValidity}
          height={props.height || '50vh'}
          width={props.width || '100%'}
          readonly={false}
        />
      }
    </div>
  )
}

export default KeyValueEditor;
