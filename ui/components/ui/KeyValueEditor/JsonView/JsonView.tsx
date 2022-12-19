import React, { useState } from 'react';
import MonacoEditor from "@monaco-editor/react";

import { KeyValues } from '../KeyValueEditor';
import Button from '../../Button/Button';

import s from '../KeyValueEditor.module.css';

type Props = {
  keyValues: KeyValues,
  height: string,
  changeView: () => void,
  convertFromJson: (json: string) => void,
}

const JsonView = (props: Props) => {

  const { keyValues, changeView, convertFromJson, height } = props

  const [json, setJson] = useState(JSON.stringify(keyValues))

  return (
    <>
      <div className={`${s.Line} ${s.LinkButton}`}>
        <Button
          type="primary"
          onClick={() => {
            convertFromJson(json)
            changeView()
          }}
          text="Key-Value view"
        />
      </div>
      <div>
        <MonacoEditor
          language="json"
          theme="vs-light"
          height={height}
          defaultValue={JSON.stringify(keyValues, null, 2)}
          onChange={(value) => {setJson(value || '')}}
        />
      </div>
    </>
  )
}

export default JsonView