import { useState } from 'react';

import Input from '../../Input/Input';
import SmallButton from '../../SmallButton/SmallButton';
import { IndexedKv } from '../KeyValueEditor';
import s from './KeyValueView.module.css';
import st from '../../SimpleTable/SimpleTable.module.css';
import deleteIcon from './icons/delete.svg';
import createIcon from './icons/create.svg';
import { cloneDeep } from 'lodash';

type Props = {
  onChange: (v: IndexedKv) => void,
  changeValidity: (validity: boolean) => void,
  maxHeight: string,
  testId?: string,
  mode?: 'edit' | 'readonly',
  value: IndexedKv,
}

type NewKeyValue = {
  key: string,
  value: string,
}

const defaultKeyValue = { key: '', value: '' };

const KeyValueView = (props: Props) => {
  const [newKeyValue, setNewKeyValue] = useState<NewKeyValue>(defaultKeyValue);

  const onAdd = () => {
    const newKvs = props.value.concat(newKeyValue);
    props.onChange(newKvs);

    setNewKeyValue(defaultKeyValue);
  }

  const onKvValueChange = (index: number, value: string) => {
    const oldKv = props.value[index];
    const newKv = { ...oldKv, value };

    const newKvs = cloneDeep(props.value);
    newKvs[index] = newKv;

    props.onChange(newKvs);
  };

  const onKvKeyChange = (index: number, key: string) => {
    const oldKv = props.value[index];
    const newKv = { ...oldKv, key };

    const newKvs = cloneDeep(props.value);
    newKvs[index] = newKv;

    props.onChange(newKvs);
  };

  const onDelete = (index: number) => {
    const newValue = props.value.filter((_, i) => i !== index);
    props.onChange(newValue);
  }

  const isReadOnly = props.mode === 'readonly';

  return (
    <div className={`${s.KeyValueView}`} style={{ maxHeight: props.maxHeight }}>
      <table className={st.Table}>
        <thead>
          <tr className={st.Row}>
            <td className={st.HeaderCell}>Key</td>
            <td className={st.HeaderCell}>Value</td>
            {!isReadOnly && <td className={st.HeaderCell}></td>}
          </tr>
        </thead>

        <tbody>
          {props.value.map((kv, index) => (
            <tr className={st.Row} key={index}>
              <td className={`${st.Cell} ${s.InputCell}`}>
                <Input
                  isSmall
                  type="text"
                  value={kv.key}
                  onChange={(v) => onKvKeyChange(index, v)}
                  testId={`key-${kv.key}-${props.testId}`}
                  isError={false}
                  appearance='no-borders'
                  inputProps={{ disabled: isReadOnly }}
                />
              </td>

              <td className={`${st.Cell} ${s.InputCell}`}>
                <Input
                  isSmall
                  value={kv.value}
                  onChange={(v) => onKvValueChange(index, v)}
                  testId={`value-${kv.value}-${props.testId}`}
                  appearance='no-borders'
                  inputProps={{ disabled: isReadOnly }}
                />
              </td>

              {!isReadOnly && (
                <td className={`${st.Cell} ${s.ButtonCell}`}>
                  <SmallButton
                    onClick={() => onDelete(index)}
                    type='danger'
                    className={s.Button}
                    svgIcon={deleteIcon}
                    title={`Delete key-value pair`}
                    testId={`key-value-delete-${kv.key}-${props.testId}`}
                  />
                </td>
              )}
            </tr>
          ))}

          {!isReadOnly && (
            <tr className={st.Row}>
              <td className={`${st.Cell} ${s.InputCell}`}>
                <Input
                  isSmall
                  placeholder='New key'
                  value={newKeyValue.key}
                  onChange={(v) => {
                    setNewKeyValue({
                      ...newKeyValue,
                      key: v
                    })
                  }}
                  testId={`new-key-${props.testId}`}
                  appearance='no-borders'
                />
              </td>
              <td className={`${st.Cell} ${s.InputCell}`}>
                <Input
                  isSmall
                  placeholder='New value'
                  value={newKeyValue.value}
                  onChange={(v) => setNewKeyValue({
                    ...newKeyValue,
                    value: v
                  })}
                  testId={`new-value-${props.testId}`}
                  appearance='no-borders'
                />
              </td>
              <td className={`${st.Cell} ${s.ButtonCell}`}>
                <SmallButton
                  onClick={() => onAdd()}
                  type="primary"
                  svgIcon={createIcon}
                  title='Add new key-value pair'
                  className={s.Button}
                  disabled={
                    newKeyValue.key.length === 0 ||
                    newKeyValue.value.length === 0
                  }
                  testId={`key-value-add-${props.testId}`}
                />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default KeyValueView
