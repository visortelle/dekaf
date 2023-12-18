import React, { useEffect, useState } from 'react';
import s from './MarkdownInput.module.css'
import MarkdownPreview from './MarkdownPreview/MarkdownPreview';
import MarkdownEditor from './MarkdownEditor/MarkdownEditor';
import * as Modals from '../../app/contexts/Modals/Modals';

export type MarkdownInputProps = {
  value: string,
  onChange: (v: string) => void
  maxHeight?: number,
  minHeight?: number,
  isReadOnly?: boolean,
  modalTitle?: string,
  bottomButtonText?: string
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
      <MarkdownPreview markdown={props.value} />

      {!props.isReadOnly && (
        <div
          className={s.BottomButton}
          onClick={() => {
            modals.push({
              id: 'edit-markdown',
              title: props.modalTitle || 'Markdown Editor',
              content: (
                <MarkdownEditorModalHelper
                  value={props.value}
                  onChange={props.onChange}
                />
              )
            });
          }}
        >
          <div className={s.BottomButtonText}>{props.bottomButtonText || 'Edit'}</div>
        </div>
      )}
      {props.isReadOnly && (
        <div
          className={s.BottomButton}
          onClick={() => {
            modals.push({
              id: 'edit-markdown',
              title: props.modalTitle || 'Markdown Editor',
              content: (
                <MarkdownPreview markdown={props.value} />
              )
            });
          }}
        >
          <div className={s.BottomButtonText}>{props.bottomButtonText || 'Read More'}</div>
        </div>
      )}
    </div>
  );
}

const MarkdownEditorModalHelper = (props: { value: string, onChange: (v: string) => void }) => {
  const [value, setValue] = useState(props.value);

  useEffect(() => {
    props.onChange(value);
  }, [value]);

  return (
    <MarkdownEditor
      value={value}
      onChange={setValue}
    />
  );

}

export default MarkdownInput;
