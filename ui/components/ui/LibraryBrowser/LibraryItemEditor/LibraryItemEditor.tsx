import React, { ReactElement } from 'react';
import s from './LibraryItemEditor.module.css'
import Input from '../../Input/Input';
import FormItem from '../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../ConfigurationTable/FormLabel/FormLabel';
import { LibraryItem } from '../model/library';
import FilterEditor from '../../../TopicPage/Messages/SessionConfiguration/FilterChainEditor/FilterEditor/FilterEditor';
import FilterChainEditor from '../../../TopicPage/Messages/SessionConfiguration/FilterChainEditor/FilterChainEditor';
import { UserManagedItem, UserManagedMessageFilter, UserManagedMessageFilterChain } from '../model/user-managed-items';
import { LibraryContext } from '../model/library-context';
import NoData from '../../NoData/NoData';

export type LibraryItemEditorProps = {
  value: LibraryItem;
  onChange: (value: LibraryItem) => void;
  mode: 'editor' | 'viewer';
  libraryContext: LibraryContext;
};

const LibraryItemEditor: React.FC<LibraryItemEditorProps> = (props) => {
  const value = props.value;

  let descriptorEditor: ReactElement = <></>;
  switch (value.spec.metadata.type) {
    case 'message-filter': {
      descriptorEditor = (
        <FilterEditor
          value={{
            type: 'value',
            value: value.spec as UserManagedMessageFilter
          }}
          onChange={v => {
            if (v.type === 'reference') {
              throw new Error('Item value shouldn\'t be a reference');
            }

            props.onChange({ ...props.value, spec: v.value });
          }}
          libraryContext={props.libraryContext}
        />
      );
      break;
    }
    case 'message-filter-chain': {
      descriptorEditor = (
        <FilterChainEditor
          value={{
            type: 'value',
            value: value.spec as UserManagedMessageFilterChain
          }}
          onChange={v => {
            if (v.type === 'reference') {
              throw new Error('Item value shouldn\'t be a reference');
            }

            props.onChange({ ...props.value, spec: v.value });
          }}
          libraryContext={props.libraryContext}
        />
      );
      break;
    }
  }

  return (
    <div className={s.LibraryItemEditor}>
      <div className={s.Info}>
        <FormItem>
          <FormLabel content="Name" isRequired={props.mode === 'editor'} />
          {props.mode === 'editor' && (
            <Input
              value={value.spec.metadata.name}
              onChange={v => {
                const newMetadata = { ...value.spec.metadata, name: v };
                props.onChange({ ...value, spec: { ...value.spec, metadata: newMetadata } });
              }}
            />
          )}
          {props.mode === 'viewer' && (<div>{value.spec.metadata.name}</div>)}
        </FormItem>

        <FormItem>
          <FormLabel content="Description" />
          {props.mode === 'editor' && (
            <Input
              value={value.spec.metadata.descriptionMarkdown}
              onChange={v => {
                const newMetadata = { ...value.spec.metadata, descriptionMarkdown: v };
                props.onChange({ ...value, spec: { ...value.spec, metadata: newMetadata } });
              }}
            />
          )}
          {props.mode === 'viewer' && (<div>{value.spec.metadata.descriptionMarkdown || <NoData />}</div>)}
        </FormItem>

        {props.mode === 'viewer' && (
          <FormItem>
            <FormLabel content="Tags" />
            {value.metadata.tags.length === 0 && (<NoData />)}
            {value.metadata.tags.length !== 0 && (
              <div>
                {value.metadata.tags.map((tag) => (
                  <div key={tag}>{tag}</div>
                ))}
              </div>
            )}
          </FormItem>
        )}

        <FormItem>
          <FormLabel content="ID" />
          <div>{value.spec.metadata.id}</div>
        </FormItem>
      </div>

      <div className={s.Editor}>
        {descriptorEditor}
      </div>
    </div>
  );
}

export default LibraryItemEditor;
