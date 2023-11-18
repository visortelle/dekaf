import s from './ListInput.module.css'
import SvgIcon from '../../SvgIcon/SvgIcon';
import removeIcon from './remove.svg';
import { useEffect, useState } from "react";
import * as Either from 'fp-ts/Either';
import NothingToShow from '../../NothingToShow/NothingToShow';
import AddButton from '../../AddButton/AddButton';

type Id = string;
type EditorValue<T> = T | undefined;

export type Editor<T> = {
  render: (value: T, onChange: (value: T) => void) => React.ReactElement;
  initialValue: EditorValue<T>;
};

export type ListValue<T> = {
  value: T[];
  renderItem: (value: T, i: number) => React.ReactElement;
  editor?: Editor<T>;
  getId: (value: T) => Id;
  shouldShowError?: (value: T) => boolean;
  validate?: (value: T, list: T[]) => Either.Either<Error, void>;
  onRemove?: (id: Id) => void;
  onAdd?: (value: T) => void;
  testId?: string;
  itemName?: string;
  isHideNothingToShow?: boolean;
  isContentDoesntOverlapRemoveButton?: boolean;
  nothingToShowContent?: React.ReactNode;
};

function ListInput<T>(props: ListValue<T>): React.ReactElement {
  const [editorValue, setEditorValue] = useState<EditorValue<T>>(props.editor?.initialValue);
  const isRenderEditor = typeof props.editor?.render !== 'undefined';

  useEffect(() => {
    setEditorValue(props.editor?.initialValue);
  }, [props.editor?.initialValue])

  let isShowError = true;
  if (props.shouldShowError !== undefined && editorValue !== undefined) {
    isShowError = props.shouldShowError(editorValue)
  }

  let validationResult: Either.Either<Error, void> = Either.right(undefined);
  if (props.validate !== undefined) {
    validationResult = typeof editorValue === 'undefined' ? Either.right(undefined) : props.validate(editorValue, props.value);
  }

  const add = () => {
    if (Either.isLeft(validationResult)) {
      return
    }
    props.onAdd && props.onAdd(editorValue!)
    setEditorValue(() => props.editor?.initialValue);
  }

  return (
    <div className={s.ListField} data-testid={props.testId}>
      {!props.isHideNothingToShow && props.value.length === 0 && <NothingToShow content={props.nothingToShowContent} />}
      {props.value.length !== 0 && (
        <div className={s.ListFieldValues}>
          {props.value.map((v, i) => {
            return (
              <div
                key={props.getId(v)}
                className={`
                  ${s.ListFieldValue} ${typeof props.onRemove === 'undefined' ? '' : s.RemovableListFieldValue}
                  ${props.isContentDoesntOverlapRemoveButton ? s.RemovableListFieldValueWithoutPadding : ''}
                `}>
                {props.renderItem(v, i)}
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
          if (e.key === 'Enter' && Either.isRight(validationResult)) {
            add();
          }
        }}>
          {props.editor?.render(editorValue!, (v) => setEditorValue(v))}
        </div>
      )}
      {isShowError && Either.isLeft(validationResult) && (
        <div className={s.Error}>
          {validationResult.left.message}
        </div>
      )}
      {props.onAdd && (
        <div className={s.AddButton}>
          <AddButton
            onClick={add}
            itemName={props.itemName}
            disabled={Either.isLeft(validationResult)}
          />
        </div>
      )}
    </div>
  )
}

export default ListInput;
