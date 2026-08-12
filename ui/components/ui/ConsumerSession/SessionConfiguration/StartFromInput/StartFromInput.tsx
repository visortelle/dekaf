import React, { useEffect } from 'react';
import s from './StartFromInput.module.css'
import Select, { List } from '../../../Select/Select';
import DatetimePicker from '../../../DatetimePicker/DatetimePicker';
import { ConsumerSessionStartFrom } from '../../types';
import Input from '../../../Input/Input';
import RelativeDateTimePicker from '../../../RelativeDateTimePicker/RelativeDateTimePicker';
import { v4 as uuid } from 'uuid';
import { useHover } from '../../../../app/hooks/use-hover';
import { ManagedConsumerSessionStartFrom, ManagedConsumerSessionStartFromSpec, ManagedConsumerSessionStartFromValOrRef, ManagedDateTimeValOrRef, ManagedMessageIdValOrRef, ManagedRelativeDateTimeValOrRef } from '../../../LibraryBrowser/model/user-managed-items';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../LibraryBrowser/useManagedItemValue';
import LibraryBrowserPanel, { LibraryBrowserPanelProps } from '../../../LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import { LibraryContext } from '../../../LibraryBrowser/model/library-context';
import { cloneDeep } from 'lodash';
import ApproximateFractionInput from './ApproximateFractionInput';
import MessageCountInput from './MessageCountInput';
import { defaultApproximateFraction } from './approximate-fraction';
import { TargetTopicsPersistency, historyDependentStartFromTypes, startFromPersistencyAdvice } from './target-topics-persistency';
import { messageIdError } from './message-id';
import { latestMessageCountMax } from './message-count';

export type StartFromInputProps = {
  value: ManagedConsumerSessionStartFromValOrRef;
  onChange: (value: ManagedConsumerSessionStartFromValOrRef) => void;
  libraryContext: LibraryContext;
  disabled?: boolean;
  isReadOnly?: boolean;
  libraryBrowserPanel?: Partial<LibraryBrowserPanelProps>
  /**
   * What the session's selected topics can retain. Omitted where there are no targets to speak of
   * (the standalone library item editor), which leaves every mode available.
   */
  targetTopicsPersistency?: TargetTopicsPersistency;
};

type StartFromType = ConsumerSessionStartFrom['type'];

const list: List<StartFromType> = [
  { type: 'item', title: 'Earliest message', value: 'earliestMessage' },
  { type: 'item', title: 'Latest message', value: 'latestMessage' },
  {
    type: 'item',
    title: 'Message with specific ID',
    value: 'messageId'
  },
  { type: 'item', title: 'Specific time', value: 'dateTime' },
  { type: 'item', title: 'Relative time ago', value: 'relativeDateTime' },
  { type: 'item', title: 'Skip first n messages', value: 'nthMessageAfterEarliest' },
  { type: 'item', title: 'Latest n messages', value: 'nthMessageBeforeLatest' },
  // One estimates position from retained entries; the other interpolates over publish time.
  { type: 'item', title: 'Approximate position (% of data)', value: 'approximateEntryPosition' },
  { type: 'item', title: 'Approximate position (% of time)', value: 'approximatePublishTimePosition' }
];

// Which modes need retained history - and why - lives in target-topics-persistency.ts, shared
// with the session-local fallback so the note below and what Play actually sends cannot disagree.
//
// Latest x Guaranteed is deliberately NOT gated here (owner decision 2026-08-11, reversing the
// 2026-08-09 disabled-option gate): the combination is legal - Play answers with an instant
// caught-up and raises the caught-up panel, whose "Load new messages up to now" and "Switch to
// Best effort and follow live" are the decision the user then makes. A selectable option plus
// that notification beats a greyed-out entry needing an explanation.
function startFromList(isHistoryUnavailable: boolean): List<StartFromType> {
  if (!isHistoryUnavailable) {
    return list;
  }

  return list.map((item) => {
    if (item.type !== 'item') {
      return item;
    }

    if (historyDependentStartFromTypes.includes(item.value)) {
      return { ...item, disabled: true };
    }

    return item;
  });
}

const StartFromInput: React.FC<StartFromInputProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

  const resolveResult = useManagedItemValue<ManagedConsumerSessionStartFrom>(props.value);

  const persistencyAdvice = props.targetTopicsPersistency === undefined
    ? 'none'
    : startFromPersistencyAdvice(props.targetTopicsPersistency);
  const isHistoryUnavailable = persistencyAdvice === 'history-unavailable';
  const resolvedStartFromType = resolveResult.type === 'success' ? resolveResult.value?.spec?.startFrom?.type : undefined;

  useEffect(() => {
    if (props.value.val === undefined && resolveResult.type === 'success') {
      props.onChange({ ...props.value, val: resolveResult.value });
    }
  }, [resolveResult]);

  // A configured mode the selected topics can no longer honour is NOT rewritten. This effect used
  // to overwrite it with the live tail, which silently destroyed the configured message id / time
  // / count - and, for a referenced library item, wrote a local `val` over a kept
  // `type: 'reference'`, so the session disagreed with the item it named. The stored value now
  // stays exactly as the user wrote it; the session applies the live tail as a session-local
  // substitution at conversion time (effectiveStartFrom), and the note below says so.
  const isStartFromInapplicable = isHistoryUnavailable
    && resolvedStartFromType !== undefined
    && historyDependentStartFromTypes.includes(resolvedStartFromType);

  if (resolveResult.type !== 'success') {
    return <UseManagedItemValueSpinner item={props.value} result={resolveResult} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: ManagedConsumerSessionStartFromSpec) => {
    const newValue: ManagedConsumerSessionStartFromValOrRef = { ...props.value, val: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedConsumerSessionStartFromValOrRef = { type: 'value', val: item };
    props.onChange(newValue);
  };

  // messageId only: a message id names one entry in one topic's log, so it has no meaning across a
  // partitioned topic or several topics. The counted modes deliberately do NOT carry this - they are
  // exact-count across partitions, and this line would undersell them. (Their ordering contract
  // lives in MessageOrderKey's scaladoc and docs/consume; the inline note that restated it was
  // removed 2026-08-12, owner instruction.)
  const messageIdWorksBestNote = <div style={{ padding: '12rem', borderRadius: '8rem', marginTop: '8rem', background: 'var(--surface-color)' }}>Works best with a single non-partitioned topic.</div>;

  const messageIdHexString = itemSpec.startFrom.type === 'messageId'
    ? (itemSpec.startFrom.messageId.val?.spec.hexString || '')
    : undefined;
  // The same check the request conversion makes, run while the user can still see the field: the
  // conversion happens after the Play click, so without this the only symptom is a create that the
  // server refuses for a reason that names no field.
  const startFromMessageIdError = messageIdHexString === undefined ? undefined : messageIdError(messageIdHexString);

  return (
    <div className={s.StartFromInput} ref={hoverRef}>
      <LibraryBrowserPanel
        value={item}
        itemType='consumer-session-start-from'
        onPick={(item) => props.onChange({
          type: 'value',
          val: item as ManagedConsumerSessionStartFrom
        })}
        onSave={(item) => props.onChange({
          type: 'value',
          val: item as ManagedConsumerSessionStartFrom
        })}
        onChange={(item) => {
          props.onChange({
            ...props.value,
            val: item as ManagedConsumerSessionStartFrom
          });
        }}
        isForceShowButtons={isHovered}
        libraryContext={props.libraryContext}
        managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
        isReadOnly={props.isReadOnly}
        {...props.libraryBrowserPanel}
      />
      <div className={s.TypeSelect}>
        <Select<ManagedConsumerSessionStartFromSpec['startFrom']['type']>
          testId="cs-start-from"
          list={startFromList(isHistoryUnavailable)}
          value={itemSpec.startFrom.type}
          onChange={(v) => {
            switch (v as StartFromType) {
              case 'earliestMessage': {
                onSpecChange({ startFrom: { type: 'earliestMessage' } });
                return;
              }
              case 'latestMessage': {
                onSpecChange({ startFrom: { type: 'latestMessage' } });
                return;
              }
              case 'nthMessageAfterEarliest': {
                onSpecChange({ startFrom: { type: 'nthMessageAfterEarliest', n: 5 } });
                return;
              }
              case 'nthMessageBeforeLatest': {
                onSpecChange({ startFrom: { type: 'nthMessageBeforeLatest', n: 5 } });
                return;
              }
              case 'approximateEntryPosition': {
                onSpecChange({ startFrom: { type: 'approximateEntryPosition', fraction: defaultApproximateFraction } });
                return;
              }
              case 'approximatePublishTimePosition': {
                onSpecChange({ startFrom: { type: 'approximatePublishTimePosition', fraction: defaultApproximateFraction } });
                return;
              }
              case 'messageId': {
                const messageId: ManagedMessageIdValOrRef = {
                  type: 'value',
                  val: {
                    metadata: { id: uuid(), name: '', descriptionMarkdown: '', type: 'message-id' },
                    spec: { hexString: '' }
                  }
                }
                onSpecChange({ startFrom: { type: 'messageId', messageId } });
                return;
              };
              case 'dateTime': {
                const dateTime: ManagedDateTimeValOrRef = {
                  type: 'value',
                  val: {
                    metadata: { id: uuid(), name: '', descriptionMarkdown: '', type: 'date-time' },
                    spec: { dateTime: new Date() }
                  }
                };
                onSpecChange({ startFrom: { type: 'dateTime', dateTime } });
                return;
              }
              case 'relativeDateTime': {
                const relativeDateTime: ManagedRelativeDateTimeValOrRef = {
                  type: 'value',
                  val: {
                    metadata: { id: uuid(), name: '', descriptionMarkdown: '', type: 'relative-date-time' },
                    spec: {
                      unit: 'hour',
                      value: 1,
                      isRoundedToUnitStart: false
                    }
                  }
                };
                onSpecChange({ startFrom: { type: 'relativeDateTime', relativeDateTime } });
                return;
              }
            }
          }}
          disabled={props.disabled}
          isReadOnly={props.isReadOnly}
        />
      </div>
      {persistencyAdvice === 'history-unavailable' && (
        <div className={s.PersistencyNote} data-testid="cs-start-from-non-persistent-note">
          These topics are non-persistent: they keep no history, so a session can only show messages published from
          now on.
        </div>
      )}
      {isStartFromInapplicable && (
        <div className={s.PersistencyNote} data-testid="cs-start-from-inapplicable-note" role="status">
          The configured start position needs history these topics do not keep, so this session will start from the
          latest message instead. The configuration itself is left unchanged.
        </div>
      )}
      {persistencyAdvice === 'history-partial' && (
        <div className={s.PersistencyNote} data-testid="cs-start-from-mixed-persistency-note">
          Some of the selected topics are non-persistent and keep no history. Those start from now, whatever is chosen
          here.
        </div>
      )}
      {itemSpec.startFrom.type === 'nthMessageAfterEarliest' && (
        <div className={s.AdditionalControls}>
          <MessageCountInput
            n={itemSpec.startFrom.n}
            onChange={(n) => onSpecChange({ startFrom: { type: 'nthMessageAfterEarliest', n } })}
            disabled={props.disabled}
            isReadOnly={props.isReadOnly}
          />
        </div>
      )}
      {itemSpec.startFrom.type === 'nthMessageBeforeLatest' && (
        <div className={s.AdditionalControls}>
          <MessageCountInput
            n={itemSpec.startFrom.n}
            onChange={(n) => onSpecChange({ startFrom: { type: 'nthMessageBeforeLatest', n } })}
            // Only this mode has a ceiling: the last n are resolved by a backward walk over entry
            // metadata, one broker lookup per entry with no progress reporting, so a huge n is a
            // request the server would grind on for hours. Skip-N streams past its messages
            // instead, reports progress while it does, and deliberately has no maximum.
            max={latestMessageCountMax}
            disabled={props.disabled}
            isReadOnly={props.isReadOnly}
          />
        </div>
      )}
      {itemSpec.startFrom.type === 'approximateEntryPosition' && (
        <div className={s.AdditionalControls}>
          <ApproximateFractionInput
            testIdPrefix="cs-start-from-entry"
            accessibleName="Approximate data position"
            startLabel="Earliest"
            endLabel="New messages"
            fraction={itemSpec.startFrom.fraction}
            onChange={(fraction) => onSpecChange({ startFrom: { type: 'approximateEntryPosition', fraction } })}
            disabled={props.disabled}
            isReadOnly={props.isReadOnly}
          />
        </div>
      )}
      {itemSpec.startFrom.type === 'approximatePublishTimePosition' && (
        <div className={s.AdditionalControls}>
          <ApproximateFractionInput
            testIdPrefix="cs-start-from-publish-time"
            accessibleName="Approximate publish-time position"
            startLabel="Earliest"
            endLabel="Last publish time"
            fraction={itemSpec.startFrom.fraction}
            onChange={(fraction) => onSpecChange({ startFrom: { type: 'approximatePublishTimePosition', fraction } })}
            disabled={props.disabled}
            isReadOnly={props.isReadOnly}
          />
        </div>
      )}
      {itemSpec.startFrom.type === 'messageId' && (
        <div className={s.AdditionalControls}>
          <Input
            testId="cs-start-from-message-id"
            value={itemSpec.startFrom.messageId.val?.spec.hexString || ''}
            placeholder="08 c3 03 10 cd 04 20 00 30 01"
            onChange={(v) => {
              const newItemSpec = cloneDeep(itemSpec);

              if (newItemSpec.startFrom.type !== 'messageId') {
                return;
              }

              if (newItemSpec.startFrom.messageId.val === undefined) {
                return;
              }

              newItemSpec.startFrom.messageId.val.spec.hexString = v;
              onSpecChange(newItemSpec);
            }}
            isError={startFromMessageIdError !== undefined}
            isReadOnly={props.isReadOnly}
          />
          {startFromMessageIdError !== undefined && (
            <div className={s.ApproximateFractionError} data-testid="cs-start-from-message-id-error">
              {startFromMessageIdError}
            </div>
          )}
          {messageIdWorksBestNote}
        </div>
      )}
      {itemSpec.startFrom.type === 'dateTime' && (
        <div className={s.AdditionalControls}>
          <DatetimePicker
            value={itemSpec.startFrom.dateTime.val?.spec.dateTime}
            onChange={(v) => {
              const newItemSpec = cloneDeep(itemSpec);

              if (newItemSpec.startFrom.type !== 'dateTime') {
                return;
              }

              if (newItemSpec.startFrom.dateTime.val === undefined) {
                return;
              }

              newItemSpec.startFrom.dateTime.val.spec.dateTime = v || new Date();
              onSpecChange(newItemSpec);
            }}
            disabled={props.disabled}
            isReadOnly={props.isReadOnly}
          />
        </div>
      )}
      {itemSpec.startFrom.type === 'relativeDateTime' && (
        <div className={s.AdditionalControls}>
          <RelativeDateTimePicker
            value={itemSpec.startFrom.relativeDateTime.val?.spec!}
            onChange={(v) => {
              const newItemSpec = cloneDeep(itemSpec);

              if (newItemSpec.startFrom.type !== 'relativeDateTime') {
                return;
              }

              if (newItemSpec.startFrom.relativeDateTime.val === undefined) {
                return;
              }

              newItemSpec.startFrom.relativeDateTime.val.spec = v;
              onSpecChange(newItemSpec);
            }}
            isReadOnly={props.isReadOnly}
          />
        </div>
      )}
    </div >
  );
}

export default StartFromInput;
