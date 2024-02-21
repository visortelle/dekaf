import React, { useState } from 'react';
import s from './MarkdownInput.module.css'
import MarkdownPreview from './MarkdownPreview/MarkdownPreview';
import MarkdownEditor from './MarkdownEditor/MarkdownEditor';
import * as Modals from '../../app/contexts/Modals/Modals';
import SmallButton from '../SmallButton/SmallButton';
import editIcon from './edit.svg';
import Button from '../Button/Button';

export type MarkdownInputProps = {
  value: string,
  onChange: (v: string) => void
  maxHeight?: number,
  minHeight?: number,
  isReadOnly?: boolean,
  modalTitle?: string,
  isHidden?: boolean
};

const MarkdownInput: React.FC<MarkdownInputProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <div
      className={s.MarkdownInput}
      style={{
        maxHeight: props.maxHeight === undefined ? undefined : `${props.maxHeight}rem`,
        minHeight: props.minHeight === undefined ? undefined : `${props.minHeight}rem`
      }}
    >
      <div style={{ marginBottom: '8rem' }}>
        <MarkdownPreview markdown={props.value} isHidden={props.isHidden} />
      </div>
      {props.value === '' && <div className={s.EmptyMarkdown}>No content</div>}

      <div className={s.Buttons}>
        {!props.isReadOnly && (
          <SmallButton
            type='regular'
            svgIcon={editIcon}
            onClick={() => {
              modals.push({
                id: 'edit-markdown',
                title: props.modalTitle || 'Markdown Editor',
                content: (
                  <MarkdownEditorModalDialog
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
            appearance='borderless-semitransparent'
            text='Edit'
          />
        )}
      </div>

      {props.maxHeight !== undefined && props.value !== '' && (
        <div className={s.ViewFullScreen}>
          <div
            className={s.ViewFullScreenText}
            onClick={() => {
              modals.push({
                id: 'edit-markdown',
                title: props.modalTitle || 'Markdown Viewer',
                content: (
                  <div className={s.MarkdownPreview}>
                    <MarkdownPreview markdown={props.value} />
                  </div>
                ),
                styleMode: 'no-content-padding'
              });
            }}
          >
            {'View Full'}
          </div>
        </div>
      )}
    </div>
  );
}

const MarkdownEditorModalDialog = (props: { initialValue: string, onSave: (v: string) => void, onCancel: () => void }) => {
  const [value, setValue] = useState(props.initialValue);

  return (
    <div className={s.ModalDialog}>
      <MarkdownEditor
        value={value}
        onChange={setValue}
      />

      <div className={s.ModalDialogFooter}>
        <Button
          type='regular'
          onClick={props.onCancel}
          text='Cancel'
        />
        <Button
          type='primary'
          onClick={() => {
            props.onSave(value)
          }}
          text='Confirm'
        />
      </div>
    </div>
  );

}

export default MarkdownInput;
