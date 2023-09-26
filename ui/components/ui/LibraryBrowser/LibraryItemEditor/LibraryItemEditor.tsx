import React, { ReactElement } from 'react';
import s from './LibraryItemEditor.module.css'
import Input from '../../Input/Input';
import FormItem from '../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../ConfigurationTable/FormLabel/FormLabel';
import { LibraryItem } from '../types';
import FilterEditor from '../../../TopicPage/Messages/SessionConfiguration/FilterChainEditor/FilterEditor/FilterEditor';
import FilterChainEditor from '../../../TopicPage/Messages/SessionConfiguration/FilterChainEditor/FilterChainEditor';
import NothingToShow from '../../NothingToShow/NothingToShow';

export type LibraryItemEditorProps = {
  value: LibraryItem | undefined;
  onChange: (value: LibraryItem) => void;
  mode: 'editor' | 'viewer';
};

const LibraryItemEditor: React.FC<LibraryItemEditorProps> = (props) => {
  if (props.value === undefined) {
    return <NothingToShow />;
  }
  const value = props.value;

  let descriptorEditor: ReactElement = <></>;
  switch (value.descriptor.type) {
    case 'message-filter': {
      descriptorEditor = (
        <FilterEditor
          value={value.descriptor.value}
          onChange={v => {
            props.onChange({
              ...value,
              descriptor: { type: 'message-filter', value: v }
            })
          }}
        />
      );
      break;
    }
    case 'message-filter-chain': {
      descriptorEditor = (
        <FilterChainEditor
          value={value.descriptor.value}
          onChange={v => {
            props.onChange({
              ...value,
              descriptor: { type: 'message-filter-chain', value: v }
            })
          }}
        />
      );
      break;
    }
  }

  return (
    <div className={s.LibraryItemEditor}>
      <div className={s.Info}>
        <FormItem>
          <FormLabel content="Name" />
          {props.mode === 'editor' && (
            <Input
              value={value.name}
              onChange={v => props.onChange({ ...value, name: v })}
            />
          )}
          {props.mode === 'viewer' && (<div>{value.name}</div>)}
        </FormItem>

        <FormItem>
          <FormLabel content="Description" />
          {props.mode === 'editor' && (
            <Input
              value={value.descriptionMarkdown}
              onChange={v => props.onChange({ ...value, descriptionMarkdown: v })}
            />
          )}
          {props.mode === 'viewer' && (<div>{value.descriptionMarkdown}</div>)}
        </FormItem>

        {props.mode === 'viewer' && (
          <FormItem>
            <FormLabel content="Tags" />
            <div>
              {value.tags.map((tag) => (
                <div key={tag}>{tag}</div>
              ))}
            </div>
          </FormItem>
        )}
      </div>

      <div className={s.Editor}>
        {descriptorEditor}
      </div>
    </div>
  );
}

export default LibraryItemEditor;
