import { useState } from 'react';

import KeyValueView from './KeyValueView/KeyValueView';
import JsonView from '../JsonView/JsonView';
import SmallButton from '../SmallButton/SmallButton';

import s from './KeyValueEditor.module.css';
import NothingToShow from '../NothingToShow/NothingToShow';

export type IndexedKv = { key: string, value: string }[];

export function recordToIndexedKv(record: Record<string, string>): IndexedKv {
  return Object.keys(record).map(key => ({ key, value: record[key] }));
}

export function recordFromIndexedKv(indexedKv: IndexedKv): Record<string, string> {
  return indexedKv.reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});
}

type Props = {
  height?: string,
  width?: string,
  value: IndexedKv,
  testId?: string,
  mode?: 'edit' | 'readonly',
  onChange: (keyValues: IndexedKv) => void,
}

const KeyValueEditor = (props: Props) => {

  const { onChange, value } = props;

  const [jsonView, setJsonView] = useState(false);
  const [isValid, setIsValid] = useState(true);

  const changeValidity = (validity: boolean) => {
    setIsValid(validity);
  }

  if (props.mode === 'readonly' && props.value.length === 0) {
    return <NothingToShow content="No entries" />
  }

  return (
    <div className={`${s.KeyValueEditor}`}>
      <div className={`${s.Line} ${s.LinkButton} ${!jsonView && s.JsonViewButton}`}>
        <SmallButton
          type="regular"
          style={{ transform: 'scale(0.85) translate(4rem, 0)' }}
          onClick={() => {
            setJsonView(!jsonView)
          }}
          text={jsonView ? 'As List' : 'As JSON'}
          disabled={!isValid}
          testId={`key-value-display-changer-${props.testId}`}
        />
      </div>
      {!jsonView &&
        <KeyValueView
          value={value}
          onChange={onChange}
          changeValidity={changeValidity}
          maxHeight={props.height || 'unset'}
          testId={props.testId}
          mode={props.mode}
        />
      }
      {jsonView &&
        <JsonView
          value={value}
          onChange={onChange}
          changeValidity={changeValidity}
          height={props.height || 'unset'}
          width={props.width || '100%'}
          readonly={false}
        />
      }
    </div>
  )
}

export default KeyValueEditor;
