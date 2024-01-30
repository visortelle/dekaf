import React, { ReactElement } from 'react';
import s from './LibraryItemEditor.module.css'
import FormItem from '../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../ConfigurationTable/FormLabel/FormLabel';
import { LibraryItem } from '../model/library';
import FilterEditor from '../../ConsumerSession/SessionConfiguration/FilterChainEditor/FilterEditor/FilterEditor';
import FilterChainEditor from '../../ConsumerSession/SessionConfiguration/FilterChainEditor/FilterChainEditor';
import { ManagedBasicMessageFilterTarget, ManagedColoringRule, ManagedColoringRuleChain, ManagedConsumerSessionConfig, ManagedConsumerSessionStartFrom, ManagedConsumerSessionTarget, ManagedDeserializer, ManagedMarkdownDocument, ManagedMessageFilter, ManagedMessageFilterChain, ManagedTopicSelector, ManagedValueProjection, ManagedValueProjectionList } from '../model/user-managed-items';
import { LibraryContext } from '../model/library-context';
import * as I18n from '../../../app/contexts/I18n/I18n';
import ResourceMatchersInput from '../SearchEditor/ResourceMatchersInput/ResourceMatchersInput';
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

  let descriptorEditor: ReactElement = <></>;
  switch (value.spec.metadata.type) {
    case 'message-filter': {
      descriptorEditor = (
        <div style={{ width: '420rem' }}>
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
        </div>
      );
      break;
    }
    case 'message-filter-chain': {
      descriptorEditor = (
        <div style={{ width: '420rem' }}>
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
        </div>
      );
      break;
    }
    case 'consumer-session-start-from': {
      descriptorEditor = (
        <div style={{ width: '420rem' }}>
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
        </div>
      );
      break;
    }
    case 'coloring-rule': {
      descriptorEditor = (
        <div style={{ width: '420rem' }}>
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
        </div>
      );
      break;
    }
    case 'coloring-rule-chain': {
      descriptorEditor = (
        <div style={{ width: '420rem' }}>
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
        </div>
      );
      break;
    }
    case 'topic-selector': {
      descriptorEditor = (
        <div style={{ width: '420rem' }}>
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
        </div>
      );
      break;
    }
    case 'consumer-session-target': {
      descriptorEditor = (
        <div style={{ width: '480rem' }}>
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
          libraryBrowserPanel={props.libraryBrowserPanel}
        />
      );
      break;
    }
    case 'markdown-document': {
      descriptorEditor = (
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
      );
      break;
    }
    case 'basic-message-filter-target': {
      descriptorEditor = (
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
      );
      break;
    }
    case 'value-projection': {
      descriptorEditor = (
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
      );
      break;
    }
    case 'value-projection-list': {
      descriptorEditor = (
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
      );
      break;
    }
    case 'deserializer': {
      descriptorEditor = (
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
