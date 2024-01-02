import React from 'react';
import s from './ValueProjectionInput.module.css'
import BasicMessageFilterTargetInput from '../../../SessionConfiguration/FilterChainEditor/FilterEditor/BasicFilterEditor/BasicMessageFilterTargetInput/BasicMessageFilterTargetInput';
import { LibraryContext } from '../../../../LibraryBrowser/model/library-context';
import { ManagedValueProjection, ManagedValueProjectionSpec, ManagedValueProjectionValOrRef } from '../../../../LibraryBrowser/model/user-managed-items';
import { useHover } from '../../../../../app/hooks/use-hover';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../../LibraryBrowser/useManagedItemValue';
import LibraryBrowserPanel, { LibraryBrowserPanelProps } from '../../../../LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import Input from '../../../../Input/Input';
import FormLabel from '../../../../ConfigurationTable/FormLabel/FormLabel';
import FormItem from '../../../../ConfigurationTable/FormItem/FormItem';

export type ValueProjectionInputProps = {
  value: ManagedValueProjectionValOrRef,
  onChange: (v: ManagedValueProjectionValOrRef) => void,
  libraryContext: LibraryContext,
  isReadOnly?: boolean,
  libraryBrowserPanel?: Partial<LibraryBrowserPanelProps>
};

const ValueProjectionInput: React.FC<ValueProjectionInputProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

  const resolveResult = useManagedItemValue<ManagedValueProjection>(props.value);
  if (resolveResult.type !== 'success') {
    return <UseManagedItemValueSpinner item={props.value} result={resolveResult} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: ManagedValueProjectionSpec) => {
    const newValue: ManagedValueProjectionValOrRef = { ...props.value, val: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedValueProjectionValOrRef = { type: 'value', val: item };
    props.onChange(newValue);
  };

  return (
    <div className={s.ValueProjectionInput}>
      <FormItem>
        <div ref={hoverRef}>
          <LibraryBrowserPanel
            isReadOnly={props.isReadOnly}
            value={item}
            itemType='value-projection'
            onPick={(item) => props.onChange({
              type: 'reference',
              ref: item.metadata.id,
              val: item as ManagedValueProjection
            })}
            onSave={(item) => props.onChange({
              type: 'reference',
              ref: item.metadata.id,
              val: item as ManagedValueProjection
            })}
            onChange={(item) => {
              props.onChange({
                ...props.value,
                val: item as ManagedValueProjection
              });
            }}
            isForceShowButtons={isHovered}
            libraryContext={props.libraryContext}
            managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
            {...props.libraryBrowserPanel}
          />
        </div>
      </FormItem>

      <FormItem>
        <BasicMessageFilterTargetInput
          value={itemSpec.target}
          onChange={(v) => onSpecChange({ ...itemSpec, target: v })}
          libraryContext={props.libraryContext}
          isReadOnly={props.isReadOnly}
          libraryBrowserPanel={props.libraryBrowserPanel}
        />
      </FormItem>

      <div style={{ display: 'grid', gap: '12rem', gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <FormLabel
            size='small'
            content="Short Name"
            help={(
              <p>
                Short name is used as a table column name, or a chart item label.
              </p>
            )}
          />
          <Input
            value={itemSpec.shortName}
            onChange={(v) => onSpecChange({ ...itemSpec, shortName: v })}
            placeholder='Item Name'
            size='small'
          />
        </div>

        <div>
          <FormLabel
            size='small'
            content="Column Width"
          />
          <Input
            value={String(itemSpec.width) || ''}
            onChange={(v) => onSpecChange({ ...itemSpec, width: Number(v) })}
            placeholder='default'
            inputProps={{ type: 'number' }}
            size='small'
          />
        </div>

      </div>
    </div>
  );
}

export default ValueProjectionInput;
