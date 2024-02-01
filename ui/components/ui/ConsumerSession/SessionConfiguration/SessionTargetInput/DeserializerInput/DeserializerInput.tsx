import React from 'react';
import s from './DeserializerInput.module.css'
import { ManagedDeserializer, ManagedDeserializerSpec, ManagedDeserializerValOrRef } from '../../../../LibraryBrowser/model/user-managed-items';
import { Deserializer } from '../../../deserializer/deserializer';
import Select from '../../../../Select/Select';
import LibraryBrowserPanel, { LibraryBrowserPanelProps } from '../../../../LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import { LibraryContext } from '../../../../LibraryBrowser/model/library-context';
import { useHover } from '../../../../../app/hooks/use-hover';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../../LibraryBrowser/useManagedItemValue';
import { cloneDeep } from 'lodash';

export type DeserializerInputProps = {
  value: ManagedDeserializerValOrRef,
  onChange: (v: ManagedDeserializerValOrRef) => void,
  libraryContext: LibraryContext,
  isReadOnly?: boolean,
  libraryBrowserPanel?: Partial<LibraryBrowserPanelProps>
};

const DeserializerInput: React.FC<DeserializerInputProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

  const resolveResult = useManagedItemValue<ManagedDeserializer>(props.value);
  if (resolveResult.type !== 'success') {
    return <UseManagedItemValueSpinner item={props.value} result={resolveResult} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: ManagedDeserializerSpec) => {
    const newValue: ManagedDeserializerValOrRef = { ...props.value, val: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedDeserializerValOrRef = { type: 'value', val: item };
    props.onChange(newValue);
  };

  return (
    <div className={s.DeserializerInput}>
      <div ref={hoverRef}>
        <LibraryBrowserPanel
          isReadOnly={props.isReadOnly}
          value={item}
          itemType='deserializer'
          onPick={(item) => props.onChange({
            type: 'reference',
            ref: item.metadata.id,
            val: item as ManagedDeserializer
          })}
          onSave={(item) => props.onChange({
            type: 'reference',
            ref: item.metadata.id,
            val: item as ManagedDeserializer
          })}
          onChange={(item) => {
            props.onChange({
              ...props.value,
              val: item as ManagedDeserializer
            });
          }}
          isForceShowButtons={isHovered}
          libraryContext={props.libraryContext}
          managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
          {...props.libraryBrowserPanel}
        />
      </div>

      <Select<Deserializer['deserializer']['type']>
        list={[
          { type: 'item', value: 'use-latest-topic-schema', title: 'Use topic schema' },
          { type: 'item', value: 'treat-bytes-as-json', title: 'Treat raw bytes as JSON' },
        ]}
        value={itemSpec.deserializer.deserializer.type}
        onChange={(v) => {
          const newItemSpec = cloneDeep(itemSpec);

          switch (v) {
            case 'use-latest-topic-schema': {
              newItemSpec.deserializer.deserializer = { type: 'use-latest-topic-schema' };
              break;
            }
            case 'treat-bytes-as-json': {
              newItemSpec.deserializer.deserializer = { type: 'treat-bytes-as-json' };
              break;
            }
          }

          onSpecChange(newItemSpec);
        }}
        isReadOnly={props.isReadOnly}
      />
    </div>
  );
}

export default DeserializerInput;
