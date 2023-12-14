import React, { ReactElement } from 'react';
import s from './LibraryItemEditor.module.css'
import FormItem from '../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../ConfigurationTable/FormLabel/FormLabel';
import { LibraryItem } from '../model/library';
import FilterEditor from '../../../TopicPage/Messages/SessionConfiguration/FilterChainEditor/FilterEditor/FilterEditor';
import FilterChainEditor from '../../../TopicPage/Messages/SessionConfiguration/FilterChainEditor/FilterChainEditor';
import { ManagedConsumerSessionStartFrom, ManagedMessageFilter, ManagedMessageFilterChain } from '../model/user-managed-items';
import { LibraryContext } from '../model/library-context';
import * as I18n from '../../../app/contexts/I18n/I18n';
import NoData from '../../NoData/NoData';
import ResourceMatchersInput from '../SearchEditor/ResourceMatchersInput/ResourceMatchersInput';
import StartFromInput from '../../../TopicPage/Messages/SessionConfiguration/StartFromInput/StartFromInput';

export type LibraryItemEditorProps = {
  value: LibraryItem;
  onChange: (value: LibraryItem) => void;
  mode: 'editor' | 'viewer';
  libraryContext: LibraryContext;
};

const LibraryItemEditor: React.FC<LibraryItemEditorProps> = (props) => {
  const i18n = I18n.useContext();
  const value = props.value;
  const isReadOnly = props.mode === 'viewer';

  let descriptorEditor: ReactElement = <></>;
  switch (value.spec.metadata.type) {
    case 'message-filter': {
      descriptorEditor = (
        <FilterEditor
          value={{
            type: 'value',
            val: value.spec as ManagedMessageFilter
          }}
          onChange={v => {
            if (v.type === 'reference') {
              throw new Error('Item value shouldn\'t be a reference');
            }

            props.onChange({ ...props.value, spec: v.val });
          }}
          libraryContext={props.libraryContext}
          isReadOnly={isReadOnly}
        />
      );
      break;
    }
    case 'message-filter-chain': {
      descriptorEditor = (
        <FilterChainEditor
          value={{
            type: 'value',
            val: value.spec as ManagedMessageFilterChain
          }}
          onChange={v => {
            if (v.type === 'reference') {
              throw new Error('Item value shouldn\'t be a reference');
            }

            props.onChange({ ...props.value, spec: v.val });
          }}
          libraryContext={props.libraryContext}
          isReadOnly={isReadOnly}
        />
      );
      break;
    }
    case 'consumer-session-start-from': {
      descriptorEditor = (
        <StartFromInput
          value={{
            type: 'value',
            val: value.spec as ManagedConsumerSessionStartFrom
          }}
          onChange={v => {
            if (v.type === 'reference') {
              throw new Error('Item value shouldn\'t be a reference');
            }

            props.onChange({ ...props.value, spec: v.val });
          }}
          libraryContext={props.libraryContext}
          isReadOnly={isReadOnly}
        />
      );
      break;
    }
  }

  return (
    <div className={s.LibraryItemEditor}>
      <div className={s.Editor}>
        {descriptorEditor}
      </div>

      {props.mode === 'viewer' && (
        <div style={{ marginTop: '24rem' }}>
          <FormItem>
            <FormLabel content="Pulsar Resources" />
            <ResourceMatchersInput
              libraryContext={props.libraryContext}
              onChange={() => { }}
              value={props.value.metadata.availableForContexts}
              isReadOnly={true}
            />
          </FormItem>
        </div>
      )}

      <div className={s.Info}>
        <FormItem>
          <FormLabel content="ID" />
          <div>{value.spec.metadata.id}</div>
        </FormItem>

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

        <FormItem>
          <FormLabel content="Updated at" />
          <div>{i18n.formatDateTime(new Date(value.metadata.updatedAt))}</div>
        </FormItem>
      </div>


    </div>
  );
}

export default LibraryItemEditor;
