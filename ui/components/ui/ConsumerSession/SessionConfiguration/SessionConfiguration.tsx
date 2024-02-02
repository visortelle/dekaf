import React, { useEffect, useState } from 'react';

import FilterChainEditor from './FilterChainEditor/FilterChainEditor';
import s from './SessionConfiguration.module.css'
import LibraryBrowserPanel, { LibraryBrowserPanelProps } from '../../LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import { useHover } from '../../../app/hooks/use-hover';
import { ManagedConsumerSessionConfig, ManagedConsumerSessionConfigSpec, ManagedConsumerSessionConfigValOrRef, ManagedConsumerSessionTarget, ManagedConsumerSessionTargetValOrRef } from '../../LibraryBrowser/model/user-managed-items';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../LibraryBrowser/useManagedItemValue';
import { LibraryContext } from '../../LibraryBrowser/model/library-context';
import StartFromInput from './StartFromInput/StartFromInput';
import SessionTargetInput from './SessionTargetInput/SessionTargetInput';
import AddButton from '../../AddButton/AddButton';
import DeleteButton from '../../DeleteButton/DeleteButton';
import ColoringRuleChainInput from './ColoringRulesInput/ColoringRuleChainInput';
import Toggle from '../../Toggle/Toggle';
import { getDefaultManagedItem } from '../../LibraryBrowser/default-library-items';
import ValueProjectionListInput from '../value-projections/ValueProjectionListInput/ValueProjectionListInput';
import SmallButton from '../../SmallButton/SmallButton';
import { arrayMove } from './array-move';
import moveLeftIcon from './icons/move-left.svg';
import moveRightIcon from './icons/move-right.svg';
import Input from '../../Input/Input';
import FormItem from '../../ConfigurationTable/FormItem/FormItem';

export const defaultNumDisplayItems = 10_000;

export type SessionConfigurationProps = {
  value: ManagedConsumerSessionConfigValOrRef,
  onChange: (config: ManagedConsumerSessionConfigValOrRef) => void,
  libraryContext: LibraryContext,
  appearance?: 'regular' | 'within-library-browser',
  isReadOnly?: boolean,
  libraryBrowserPanel?: Partial<LibraryBrowserPanelProps>
};

function detectAdvancedConfig(value: ManagedConsumerSessionConfigValOrRef): boolean {
  if (value.val?.spec.coloringRuleChain.val?.spec.coloringRules.length) {
    return true;
  }

  if (value.val?.spec.messageFilterChain.val?.spec.filters.length) {
    return true;
  }

  if (value.val?.spec.valueProjectionList.val?.spec.projections.length) {
    return true;
  }

  return false;
}

const SessionConfiguration: React.FC<SessionConfigurationProps> = (props) => {
  const [hoverRef, isHovered] = useHover();
  const ref = React.useRef<HTMLDivElement>(null);
  const [isShowAdvanced, setIsShowAdvanced] = useState(detectAdvancedConfig(props.value));
  const isAdvancedConfig = detectAdvancedConfig(props.value);

  useEffect(() => {
    if (isAdvancedConfig && !isShowAdvanced) {
      setIsShowAdvanced(true);
    }
  }, [isAdvancedConfig, isShowAdvanced]);

  const resolveResult = useManagedItemValue<ManagedConsumerSessionConfig>(props.value);
  if (resolveResult.type !== 'success') {
    return <UseManagedItemValueSpinner item={props.value} result={resolveResult} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: ManagedConsumerSessionConfigSpec) => {
    const newValue: ManagedConsumerSessionConfigValOrRef = { ...props.value, val: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedConsumerSessionConfigValOrRef = { type: 'value', val: item };
    props.onChange(newValue);
  };

  return (
    <div
      className={`
        ${s.SessionConfiguration}
        ${props.appearance === 'within-library-browser' ? s.WithinLibraryBrowser : ''}
      `}
    >
      <div className={s.Columns} ref={ref}>
        <div className={s.GlobalConfig}>
          <div className={s.Title} ref={hoverRef}>
            <LibraryBrowserPanel
              value={item}
              itemType='consumer-session-config'
              onPick={(item) => {
                const newValue: ManagedConsumerSessionConfigValOrRef = {
                  type: 'reference',
                  ref: item.metadata.id,
                  val: item as ManagedConsumerSessionConfig
                };

                const isAdvancedConfig = detectAdvancedConfig(newValue);
                setIsShowAdvanced(isAdvancedConfig);

                props.onChange(newValue);
              }}
              onSave={(item) => props.onChange({
                type: 'reference',
                ref: item.metadata.id,
                val: item as ManagedConsumerSessionConfig
              })}
              onChange={(item) => {
                props.onChange({
                  ...props.value,
                  val: item as ManagedConsumerSessionConfig
                });
              }}
              isForceShowButtons={isHovered}
              libraryContext={props.libraryContext}
              managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
              isReadOnly={props.isReadOnly}
              {...props.libraryBrowserPanel}
            />
          </div>

          <StartFromInput
            value={itemSpec.startFrom}
            onChange={(v) => onSpecChange({ ...itemSpec, startFrom: v })}
            libraryContext={props.libraryContext}
            isReadOnly={props.isReadOnly}
          />

          {!isAdvancedConfig && <Toggle
            value={isShowAdvanced}
            onChange={v => setIsShowAdvanced(v)}
            label='Show advanced settings'
            isReadOnly={props.isReadOnly}
          />}
          {isShowAdvanced && (<>
            <FormItem>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12rem' }}>
                <Toggle
                  value={itemSpec.numDisplayItems !== undefined}
                  onChange={(v) => onSpecChange({
                    ...itemSpec,
                    numDisplayItems: v ? defaultNumDisplayItems : undefined
                  })}
                  label='Limit num. display messages'
                  isReadOnly={props.isReadOnly}
                />
                <div style={{ visibility: itemSpec.numDisplayItems === undefined ? 'hidden' : 'visible' }}>
                  <Input
                    type="number"
                    value={String(itemSpec.numDisplayItems)}
                    size='small'
                    onChange={v => onSpecChange({ ...itemSpec, numDisplayItems: Number(v) })}
                  />
                </div>
              </div>
            </FormItem>

            <FilterChainEditor
              value={itemSpec.messageFilterChain}
              onChange={(v) => onSpecChange({ ...itemSpec, messageFilterChain: v })}
              libraryContext={props.libraryContext}
              isReadOnly={props.isReadOnly}
            />

            <ValueProjectionListInput
              value={itemSpec.valueProjectionList}
              onChange={(v) => onSpecChange({ ...itemSpec, valueProjectionList: v })}
              libraryContext={props.libraryContext}
              isReadOnly={props.isReadOnly}
            />

            <ColoringRuleChainInput
              value={itemSpec.coloringRuleChain}
              onChange={(v) => onSpecChange({ ...itemSpec, coloringRuleChain: v })}
              libraryContext={props.libraryContext}
              isReadOnly={props.isReadOnly}
            />
          </>)}

          {/*
          <FormLabel
            content="Pause Trigger"
            help={(
              <div>
                The consumer will automatically pause when the specified condition is met.
                It useful when you want to find some specific messages in large topics.
              </div>
            )}
          />
          <div>TODO</div> */}
        </div>

        {itemSpec.targets.map((topic, i) => {
          return (
            <div
              key={topic.type === 'reference' ? topic.ref : topic.val.metadata.id}
              className={s.TargetColumn}
            >
              <SessionTargetInput
                targetIndex={i}
                value={topic}
                onChange={(v) => {
                  const newTargets = [...itemSpec.targets];
                  newTargets[i] = v;
                  onSpecChange({ ...itemSpec, targets: newTargets });
                }}
                libraryContext={props.libraryContext}
                isReadOnly={props.isReadOnly}
              />
              {!props.isReadOnly && (
                <div className={s.TopRightButtons}>
                  {itemSpec.targets.length > 1 && (
                    <>
                      <SmallButton
                        type='regular'
                        appearance='borderless-semitransparent'
                        svgIcon={moveLeftIcon}
                        title="Move left"
                        onClick={() => {
                          const newTargets = arrayMove(itemSpec.targets, i, i - 1);
                          onSpecChange({ ...itemSpec, targets: newTargets });
                        }}
                        disabled={i === 0}
                      />
                      <SmallButton
                        type='regular'
                        appearance='borderless-semitransparent'
                        svgIcon={moveRightIcon}
                        title="Move right"
                        onClick={() => {
                          const newTargets = arrayMove(itemSpec.targets, i, i + 1);
                          onSpecChange({ ...itemSpec, targets: newTargets });
                        }}
                        disabled={i === (itemSpec.targets.length - 1)}
                      />
                    </>
                  )}
                  <DeleteButton
                    title='Remove this Consumer Session Target'
                    onClick={() => {
                      const newTargets = [...itemSpec.targets];
                      newTargets.splice(i, 1);
                      onSpecChange({ ...itemSpec, targets: newTargets });
                    }}
                    appearance="borderless-semitransparent"
                    isHideText
                  />
                </div>
              )}
            </div>
          );
        })}

        <div className={s.LastColumn}>
          {!props.isReadOnly && (
            <AddButton
              text='Add Target'
              onClick={() => {
                const newTarget: ManagedConsumerSessionTargetValOrRef = {
                  type: "value",
                  val: getDefaultManagedItem("consumer-session-target", props.libraryContext) as ManagedConsumerSessionTarget
                };
                const newTargets = itemSpec.targets.concat([newTarget]);
                onSpecChange({ ...itemSpec, targets: newTargets });

                setTimeout(() => {
                  ref.current?.scrollTo({ left: ref.current.scrollWidth, behavior: 'smooth' });
                }, 100);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default SessionConfiguration;
