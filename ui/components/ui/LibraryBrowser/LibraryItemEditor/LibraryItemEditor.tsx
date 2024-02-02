import React, { FC, ReactElement } from 'react';
import s from './LibraryItemEditor.module.css'
import { LibraryItem } from '../model/library';
import FilterEditor from '../../ConsumerSession/SessionConfiguration/FilterChainEditor/FilterEditor/FilterEditor';
import FilterChainEditor from '../../ConsumerSession/SessionConfiguration/FilterChainEditor/FilterChainEditor';
import { ManagedBasicMessageFilterTarget, ManagedColoringRule, ManagedColoringRuleChain, ManagedConsumerSessionConfig, ManagedConsumerSessionStartFrom, ManagedConsumerSessionTarget, ManagedDeserializer, ManagedMarkdownDocument, ManagedMessageFilter, ManagedMessageFilterChain, ManagedTopicSelector, ManagedValueProjection, ManagedValueProjectionList } from '../model/user-managed-items';
import { LibraryContext } from '../model/library-context';
import * as I18n from '../../../app/contexts/I18n/I18n';
import StartFromInput from '../../ConsumerSession/SessionConfiguration/StartFromInput/StartFromInput';
import ColoringRuleInput from '../../ConsumerSession/SessionConfiguration/ColoringRulesInput/ColoringRuleInput/ColoringRuleInput';
import ColoringRuleChainInput from '../../ConsumerSession/SessionConfiguration/ColoringRulesInput/ColoringRuleChainInput';
import TopicsSelectorInput from '../../ConsumerSession/topic-selector/TopicSelectorInput/TopicSelectorInput';
import SessionTargetInput from '../../ConsumerSession/SessionConfiguration/SessionTargetInput/SessionTargetInput';
import SessionConfiguration from '../../ConsumerSession/SessionConfiguration/SessionConfiguration';
import { LibraryBrowserPanelProps } from '../LibraryBrowserPanel/LibraryBrowserPanel';
import MarkdownDocumentEditor from '../../MarkdownDocumentEditor/MarkdownDocumentEditor';
import BasicMessageFilterTargetInput from '../../ConsumerSession/SessionConfiguration/FilterChainEditor/FilterEditor/BasicFilterEditor/BasicMessageFilterTargetInput/BasicMessageFilterTargetInput';
import DeserializerInput from '../../ConsumerSession/SessionConfiguration/SessionTargetInput/DeserializerInput/DeserializerInput';
import ValueProjectionInput from '../../ConsumerSession/value-projections/ValueProjectionListInput/ValueProjectionInput/ValueProjectionInput';
import ValueProjectionListInput from '../../ConsumerSession/value-projections/ValueProjectionListInput/ValueProjectionListInput';
import AvailableInContextsButton from './AvailableInContextsButton/AvailableInContextsButton';
import { cloneDeep } from 'lodash';

const ItemEditorContainer: FC<{ children: ReactElement }> = (props) => {
  return (
    <div className={s.ItemEditorContainer}>
      <div className={s.ItemEditorContainerChildren}>
        {props.children}
      </div>
    </div>
  );
}

export type LibraryItemEditorProps = {
  value: LibraryItem;
  onChange: (value: LibraryItem) => void;
  mode: 'editor' | 'viewer';
  libraryContext: LibraryContext;
  libraryBrowserPanel?: Partial<LibraryBrowserPanelProps>
};

const LibraryItemEditor: React.FC<LibraryItemEditorProps> = (props) => {
  const i18n = I18n.useContext();
  const value = props.value;
  const isReadOnly = props.mode === 'viewer';

  let itemEditor: ReactElement = <></>;
  switch (value.spec.metadata.type) {
    case 'message-filter': {
      itemEditor = (
        <ItemEditorContainer>
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
            libraryBrowserPanel={props.libraryBrowserPanel}
          />
        </ItemEditorContainer>
      );
      break;
    }
    case 'message-filter-chain': {
      itemEditor = (
        <ItemEditorContainer>
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
            libraryBrowserPanel={props.libraryBrowserPanel}
          />
        </ItemEditorContainer>
      );
      break;
    }
    case 'consumer-session-start-from': {
      itemEditor = (
        <ItemEditorContainer>
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
            libraryBrowserPanel={props.libraryBrowserPanel}
          />
        </ItemEditorContainer>
      );
      break;
    }
    case 'coloring-rule': {
      itemEditor = (
        <ItemEditorContainer>
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
            libraryBrowserPanel={props.libraryBrowserPanel}
          />
        </ItemEditorContainer>
      );
      break;
    }
    case 'coloring-rule-chain': {
      itemEditor = (
        <ItemEditorContainer>
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
            libraryBrowserPanel={props.libraryBrowserPanel}
          />
        </ItemEditorContainer>
      );
      break;
    }
    case 'topic-selector': {
      itemEditor = (
        <ItemEditorContainer>
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
            libraryBrowserPanel={props.libraryBrowserPanel}
          />
        </ItemEditorContainer>
      );
      break;
    }
    case 'consumer-session-target': {
      itemEditor = (
        <ItemEditorContainer>
          <div style={{ margin: '-28rem -12rem -24rem' }}>
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
              libraryBrowserPanel={props.libraryBrowserPanel}
            />
          </div>
        </ItemEditorContainer>
      );
      break;
    }
    case 'consumer-session-config': {
      itemEditor = (
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
          libraryBrowserPanel={props.libraryBrowserPanel}
        />
      );
      break;
    }
    case 'markdown-document': {
      itemEditor = (
        <ItemEditorContainer>
          <MarkdownDocumentEditor
            value={{
              type: 'value',
              val: value.spec as ManagedMarkdownDocument
            }}
            onChange={v => {
              if (v.type === 'reference') {
                throw new Error('Item value shouldn\'t be a reference');
              }

              props.onChange({ ...props.value, spec: v.val });
            }}
            libraryContext={props.libraryContext}
            isReadOnly={isReadOnly}
            libraryBrowserPanel={props.libraryBrowserPanel}
          />
        </ItemEditorContainer>
      );
      break;
    }
    case 'basic-message-filter-target': {
      itemEditor = (
        <ItemEditorContainer>
          <BasicMessageFilterTargetInput
            value={{
              type: 'value',
              val: value.spec as ManagedBasicMessageFilterTarget
            }}
            onChange={v => {
              if (v.type === 'reference') {
                throw new Error('Item value shouldn\'t be a reference');
              }

              props.onChange({ ...props.value, spec: v.val });
            }}
            libraryContext={props.libraryContext}
            isReadOnly={isReadOnly}
            libraryBrowserPanel={props.libraryBrowserPanel}
          />
        </ItemEditorContainer>
      );
      break;
    }
    case 'value-projection': {
      itemEditor = (
        <ItemEditorContainer>
          <ValueProjectionInput
            value={{
              type: 'value',
              val: value.spec as ManagedValueProjection
            }}
            onChange={v => {
              if (v.type === 'reference') {
                throw new Error('Item value shouldn\'t be a reference');
              }

              props.onChange({ ...props.value, spec: v.val });
            }}
            libraryContext={props.libraryContext}
            isReadOnly={isReadOnly}
            libraryBrowserPanel={props.libraryBrowserPanel}
          />
        </ItemEditorContainer>
      );
      break;
    }
    case 'value-projection-list': {
      itemEditor = (
        <ItemEditorContainer>
          <ValueProjectionListInput
            value={{
              type: 'value',
              val: value.spec as ManagedValueProjectionList
            }}
            onChange={v => {
              if (v.type === 'reference') {
                throw new Error('Item value shouldn\'t be a reference');
              }

              props.onChange({ ...props.value, spec: v.val });
            }}
            libraryContext={props.libraryContext}
            isReadOnly={isReadOnly}
            libraryBrowserPanel={props.libraryBrowserPanel}
          />
        </ItemEditorContainer>
      );
      break;
    }
    case 'deserializer': {
      itemEditor = (
        <ItemEditorContainer>
          <DeserializerInput
            value={{
              type: 'value',
              val: value.spec as ManagedDeserializer
            }}
            onChange={v => {
              if (v.type === 'reference') {
                throw new Error('Item value shouldn\'t be a reference');
              }

              props.onChange({ ...props.value, spec: v.val });
            }}
            libraryContext={props.libraryContext}
            isReadOnly={isReadOnly}
            libraryBrowserPanel={props.libraryBrowserPanel}
          />
        </ItemEditorContainer>
      );
      break;
    }
  }

  return (
    <div className={s.LibraryItemEditor}>
      <div className={s.Info}>
        <div>
          <div>
            <strong>ID:</strong>&nbsp;{value.spec.metadata.id}
          </div>
          <div>
            <strong>Updated at:</strong>&nbsp;{i18n.formatDateTime(new Date(value.metadata.updatedAt))}
          </div>
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <AvailableInContextsButton
            value={value.metadata.availableForContexts}
            onChange={(v) => {
              const newValue = cloneDeep(props.value);
              newValue.metadata.availableForContexts = v;

              props.onChange(newValue);
            }}
            libraryContext={props.libraryContext}
            isReadOnly={props.mode === 'viewer'}
          />
        </div>
      </div>

      <div className={s.Editor}>
        {itemEditor}
      </div>
    </div>
  );
}

export default LibraryItemEditor;
