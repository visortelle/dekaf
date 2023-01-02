import React, { useEffect, useState } from 'react';
import { Monaco } from '@monaco-editor/react';
import { IRange } from 'monaco-editor';
import { v4 as uuid } from 'uuid';
import { cloneDeep } from 'lodash';

import Button from '../../../../ui/Button/Button';
import SmallButton from '../../../../ui/SmallButton/SmallButton';
import Select from '../../../../ui/Select/Select';
import * as t from './types';
import Filter from './Filter';
import deleteIcon from './icons/delete.svg';
import enableIcon from './icons/enable.svg';

import s from './FilterChain.module.css';

export type FilterChainProps = {
  value: t.Chain;
  onChange: (value: t.Chain) => void;
};

const FilterChain: React.FC<FilterChainProps> = (props) => {

  const [monaco, setMonaco] = useState<Monaco | null>(null);

  useEffect(() => {
    
    if (!monaco) {
      return
    }

    const createDependencyProposals = (range: IRange) => {
      return [
        {
          label: 'properties',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'properties()',
          range: range
        },
        {
          label: 'eventTime',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'eventTime()',
          range: range
        },
        {
          label: 'publishTime',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'publishTime()',
          range: range
        },
        {
          label: 'brokerPublishTime',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'brokerPublishTime()',
          range: range
        },
        {
          label: 'messageId',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'messageId()',
          range: range
        },
        {
          label: 'sequenceId',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'sequenceId()',
          range: range
        },
        {
          label: 'producerName',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'producerName()',
          range: range
        },
        {
          label: 'key',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'key()',
          range: range
        },
        {
          label: 'orderingKey',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'orderingKey()',
          range: range
        },
        {
          label: 'topic',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'topic()',
          range: range
        },
        {
          label: 'size',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'size()',
          range: range
        },
        {
          label: 'redeliveryCount',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'redeliveryCount()',
          range: range
        },
        {
          label: 'schemaVersion',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'schemaVersion()',
          range: range
        },
        {
          label: 'isReplicated',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'isReplicated()',
          range: range
        },
        {
          label: 'replicatedFrom',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'replicatedFrom()',
          range: range
        },
      ];
    }
    
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({ noLib: false, allowNonTsExtensions: true })

    const register = monaco.languages.registerCompletionItemProvider('javascript', {
      triggerCharacters: ["."],
      provideCompletionItems: (model, position) => {
    
        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        })
        const match = textUntilPosition.match(
          /msg\./
        )
        if (!match) {
          return { suggestions: [] };
        }
        
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        }
        return {
          suggestions: createDependencyProposals(range)
        }
      },
      
    });

    return () => {
      register.dispose()
    }
  }, [monaco])


  const autoComplete = (monaco: Monaco) => {
    setMonaco(monaco)
  }

  return (
    <div className={s.FilterChain}>

      <div style={{ marginBottom: '12rem' }}>
        <Select<'all' | 'any'>
          list={[
            { type: 'item', title: 'All filters should match', value: 'all' },
            { type: 'item', title: 'At least one filter should match', value: 'any' },
          ]}
          value={props.value.mode}
          onChange={v => props.onChange({ ...props.value, mode: v })}
        />
      </div>

      {Object.entries(props.value.filters).map(([entryId, entry], index) => {
        const isDisabled = props.value.disabledFilters.includes(entryId);
        return (
          <div key={entryId} className={s.Entry}>
            <div className={s.EntryFilter}>
              <Filter
                value={entry.filter}
                onChange={(f) => props.onChange({ ...props.value, filters: { ...props.value.filters, [entryId]: { ...entry, filter: f } } })}
                autoComplete={index === 0 ? autoComplete : undefined}
              />
            </div>
            <div className={s.EntryButtons}>
              <div className={s.EntryButton}>
                <Button
                  svgIcon={enableIcon}
                  onClick={() => {
                    const newDisabledFilters = props.value.disabledFilters.includes(entryId) ?
                      props.value.disabledFilters.filter(id => id !== entryId) :
                      [...props.value.disabledFilters, entryId];
                    props.onChange({ ...props.value, disabledFilters: newDisabledFilters });
                  }}
                  title={isDisabled ? 'Enable filter' : 'Disable filter'}
                  type={isDisabled ? 'regular' : 'primary'}
                />
              </div>

              <div className={s.EntryButton} style={{ marginTop: 'auto' }}>
                <Button
                  svgIcon={deleteIcon}
                  onClick={() => {
                    const newFilters = cloneDeep(props.value.filters);
                    delete newFilters[entryId];
                    props.onChange({ ...props.value, filters: newFilters });
                  }}
                  type="danger"
                  title="Delete filter"
                />
              </div>
            </div>
          </div>
        );
      })}

      <SmallButton
        onClick={() => {
          const newFilter: t.Filter = { value: undefined };
          const newChain: t.Chain = { ...props.value, filters: { ...props.value.filters, [uuid()]: { filter: newFilter } } };
          props.onChange(newChain);
        }}
        text="Add filter"
        type='primary'
      />
      
    </div>
  );
}

export default FilterChain;
