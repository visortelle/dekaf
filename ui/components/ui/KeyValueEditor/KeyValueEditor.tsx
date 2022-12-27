import React, { useState } from 'react';
import _ from 'lodash';
import stringify from 'safe-stable-stringify';

import KeyValueView from './KeyValueView/KeyValueView';
import JsonView from '../JsonView/JsonView';
import SmallButton from '../SmallButton/SmallButton';
import WithUpdateConfirmation from "../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";

import s from './KeyValueEditor.module.css';

export type KeyValues = {
  [key: string]: string,
}

type Props = {
  height?: string,
  width?: string,
  keyValues: KeyValues,
  testId?: string,
  onSave: (keyValues: KeyValues) => Promise<void>,
}

const KeyValueEditor = (props: Props) => {
  const [jsonView, setJsonView] = useState(false);
  const [isValid, setIsValid] = useState(true);

  const changeValidity = (validity: boolean) => {
    setIsValid(validity);
  }

  return (
    <WithUpdateConfirmation<KeyValues>
      key={stringify(props.keyValues)}
      initialValue={props.keyValues}
      onConfirm={props.onSave}
    >
      {({ value, onChange }) => (
          <div className={`${s.KeyValueEditor}`}>
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
    </WithUpdateConfirmation>
  )
}

export default KeyValueEditor;