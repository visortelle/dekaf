import React from 'react';
import s from './ValueProjectionListInput.module.css'
import ListInput from '../../../ConfigurationTable/ListInput/ListInput';
import ValueProjectionInput from './ValueProjectionInput/ValueProjectionInput';
import { ManagedBasicMessageFilterTarget, ManagedValueProjection, ManagedValueProjectionList, ManagedValueProjectionListSpec, ManagedValueProjectionListValOrRef, ManagedValueProjectionValOrRef } from '../../../LibraryBrowser/model/user-managed-items';
import { useHover } from '../../../../app/hooks/use-hover';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../LibraryBrowser/useManagedItemValue';
import { LibraryContext } from '../../../LibraryBrowser/model/library-context';
import LibraryBrowserPanel, { LibraryBrowserPanelProps } from '../../../LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import { getDefaultManagedItem, getDefaultManagedItemMetadata } from '../../../LibraryBrowser/default-library-items';
import OnOffToggle from '../../../IconToggle/OnOffToggle/OnOffToggle';

export type ValueProjectionListInputProps = {
  value: ManagedValueProjectionListValOrRef,
  onChange: (v: ManagedValueProjectionListValOrRef) => void,
  libraryContext: LibraryContext,
  isReadOnly?: boolean,
  libraryBrowserPanel?: Partial<LibraryBrowserPanelProps>
};

const ValueProjectionListInput: React.FC<ValueProjectionListInputProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

  const resolveResult = useManagedItemValue<ManagedValueProjectionList>(props.value);
  if (resolveResult.type !== 'success') {
    return <UseManagedItemValueSpinner item={props.value} result={resolveResult} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: ManagedValueProjectionListSpec) => {
    const newValue: ManagedValueProjectionListValOrRef = { ...props.value, val: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedValueProjectionListValOrRef = { type: 'value', val: item };
    props.onChange(newValue);
  };

  const cssFilter = itemSpec.isEnabled ? undefined : 'grayscale(0.5) opacity(0.75)';

  return (
    <div className={s.ValueProjectionsInput} style={{ filter: cssFilter }}>
      <div ref={hoverRef}>
        <LibraryBrowserPanel
          isReadOnly={props.isReadOnly}
          value={item}
          itemType='value-projection-list'
          onPick={(item) => props.onChange({
            type: 'value',
            val: item as ManagedValueProjectionList
          })}
          onSave={(item) => props.onChange({
            type: 'value',
            val: item as ManagedValueProjectionList
          })}
          onChange={(item) => {
            props.onChange({
              ...props.value,
              val: item as ManagedValueProjectionList
            });
          }}
          isForceShowButtons={isHovered}
          libraryContext={props.libraryContext}
          managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
          extraElements={{
            preItemType: (
              <div style={{ display: 'flex', gap: '4rem' }}>
                <OnOffToggle
                  value={itemSpec.isEnabled}
                  onChange={() => onSpecChange({ ...itemSpec, isEnabled: !itemSpec.isEnabled })}
                  isReadOnly={props.isReadOnly}
                />
              </div>
            )
          }}
          {...props.libraryBrowserPanel}
        />
      </div>

      <ListInput<ManagedValueProjectionValOrRef>
        getId={(v) => v.val?.metadata.id || ''}
        renderItem={(v) => {
          return (
            <ValueProjectionInput
              value={v}
              onChange={(v) => {
                const newProjections = itemSpec.projections
                  .map(projection => projection.val?.metadata.id === v.val?.metadata.id ? v : projection);
                onSpecChange({ ...itemSpec, projections: newProjections });
              }}
              libraryContext={props.libraryContext}
              libraryBrowserPanel={props.libraryBrowserPanel}
              isReadOnly={props.isReadOnly}
            />
          );
        }}
        value={itemSpec.projections}
        onChange={(v) => onSpecChange({ ...itemSpec, projections: v })}
        onAdd={() => {
          const newProjection: ManagedValueProjectionValOrRef = {
            type: "value",
            val: getDefaultManagedItem("value-projection", props.libraryContext) as ManagedValueProjection
          };
          newProjection.val.spec.shortName = `Projection ${itemSpec.projections.length + 1}`;

          const newProjections = itemSpec.projections.concat([newProjection]);
          onSpecChange({ ...itemSpec, projections: newProjections });
        }}
        onRemove={(v) => {
          const newProjections = itemSpec.projections.filter(projection => projection.val?.metadata.id !== v);
          onSpecChange({ ...itemSpec, projections: newProjections });
        }}
        isContentDoesntOverlapRemoveButton
        isHideNothingToShow
        itemName='Projection'
        isReadOnly={props.isReadOnly}
      />
    </div>
  );
}

export default ValueProjectionListInput;
