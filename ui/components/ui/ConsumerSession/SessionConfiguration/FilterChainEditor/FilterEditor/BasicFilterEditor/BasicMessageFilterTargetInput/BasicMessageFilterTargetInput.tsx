import React from 'react';
import s from './BasicMessageFilterTargetInput.module.css'
import { BasicMessageFilterTarget } from '../../../../../basic-message-filter-types';
import Select from '../../../../../../Select/Select';
import BasicMessageFilterValueTargetInput from './BasicMessageFilterValueTargetInput/BasicMessageFilterValueTargetInput';
import { ManagedBasicMessageFilterTarget, ManagedBasicMessageFilterTargetSpec, ManagedBasicMessageFilterTargetValOrRef } from '../../../../../../LibraryBrowser/model/user-managed-items';
import { LibraryContext } from '../../../../../../LibraryBrowser/model/library-context';
import { useHover } from '../../../../../../../app/hooks/use-hover';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../../../../LibraryBrowser/useManagedItemValue';
import LibraryBrowserPanel, { LibraryBrowserPanelProps } from '../../../../../../LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import Toggle from '../../../../../../Toggle/Toggle';
import CodeEditor from '../../../../../../CodeEditor/CodeEditor';

export type BasicMessageFilterTargetInputProps = {
  value: ManagedBasicMessageFilterTargetValOrRef,
  onChange: (v: ManagedBasicMessageFilterTargetValOrRef) => void,
  libraryContext: LibraryContext,
  isReadOnly?: boolean,
  libraryBrowserPanel?: Partial<LibraryBrowserPanelProps>
};

type TargetType = BasicMessageFilterTarget['target']['type'];

const BasicMessageFilterTargetInput: React.FC<BasicMessageFilterTargetInputProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

  const resolveResult = useManagedItemValue<ManagedBasicMessageFilterTarget>(props.value);
  if (resolveResult.type !== 'success') {
    return <UseManagedItemValueSpinner item={props.value} result={resolveResult} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: ManagedBasicMessageFilterTargetSpec) => {
    const newValue: ManagedBasicMessageFilterTargetValOrRef = { ...props.value, val: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedBasicMessageFilterTargetValOrRef = { type: 'value', val: item };
    props.onChange(newValue);
  };

  let flexDirection: 'row' | 'column' = 'row';
  if (itemSpec.target.target.type === "BasicMessageFilterValueTarget" && itemSpec.target.target.jsonFieldSelector !== undefined) {
    flexDirection = 'column';
  }

  const target = itemSpec.target.target;

  return (
    <div className={s.BasicMessageFilterTargetInput}>
      <div ref={hoverRef}>
        <LibraryBrowserPanel
          isReadOnly={props.isReadOnly}
          value={item}
          itemType='basic-message-filter-target'
          onPick={(item) => props.onChange({
            type: 'reference',
            ref: item.metadata.id,
            val: item as ManagedBasicMessageFilterTarget
          })}
          onSave={(item) => props.onChange({
            type: 'reference',
            ref: item.metadata.id,
            val: item as ManagedBasicMessageFilterTarget
          })}
          onChange={(item) => {
            props.onChange({
              ...props.value,
              val: item as ManagedBasicMessageFilterTarget
            });
          }}
          isForceShowButtons={isHovered}
          libraryContext={props.libraryContext}
          managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
          {...props.libraryBrowserPanel}
        />
      </div>

      <div style={{ display: 'flex', flexDirection }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12rem' }}>
          <div className={s.TargetType}>
            <Select<TargetType>
              size='small'
              list={[
                { type: 'item', title: 'message value', value: 'BasicMessageFilterValueTarget' },
                { type: 'item', title: 'message key', value: 'BasicMessageFilterKeyTarget' },
                { type: 'item', title: 'message property', value: 'BasicMessageFilterPropertyTarget' },
                { type: 'item', title: 'state', value: 'BasicMessageFilterSessionContextStateTarget' }
              ]}
              value={target.type}
              onChange={v => {
                let newTarget: BasicMessageFilterTarget;
                switch (v) {
                  case "BasicMessageFilterKeyTarget":
                    newTarget = { ...itemSpec.target, target: { type: "BasicMessageFilterKeyTarget", jsonFieldSelector: "" } };
                    break;
                  case "BasicMessageFilterValueTarget":
                    newTarget = { ...itemSpec.target, target: { type: "BasicMessageFilterValueTarget", jsonFieldSelector: "" } };
                    break;
                  case "BasicMessageFilterPropertyTarget":
                    newTarget = { ...itemSpec.target, target: { type: "BasicMessageFilterPropertyTarget", propertyKey: "" } };
                    break;
                  case "BasicMessageFilterSessionContextStateTarget":
                    newTarget = { ...itemSpec.target, target: { type: "BasicMessageFilterSessionContextStateTarget", jsonFieldSelector: "" } };
                    break;
                }

                onSpecChange({ ...itemSpec, target: newTarget });
              }}
              isReadOnly={props.isReadOnly}
            />
          </div>
          {target.type === "BasicMessageFilterValueTarget" && (
            <Toggle
              value={target.jsonFieldSelector !== undefined}
              onChange={(v) => {
                if (target.type === "BasicMessageFilterValueTarget") {
                  const newTarget: BasicMessageFilterTarget = {
                    ...itemSpec.target,
                    target: {
                      type: "BasicMessageFilterValueTarget",
                      jsonFieldSelector: v ? '' : undefined,
                    }
                  };
                  onSpecChange({ ...itemSpec, target: newTarget });
                }
              }}
              label='Sub. field'
              isReadOnly={props.isReadOnly}
            />
          )}
          <Toggle
            value={itemSpec.target.jsModifierCode !== undefined}
            onChange={(v) => {
              if (target.type === "BasicMessageFilterValueTarget") {
                const newTarget: BasicMessageFilterTarget = {
                  ...itemSpec.target,
                  jsModifierCode: v ? '(v) => v' : undefined,
                };
                onSpecChange({ ...itemSpec, target: newTarget });
              }
            }}
            label='Post-process'
            isReadOnly={props.isReadOnly}
          />
        </div>

        <div className={s.Target}>
          {target.type === "BasicMessageFilterValueTarget" && target.jsonFieldSelector !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', flex: '1', marginTop: '8rem' }}>
              <BasicMessageFilterValueTargetInput
                value={target}
                onChange={(v) => {
                  onSpecChange({ ...itemSpec, target: { ...itemSpec.target, target: v } })
                }}
                isReadOnly={props.isReadOnly}
              />
            </div>
          )}
        </div>
      </div>
      {itemSpec.target.jsModifierCode === undefined ? null : (
        <div style={{ marginTop: '8rem' }}>
          <CodeEditor
            value={itemSpec.target.jsModifierCode}
            onChange={(v) => {
              onSpecChange({ ...itemSpec, target: { ...itemSpec.target, jsModifierCode: v } })
            }}
            height={40}
          />
        </div>
      )}
    </div>
  );
}

export default BasicMessageFilterTargetInput;
