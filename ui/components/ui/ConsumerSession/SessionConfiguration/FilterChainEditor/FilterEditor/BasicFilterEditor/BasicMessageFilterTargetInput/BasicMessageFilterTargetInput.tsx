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
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '12rem' }}>
            <strong style={{ whiteSpace: 'nowrap' }}>messages where</strong>&nbsp;
            {target.type === "BasicMessageFilterValueTarget" && target.jsonFieldSelector === undefined && (
              <span>
                <strong
                  style={{ textDecoration: 'underline dotted', cursor: 'pointer' }}
                  onClick={() => {
                    if (props.isReadOnly) {
                      return;
                    }

                    if (target.type === "BasicMessageFilterValueTarget") {
                      const newTarget: BasicMessageFilterTarget = {
                        ...itemSpec.target,
                        target: {
                          type: "BasicMessageFilterValueTarget",
                          jsonFieldSelector: ''
                        }
                      };
                      onSpecChange({ ...itemSpec, target: newTarget });
                    }
                  }}
                >entire</strong>&nbsp;
              </span>
            )}
          </span>

          <div className={s.TargetType}>
            <Select<TargetType>
              size='small'
              list={[
                { type: 'item', title: 'value', value: 'BasicMessageFilterValueTarget' },
                { type: 'item', title: 'key', value: 'BasicMessageFilterKeyTarget' },
                { type: 'item', title: 'property', value: 'BasicMessageFilterPropertyTarget' },
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
        </div>

        <div className={s.Target}>
          {target.type === "BasicMessageFilterValueTarget" && target.jsonFieldSelector !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', flex: '1', paddingLeft: '48rem', marginTop: '8rem' }}>
              <strong
                style={{ textDecoration: 'underline dotted', cursor: 'pointer', fontSize: '12rem' }}
                onClick={() => {
                  if (props.isReadOnly) {
                    return;
                  }

                  if (target.type === "BasicMessageFilterValueTarget") {
                    const newTarget: BasicMessageFilterTarget = {
                      type: "BasicMessageFilterTarget",
                      target: {
                        ...target,
                        jsonFieldSelector: undefined
                      }
                    };
                    onSpecChange({ ...itemSpec, target: newTarget });
                  }
                }}
              >sub field</strong>&nbsp;
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
    </div>
  );
}

export default BasicMessageFilterTargetInput;
