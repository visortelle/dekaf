import React, { useEffect } from 'react';
import s from './ProducerTaskInput.module.css'
import PulsarProducerConfigInput from '../pulsar-producer-config/PulsarProducerConfigInput';
import { ManagedProducerTask, ManagedProducerTaskSpec, ManagedProducerTaskValOrRef } from '../../../LibraryBrowser/model/user-managed-items';
import { LibraryContext } from '../../../LibraryBrowser/model/library-context';
import LibraryBrowserPanel, { LibraryBrowserPanelProps } from '../../../LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import { useHover } from '../../../../app/hooks/use-hover';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../LibraryBrowser/useManagedItemValue';

export type ProducerTaskInputProps = {
  value: ManagedProducerTaskValOrRef,
  onChange: (v: ManagedProducerTaskValOrRef) => void,
  libraryContext: LibraryContext;
  isReadOnly?: boolean;
  libraryBrowserPanel?: Partial<LibraryBrowserPanelProps>
};

const ProducerTaskInput: React.FC<ProducerTaskInputProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

  const resolveResult = useManagedItemValue<ManagedProducerTask>(props.value);

  useEffect(() => {
    if (props.value.val === undefined && resolveResult.type === 'success') {
      props.onChange({ ...props.value, val: resolveResult.value });
    }
  }, [resolveResult]);

  if (resolveResult.type !== 'success') {
    return <UseManagedItemValueSpinner item={props.value} result={resolveResult} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: ManagedProducerTaskSpec) => {
    const newValue: ManagedProducerTaskValOrRef = { ...props.value, val: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedProducerTaskValOrRef = { type: 'value', val: item };
    props.onChange(newValue);
  };

  return (
    <div className={s.ProducerTaskInput}>
      <div ref={hoverRef} style={{ marginBottom: '8rem' }}>
        <LibraryBrowserPanel
          itemType='producer-task'
          value={item}
          onPick={(item) => props.onChange({
            type: 'value',
            val: item as ManagedProducerTask
          })}
          onSave={(item) => props.onChange({
            type: 'value',
            val: item as ManagedProducerTask
          })}
          onChange={(item) => {
            props.onChange({
              ...props.value,
              val: item as ManagedProducerTask
            });
          }}
          isForceShowButtons={isHovered}
          libraryContext={props.libraryContext}
          managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
          isReadOnly={props.isReadOnly}
          {...props.libraryBrowserPanel}
        />
      </div>

      <PulsarProducerConfigInput
        value={itemSpec.producerConfig}
        onChange={(v) => onSpecChange({ ...itemSpec, producerConfig: v })}
      />
    </div>
  );
}

export default ProducerTaskInput;
