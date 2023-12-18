import React, { ReactElement } from 'react';
import s from './LibraryItemEditor.module.css'
import FormItem from '../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../ConfigurationTable/FormLabel/FormLabel';
import { LibraryItem } from '../model/library';
import FilterEditor from '../../../TopicPage/Messages/SessionConfiguration/FilterChainEditor/FilterEditor/FilterEditor';
import FilterChainEditor from '../../../TopicPage/Messages/SessionConfiguration/FilterChainEditor/FilterChainEditor';
import { ManagedColoringRule, ManagedColoringRuleChain, ManagedConsumerSessionConfig, ManagedConsumerSessionStartFrom, ManagedConsumerSessionTarget, ManagedMessageFilter, ManagedMessageFilterChain, ManagedTopicSelector } from '../model/user-managed-items';
import { LibraryContext } from '../model/library-context';
import * as I18n from '../../../app/contexts/I18n/I18n';
import ResourceMatchersInput from '../SearchEditor/ResourceMatchersInput/ResourceMatchersInput';
import StartFromInput from '../../../TopicPage/Messages/SessionConfiguration/StartFromInput/StartFromInput';
import ColoringRuleInput from '../../../TopicPage/Messages/SessionConfiguration/ColoringRulesInput/ColoringRuleInput/ColoringRuleInput';
import ColoringRuleChainInput from '../../../TopicPage/Messages/SessionConfiguration/ColoringRulesInput/ColoringRuleChainInput';
import TopicsSelectorInput from '../../../TopicPage/Messages/topic-selector/TopicSelectorInput/TopicSelectorInput';
import SessionTargetInput from '../../../TopicPage/Messages/SessionConfiguration/SessionTargetInput/SessionTargetInput';
import SessionConfiguration from '../../../TopicPage/Messages/SessionConfiguration/SessionConfiguration';

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
    case 'coloring-rule': {
      descriptorEditor = (
        <ColoringRuleInput
          value={{
            type: 'value',
            val: value.spec as ManagedColoringRule
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
    case 'coloring-rule-chain': {
      descriptorEditor = (
        <ColoringRuleChainInput
          value={{
            type: 'value',
            val: value.spec as ManagedColoringRuleChain
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
    case 'topic-selector': {
      descriptorEditor = (
        <TopicsSelectorInput
          value={{
            type: 'value',
            val: value.spec as ManagedTopicSelector
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
    case 'consumer-session-target': {
      descriptorEditor = (
        <SessionTargetInput
          value={{
            type: 'value',
            val: value.spec as ManagedConsumerSessionTarget
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
    case 'consumer-session-config': {
      descriptorEditor = (
        <SessionConfiguration
          value={{
            type: 'value',
            val: value.spec as ManagedConsumerSessionConfig
          }}
          onChange={v => {
            if (v.type === 'reference') {
              throw new Error('Item value shouldn\'t be a reference');
            }

            props.onChange({ ...props.value, spec: v.val });
          }}
          libraryContext={props.libraryContext}
          appearance='within-library-browser'
          isReadOnly={isReadOnly}
        />
      );
      break;
    }
  }

  return (
    <div className={s.LibraryItemEditor}>
      <div className={s.Info}>
        <div>
          <strong>ID:</strong>&nbsp;{value.spec.metadata.id}
        </div>
        <div>
          <strong>Updated at:</strong>&nbsp;{i18n.formatDateTime(new Date(value.metadata.updatedAt))}
        </div>
      </div>

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
    </div>
  );
}

export default LibraryItemEditor;
