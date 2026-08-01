import React, { useEffect, useState } from 'react';

import FilterChainEditor from './FilterChainEditor/FilterChainEditor';
import s from './SessionConfiguration.module.css'
import LibraryBrowserPanel, { LibraryBrowserPanelProps } from '../../LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import { useHover } from '../../../app/hooks/use-hover';
import { ManagedConsumerSessionConfig, ManagedConsumerSessionConfigSpec, ManagedConsumerSessionConfigValOrRef, ManagedConsumerSessionTarget, ManagedConsumerSessionTargetValOrRef } from '../../LibraryBrowser/model/user-managed-items';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../LibraryBrowser/useManagedItemValue';
import NothingToShow from '../../NothingToShow/NothingToShow';
import { LibraryContext } from '../../LibraryBrowser/model/library-context';
import StartFromInput from './StartFromInput/StartFromInput';
import { targetTopicsPersistency } from './StartFromInput/target-topics-persistency';
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
import FormItem from '../../ConfigurationTable/FormItem/FormItem';
import NumDisplayItemsInput from './NumDisplayItemsInput';
import { defaultNumDisplayItems } from './display-items';

export type SessionConfigurationProps = {
  value: ManagedConsumerSessionConfigValOrRef,
  onChange: (config: ManagedConsumerSessionConfigValOrRef) => void,
  libraryContext: LibraryContext,
  appearance?: 'regular' | 'within-library-browser',
  isReadOnly?: boolean,
  libraryBrowserPanel?: Partial<LibraryBrowserPanelProps>
};

// `/consumer-session?id=` accepts the id of ANY persisted library item, so the value handed to this
// editor is not guaranteed to be a consumer session config - it can be a foreign item type or an
// incomplete spec. Reaching into such a spec used to throw during render and, with no error boundary
// above the route, take the whole app down with it. Hence the tolerant reads below and the shape
// check before rendering the editor.
function isConsumerSessionConfigSpec(spec: unknown): spec is ManagedConsumerSessionConfigSpec {
  const isObject = (v: unknown) => typeof v === 'object' && v !== null;

  if (!isObject(spec)) {
    return false;
  }

  const s = spec as Partial<ManagedConsumerSessionConfigSpec>;

  // A val-or-ref field must be the DISCRIMINATED shape, not merely an object: a persisted
  // `{ startFrom: {} }` passed the object check and then sat in useManagedItemValue forever -
  // neither a value to render nor a reference to resolve, so the editor showed an endless
  // spinner. Malformed means broken, and broken must say so.
  const isValOrRef = (v: unknown): boolean => {
    if (!isObject(v)) {
      return false;
    }
    const candidate = v as { type?: unknown; val?: unknown; ref?: unknown };
    if (candidate.type === 'value') {
      return isObject(candidate.val);
    }
    if (candidate.type === 'reference') {
      return typeof candidate.ref === 'string' && candidate.ref !== '';
    }
    return false;
  };

  // Every field the RUNTIME conversion reads has to be here, not only the ones whose absence threw
  // during render: a spec that renders but cannot be converted leaves the session with no runtime
  // config, which used to show as a Play button that started nothing.
  return Array.isArray(s.targets)
    && isValOrRef(s.startFrom)
    && isObject(s.messageFilterChain)
    && isObject(s.coloringRuleChain)
    && isObject(s.valueProjectionList)
    && isObject(s.pauseTriggerChain);
}

function detectAdvancedConfig(value: ManagedConsumerSessionConfigValOrRef): boolean {
  if (value.val?.spec?.coloringRuleChain?.val?.spec?.coloringRules?.length) {
    return true;
  }

  if (value.val?.spec?.messageFilterChain?.val?.spec?.filters?.length) {
    return true;
  }

  if (value.val?.spec?.valueProjectionList?.val?.spec?.projections?.length) {
    return true;
  }

  if (value.val?.spec?.numDisplayItems !== undefined) {
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

  useEffect(() => {
    if (props.value.val === undefined && resolveResult.type === 'success') {
      props.onChange({ ...props.value, val: resolveResult.value });
    }
  }, [resolveResult]);

  if (resolveResult.type !== 'success') {
    return (
      <div style={{ margin: '12rem', flex: '1' }}>
        <UseManagedItemValueSpinner item={props.value} result={resolveResult} />
      </div>
    );
  }

  const item = resolveResult.value;
  const itemSpec = item?.spec;

  if (!isConsumerSessionConfigSpec(itemSpec)) {
    return (
      <div style={{ margin: '12rem', flex: '1' }}>
        <NothingToShow
          reason="error"
          content={(
            <div data-testid="cs-invalid-config">
              The library item with id: {item?.metadata?.id ?? (props.value.type === 'reference' ? props.value.ref : 'unknown')}
              {item?.metadata?.type === undefined ? '' : ` (type: ${item.metadata.type})`}
              &nbsp;is not a valid Consumer Session configuration.
              <br />
              Open a Consumer Session configuration item, or start a new session instead.
            </div>
          )}
        />
      </div>
    );
  }

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
                  type: 'value',
                  val: item as ManagedConsumerSessionConfig
                };

                const isAdvancedConfig = detectAdvancedConfig(newValue);
                setIsShowAdvanced(isAdvancedConfig);

                props.onChange(newValue);
              }}
              onSave={(item) => props.onChange({
                type: 'value',
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
            // The start-from modes depend on what the selected topics retain, and the targets that
            // decide that live here.
            targetTopicsPersistency={targetTopicsPersistency(itemSpec.targets, props.libraryContext)}
          />

          {!isAdvancedConfig && <Toggle
            testId="cs-advanced-toggle"
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
                  <NumDisplayItemsInput
                    value={itemSpec.numDisplayItems ?? defaultNumDisplayItems}
                    onChange={(numDisplayItems) => onSpecChange({ ...itemSpec, numDisplayItems })}
                    isReadOnly={props.isReadOnly}
                  />
                </div>
              </div>
            </FormItem>

            <FilterChainEditor
              testId="cs-session-filters"
              value={itemSpec.messageFilterChain}
              onChange={(v) => onSpecChange({ ...itemSpec, messageFilterChain: v })}
              libraryContext={props.libraryContext}
              isReadOnly={props.isReadOnly}
            />

            <ValueProjectionListInput
              testId="cs-session-projections"
              value={itemSpec.valueProjectionList}
              onChange={(v) => onSpecChange({ ...itemSpec, valueProjectionList: v })}
              libraryContext={props.libraryContext}
              isReadOnly={props.isReadOnly}
            />

            <ColoringRuleChainInput
              testId="cs-session-coloring"
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
              data-testid="cs-target"
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
                        testId="cs-target-move-left"
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
                        testId="cs-target-move-right"
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
                    testId="cs-target-remove"
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
              testId="cs-add-target"
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
