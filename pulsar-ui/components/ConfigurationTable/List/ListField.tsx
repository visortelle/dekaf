import { ConfigurationField, ListValue, Value } from "../values";
import s from './ListField.module.css'
import SvgIcon from '../../ui/SvgIcon/SvgIcon';
import removeIcon from '!!raw-loader!./remove.svg';
import { useState } from "react";
import * as Either from 'fp-ts/Either';

export function ListField<V extends Value>(props: ConfigurationField<ListValue<V>>): React.ReactElement {
  const [editorValue, setEditorValue] = useState<V | undefined>(props.value.editor?.initialValue);
  const isRenderEditor = typeof props.value.editor?.render !== 'undefined' && typeof props.value.editor.initialValue !== 'undefined';

  const valid: Either.Either<Error, void> = typeof editorValue === 'undefined' ?
    Either.left(new Error('The value is undefined')) :
    props.value.isValid(editorValue);

  const add = () => {
    if (Either.isLeft(valid)) {
      return
    }
    props.value.onAdd && props.value.onAdd(editorValue!)
    setEditorValue(() => props.value.editor?.initialValue);
  }

  return (
    <div className={s.ListField}>
      {props.value.value.length !== 0 && (
        <div className={s.ListFieldValues}>
          {props.value.value.map(v => {
            return (
              <div key={props.value.getId(v)} className={s.ListFieldValue}>
                {props.value.render(v)}
                {props.value.onRemove && (
                  <button type="button" className={s.ListFieldRemoveValue} onClick={() => props.value.onRemove!(props.value.getId(v))}>
                    <SvgIcon svg={removeIcon} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {isRenderEditor && (
        <div className={s.Editor} onKeyDown={(e) => {
          if (e.key === 'Enter' && Either.isRight(valid)) {
            add();
          }
        }}>
          {props.value.editor?.render(editorValue!, (v) => setEditorValue(v))}
        </div>
      )}
      {props.value.onAdd && (
        <button
          className={`${s.AddButton} ${Either.isRight(valid) ? s.AddButtonEnabled : s.AddButtonDisabled}`}
          type="button"
          onClick={add}
        >
          Add
        </button>
      )}
    </div>
  )
}
