import s from './ListInput.module.css'
import SvgIcon from '../../SvgIcon/SvgIcon';
import removeIcon from './remove.svg';
import { ReactElement, useEffect, useState } from "react";
import * as Either from 'fp-ts/Either';
import NothingToShow from '../../NothingToShow/NothingToShow';
import AddButton from '../../AddButton/AddButton';
import { tooltipId } from '../../Tooltip/Tooltip';
import dragIcon from './drag.svg';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  rectIntersection,
  useDndMonitor,
} from '@dnd-kit/core';
import {
  useSortable,
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { findIndex } from 'lodash';

type Id = string;
type EditorValue<T> = T | undefined;

export type Editor<T> = {
  render: (value: T, onChange: (value: T) => void) => React.ReactElement;
  initialValue: EditorValue<T>;
};

export type ListValue<T> = {
  value: T[];
  renderItem: (value: T, i: number, isCompact: boolean) => React.ReactElement;
  editor?: Editor<T>;
  getId: (value: T) => Id;
  shouldShowError?: (value: T) => boolean;
  validate?: (value: T, list: T[]) => Either.Either<Error, void>;
  onRemove?: (id: Id) => void;
  onAdd?: (value: T) => void;
  onChange?: (value: T[]) => void;
  testId?: string;
  itemName?: string;
  isHideNothingToShow?: boolean;
  isContentDoesntOverlapRemoveButton?: boolean;
  nothingToShowContent?: React.ReactNode;
};

function ListInput<T>(props: ListValue<T>): React.ReactElement {
  const [editorValue, setEditorValue] = useState<EditorValue<T>>(props.editor?.initialValue);
  const isRenderEditor = typeof props.editor?.render !== 'undefined';

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { delay: 100, tolerance: 50 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    const getNewItems = (items: T[]): T[] => {
      const oldIndex = findIndex(items, item => props.getId(item) === active.id);
      const newIndex = findIndex(items, item => props.getId(item) === over?.id);
      return arrayMove(items, oldIndex, newIndex);
    };

    if (active.id !== over?.id && props.onChange !== undefined) {
      props.onChange(getNewItems(props.value));
    }
  }

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

  const sortableItems: { id: string, value: T }[] = props.value.map((v) => ({ id: props.getId(v), value: v }));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      autoScroll={false}
      onDragEnd={handleDragEnd}
    >
      <div className={s.ListField} data-testid={props.testId}>
        {!props.isHideNothingToShow && props.value.length === 0 && <NothingToShow content={props.nothingToShowContent} />}
        {sortableItems.length !== 0 && (
          <div className={s.ListFieldValues}>
            <SortableContext
              items={sortableItems}
              strategy={verticalListSortingStrategy}
            >
              {sortableItems.map((v, i) => {
                return (
                  <SortableItem<T>
                    key={v.id}
                    id={v.id}
                    index={i}
                    listProps={props}
                    value={v.value}
                  />
                );
              })}
            </SortableContext>
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
    </DndContext>
  )
}

type SortableItemProps<T> = {
  id: string,
  value: T,
  index: number,
  listProps: ListValue<T>,
};
function SortableItem<T>(props: SortableItemProps<T>): ReactElement {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const listProps = props.listProps;

  const [isCompactMode, setIsCompactMode] = useState(false);

  useDndMonitor({
    onDragStart: () => setIsCompactMode(true),
    onDragEnd: () => setIsCompactMode(false)
  });

  return (
    <div
      className={`
        ${s.ListFieldValue} ${typeof listProps.onRemove === 'undefined' ? '' : s.RemovableListFieldValue}
        ${listProps.isContentDoesntOverlapRemoveButton ? s.RemovableListFieldValueWithoutPadding : ''}
        ${isDragging ? s.DraggingItem : ''}
      `}
      ref={setNodeRef} style={style}
    >
      {props.listProps.renderItem(props.value, props.index, isCompactMode)}
      {listProps.onRemove && (
        <button
          type="button"
          className={s.ListFieldRemoveValue}
          onClick={() => listProps.onRemove!(props.id)}
          data-tooltip-id={tooltipId}
          data-data-tooltip-html={renderToStaticMarkup(
            <div>
              {listProps.itemName === undefined ? 'Remove this item' : `Remove this ${listProps.itemName}`}
            </div>
          )}
        >
          <SvgIcon svg={removeIcon} />
        </button>
      )}

      <div className={s.DragIcon} {...attributes} {...listeners}>
        <SvgIcon svg={dragIcon} />
      </div>
    </div>
  );
}

export default ListInput;
