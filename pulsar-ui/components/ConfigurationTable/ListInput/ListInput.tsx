import s from './ListInput.module.css'
import SvgIcon from '../../ui/SvgIcon/SvgIcon';
import removeIcon from '!!raw-loader!./remove.svg';
import { useState } from "react";
import * as Either from 'fp-ts/Either';

export type Editor<T> = {
  render: (value: T, onChange: (value: T) => void) => React.ReactElement;
  initialValue: T;
};

export type ListValue<T> = {
  value: T[];
  renderItem: (value: T) => React.ReactElement;
  editor?: Editor<T>;
  getId: (value: T) => string;
  isValid: (value: T) => Either.Either<Error, void>;
  onRemove?: (id: ReturnType<ListValue<T>["getId"]>) => void;
  onAdd?: (value: T) => void;
};

function ListInput<T>(props: ListValue<T>): React.ReactElement {
  const [editorValue, setEditorValue] = useState<T | undefined>(props.editor?.initialValue);
  const isRenderEditor = typeof props.editor?.render !== 'undefined' && typeof props.editor.initialValue !== 'undefined';

  const valid: Either.Either<Error, void> = typeof editorValue === 'undefined' ?
    Either.left(new Error('The value is undefined')) :
    props.isValid(editorValue);

  const add = () => {
    if (Either.isLeft(valid)) {
      return
    }
    props.onAdd && props.onAdd(editorValue!)
    setEditorValue(() => props.editor?.initialValue);
  }

  return (
    <div className={s.ListField}>
      {props.value.length !== 0 && (
        <div className={s.ListFieldValues}>
          {props.value.map(v => {
            return (
              <div key={props.getId(v)} className={s.ListFieldValue}>
                {props.renderItem(v)}
                {props.onRemove && (
                  <button type="button" className={s.ListFieldRemoveValue} onClick={() => props.onRemove!(props.getId(v))}>
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
          {props.editor?.render(editorValue!, (v) => setEditorValue(v))}
        </div>
      )}
      {props.onAdd && (
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

export default ListInput;
