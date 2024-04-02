import React, { useEffect } from 'react';
import s from './MessageGeneratorInput.module.css'
import { ManagedMessageGenerator, ManagedMessageGeneratorSpec, ManagedMessageGeneratorValOrRef } from '../../../LibraryBrowser/model/user-managed-items';
import { LibraryContext } from '../../../LibraryBrowser/model/library-context';
import LibraryBrowserPanel, { LibraryBrowserPanelProps } from '../../../LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import { useHover } from '../../../../app/hooks/use-hover';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../LibraryBrowser/useManagedItemValue';
import ValueGeneratorInput from '../value-generator/ValueGeneratorInput/ValueGeneratorInput';

export type MessageGeneratorInputProps = {
  value: ManagedMessageGeneratorValOrRef,
  onChange: (v: ManagedMessageGeneratorValOrRef) => void,
  libraryContext: LibraryContext;
  isReadOnly?: boolean;
  libraryBrowserPanel?: Partial<LibraryBrowserPanelProps>
};

const MessageGeneratorInput: React.FC<MessageGeneratorInputProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

  const resolveResult = useManagedItemValue<ManagedMessageGenerator>(props.value);

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

  const onSpecChange = (spec: ManagedMessageGeneratorSpec) => {
    const newValue: ManagedMessageGeneratorValOrRef = { ...props.value, val: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedMessageGeneratorValOrRef = { type: 'value', val: item };
    props.onChange(newValue);
  };

  return (
    <div className={s.MessageGeneratorInput}>
      <div ref={hoverRef} style={{ marginBottom: '8rem' }}>
        <LibraryBrowserPanel
          itemType='message-generator'
          value={item}
          onPick={(item) => props.onChange({
            type: 'value',
            val: item as ManagedMessageGenerator
          })}
          onSave={(item) => props.onChange({
            type: 'value',
            val: item as ManagedMessageGenerator
          })}
          onChange={(item) => {
            props.onChange({
              ...props.value,
              val: item as ManagedMessageGenerator
            });
          }}
          isForceShowButtons={isHovered}
          libraryContext={props.libraryContext}
          managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
          isReadOnly={props.isReadOnly}
          {...props.libraryBrowserPanel}
        />
      </div>

      <ValueGeneratorInput
        value={itemSpec.generator.valueGenerator}
        onChange={(v) => onSpecChange({ ...itemSpec, generator: { ...itemSpec.generator, valueGenerator: v } })}
      />
    </div>
  );
}

export default MessageGeneratorInput;
