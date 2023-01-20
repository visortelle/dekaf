import React from 'react';
import s from './MessageFieldsConfig.module.css'
import { MessageField, MessageFieldsConfig } from '../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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
import SvgIcon from '../../../../../ui/SvgIcon/SvgIcon';
import dragIcon from './drag.svg';
import Checkbox from '../../../../../ui/Checkbox/Checkbox';

export type MessageFieldsConfigProps = {
  value: MessageFieldsConfig,
  onChange: (value: MessageFieldsConfig) => void,
};

const MessageFieldsConfig: React.FC<MessageFieldsConfigProps> = (props) => {
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    const getNewItems = (items: MessageField[]): MessageField[] => {
      const oldIndex = findIndex(items, item => item.id === active.id);
      const newIndex = findIndex(items, item => item.id === over?.id);
      return arrayMove(items, oldIndex, newIndex);
    };

    if (active.id !== over?.id) {
      props.onChange({ fields: getNewItems(props.value.fields) });

    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className={s.MessageFieldsConfig}>
        <SortableContext
          items={props.value.fields}
          strategy={verticalListSortingStrategy}
        >
          {props.value.fields.map(item => (
            <SortableMessageField
              key={item.id}
              id={item.id}
              name={item.name}
              isActive={item.isActive}
              onIsActiveChange={(v) => {
                props.onChange({
                  fields: props.value.fields.map(f => {
                    if (f.id === item.id) {
                      return { ...f, isActive: v };
                    }
                    return f;
                  })
                });
              }}
            />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  );
}

type SortableMessageFieldProps = {
  id: string,
  name: string
  isActive: boolean,
  onIsActiveChange: (value: boolean) => void,
};
const SortableMessageField: React.FC<SortableMessageFieldProps> = (props) => {
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

  return (
    <div className={`${s.MessageField} ${isDragging ? s.DraggingMessageField : ''}`} ref={setNodeRef} style={style}>
      <div className={s.IsFieldActiveCheckbox}>
        <Checkbox
          checked={props.isActive}
          onChange={props.onIsActiveChange}
        />
      </div>

      <div className={s.FieldName}>
        {props.name}
      </div>

      <div className={s.DragIcon} {...attributes} {...listeners}>
        <SvgIcon svg={dragIcon} />
      </div>
    </div>
  );
}

export default MessageFieldsConfig;
