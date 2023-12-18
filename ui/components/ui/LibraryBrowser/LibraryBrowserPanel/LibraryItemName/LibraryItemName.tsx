import React, { useState } from 'react';
import s from './LibraryItemName.module.css'
import { H3 } from '../../../H/H';
import SmallButton from '../../../SmallButton/SmallButton';
import * as Modals from '../../../../app/contexts/Modals/Modals';
import Input from '../../../Input/Input';
import Button from '../../../Button/Button';
import editIcon from './edit.svg';
import DeleteButton from '../../../DeleteButton/DeleteButton';

type EditNameFormProps = {
  initialValue: string,
  onSave: (v: string) => void,
  onCancel: () => void,
};
const EditNameForm: React.FC<EditNameFormProps> = (props) => {
  const [value, setValue] = useState(props.initialValue);

  return (
    <div className={s.EditNameForm}>
      <div className={s.EditNameFormContent}>
        <Input value={value} onChange={setValue} />
      </div>
      <div className={s.EditNameFormFooter}>
        <Button
          type='regular'
          text="Cancel"
          onClick={() => {
            props.onCancel();
          }}
        />
        <Button
          type='primary'
          text="Save"
          onClick={() => {
            props.onSave(value);
          }}
          disabled={value.length === 0}
        />
      </div>
    </div>
  );
}

export type LibraryItemNameProps = {
  value: string,
  onChange: (v: string) => void,
  isReadOnly?: boolean
};

const LibraryItemName: React.FC<LibraryItemNameProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <div className={s.LibraryItemName}>
      <H3>{props.value}</H3>
      {!props.isReadOnly && (
        <div className={s.Buttons}>
          <SmallButton
            svgIcon={editIcon}
            appearance='borderless-semitransparent'
            onClick={() => {
              modals.push({
                id: 'edit-library-item-name',
                title: 'Rename Library Item',
                content: (
                  <EditNameForm
                    initialValue={props.value}
                    onSave={(v) => {
                      props.onChange(v);
                      modals.pop();
                    }}
                    onCancel={modals.pop}
                  />
                ),
                styleMode: 'no-content-padding'
              });
            }}
          />
          <DeleteButton
            appearance='borderless-semitransparent'
            isHideText
            onClick={() => props.onChange('')}
            title="Remove library item name"
          />
        </div>
      )}
    </div>
  );
}

export default LibraryItemName;
