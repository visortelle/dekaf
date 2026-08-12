import React, { useEffect } from 'react';

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
import HelpIcon from '../../ConfigurationTable/HelpIcon/HelpIcon';
import NumDisplayItemsInput from './NumDisplayItemsInput';
import { defaultNumDisplayItems } from './display-items';
import Select from '../../Select/Select';
import { DeliveryOrderKey, MessageDeliveryOrder } from '../types';
import { decodeConsumerSessionConfig, describeProblem } from './decode-session-config';

export type SessionConfigurationProps = {
  value: ManagedConsumerSessionConfigValOrRef,
  onChange: (config: ManagedConsumerSessionConfigValOrRef) => void,
  libraryContext: LibraryContext,
  appearance?: 'regular' | 'within-library-browser',
  isReadOnly?: boolean,
  libraryBrowserPanel?: Partial<LibraryBrowserPanelProps>
};

const SessionConfiguration: React.FC<SessionConfigurationProps> = (props) => {
  const [hoverRef, isHovered] = useHover();
  const ref = React.useRef<HTMLDivElement>(null);

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

  // `/consumer-session?id=` accepts the id of ANY persisted library item, so what arrives here is
  // not guaranteed to be a consumer session config - it can be a foreign item type, a spec written
  // by another build, or one that was hand-edited. Reaching into such a spec used to throw during
  // render and, with no error boundary above the route, take the whole app down with it. So the
  // whole document is decoded before anything is dereferenced, and a failure says WHERE.
  const decoded = decodeConsumerSessionConfig(item);

  if (!decoded.ok) {
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
              <code data-testid="cs-invalid-config-problem">{describeProblem(decoded.problem)}</code>
              <br />
              Open a Consumer Session configuration item, or start a new session instead.
            </div>
          )}
        />
      </div>
    );
  }

  const itemSpec = decoded.item.spec;

  // A spec saved before the field existed names no order, and an absent value means the product
  // default - Guaranteed (owner decision 2026-08-11) - here exactly as it does on the wire and
  // on the server.
  const deliveryOrder = itemSpec.messageDeliveryOrder ?? 'guaranteed';
  const deliveryOrderTime = itemSpec.deliveryOrderKey ?? 'publish-time';

  // ALL modes described at once, behind the label's help circle (the app-wide pattern): the reader
  // opens this to CHOOSE, so showing only the selected mode's contract - as the always-visible
  // paragraph this replaced did - answered the one question they were not asking.
  const deliveryOrderHelp = (
    <div>
      <p><strong>Guaranteed</strong> (default) - replays already-recorded messages in exact timestamp
        order, then pauses. Pressing Play again loads what arrived since. Multi-topic sessions need
        persistent topics.</p>
      <p><strong>Best effort</strong> - follows live traffic, sorting by timestamp within
        ~0.75 s. A late message can appear out of order; nothing is dropped.</p>
      <p><strong>Fastest</strong> - shows messages as they arrive, with no ordering across topics or
        partitions.</p>
    </div>
  );

  const deliveryOrderTimeHelp = (
    <div>
      <p><strong>Publish time</strong> - stamped by the producer when sending. Always present.</p>
      <p><strong>Broker publish time</strong> - stamped by the broker on arrival, so producer clock skew
        cannot disorder it. Needs broker entry metadata enabled on the cluster; without it the session
        cannot start.</p>
      <p><strong>Event time</strong> - set by your application. Messages without one fall back to
        publish time.</p>
    </div>
  );

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

          <FormItem>
            <label htmlFor="cs-delivery-order-select" style={{ display: 'flex', alignItems: 'center', gap: '12rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6rem' }} data-testid="cs-delivery-order-help">
                Delivery order
                <HelpIcon help={deliveryOrderHelp} />
              </span>
              <Select<MessageDeliveryOrder>
                testId="cs-delivery-order"
                id="cs-delivery-order-select"
                value={deliveryOrder}
                onChange={(v) => onSpecChange({
                  ...itemSpec,
                  messageDeliveryOrder: v
                })}
                list={[
                  { type: 'item', value: 'guaranteed', title: 'Guaranteed' },
                  { type: 'item', value: 'best-effort', title: 'Best effort' },
                  { type: 'item', value: 'as-received', title: 'Fastest' }
                ]}
                isReadOnly={props.isReadOnly}
              />
            </label>
            {deliveryOrder !== 'as-received' && (<>
              <label
                htmlFor="cs-delivery-order-key-select"
                style={{ display: 'flex', alignItems: 'center', gap: '12rem', marginTop: '8rem' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6rem' }} data-testid="cs-delivery-order-key-help">
                  Order by
                  <HelpIcon help={deliveryOrderTimeHelp} />
                </span>
                <Select<DeliveryOrderKey>
                  testId="cs-delivery-order-key"
                  id="cs-delivery-order-key-select"
                  value={deliveryOrderTime}
                  onChange={(v) => onSpecChange({
                    ...itemSpec,
                    deliveryOrderKey: v === 'publish-time' ? undefined : v
                  })}
                  list={[
                    { type: 'item', value: 'publish-time', title: 'Publish time' },
                    { type: 'item', value: 'broker-publish-time', title: 'Broker publish time' },
                    { type: 'item', value: 'event-time', title: 'Event time' }
                  ]}
                  isReadOnly={props.isReadOnly}
                />
              </label>
            </>)}
          </FormItem>

          <FormItem>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12rem' }}>
              <Toggle
                testId="cs-limit-display-items"
                value={itemSpec.numDisplayItems !== undefined}
                onChange={(v) => onSpecChange({
                  ...itemSpec,
                  numDisplayItems: v ? defaultNumDisplayItems : undefined
                })}
                label='Limit num. display messages'
                isReadOnly={props.isReadOnly}
              />
              <span data-testid="cs-num-display-items-help" style={{ display: 'flex', alignItems: 'center' }}>
                <HelpIcon
                  help={
                    'Limits how many messages are kept in the browser. Choose it based on the average '
                    + 'message size in the consumed topics - if the browser hangs or runs out of memory, '
                    + 'lower the limit for this consumer session.'
                  }
                />
              </span>
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
                    title={itemSpec.targets.length > 1
                      ? 'Remove this Consumer Session Target'
                      : 'A session needs at least one target'}
                    // Removing the last one leaves a session with nothing to consume from. The
                    // server refuses that config and so does the decoder above, which would swap
                    // this editor for the invalid-config error with no way back.
                    disabled={itemSpec.targets.length === 1}
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
