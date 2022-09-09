import React from 'react';
import s from './JsonView.module.css'
import ReactJson from 'react-json-view';

export type JsonViewProps = {
  json: string;
};

const JsonView: React.FC<JsonViewProps> = (props) => {
  return (
    <div className={s.JsonView}>
      <ReactJson src={JSON.parse(props.json)} />
    </div>
  );
}

export default JsonView;
