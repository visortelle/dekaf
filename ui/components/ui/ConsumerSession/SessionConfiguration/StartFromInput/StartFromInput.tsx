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
import { TargetTopicsPersistency, startFromPersistencyAdvice } from './target-topics-persistency';
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
  // Two modes, not one, because "about half way in" is two different questions: half the MESSAGES
  // behind you, or half the TIME behind you. On a topic where almost everything arrived in the last
  // hour of a month's retention those land hours and weeks apart.
  { type: 'item', title: 'About % through the data', value: 'approximateDataPosition' },
  { type: 'item', title: 'About % through the time range', value: 'approximateTimePosition' }
];

// Every mode except the live tail needs the topic to have kept something. On a non-persistent topic
// they are all unusable - including "Earliest message", which is the misleading one: nothing is
// retained, so it quietly behaves as "from now" instead of failing.
const historyDependentStartFromTypes: StartFromType[] = [
  'earliestMessage',
  'messageId',
  'dateTime',
  'relativeDateTime',
  'nthMessageAfterEarliest',
  'nthMessageBeforeLatest',
  // Both approximate modes are proportions OF a history, so neither can be computed where there is
  // none: one needs the topic's entry count, the other its first and last publish times.
  'approximateDataPosition',
  'approximateTimePosition'
];

function startFromList(isHistoryUnavailable: boolean): List<StartFromType> {
  if (!isHistoryUnavailable) {
    return list;
  }

  return list.map((item) => {
    if (item.type !== 'item' || !historyDependentStartFromTypes.includes(item.value)) {
      return item;
    }

    return { ...item, disabled: true };
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

  // A mode the selected topics can no longer honour would just sit there being unusable, so drop
  // back to the live tail - the only thing a non-persistent topic can actually do.
  useEffect(() => {
    if (!isHistoryUnavailable || props.isReadOnly || resolveResult.type !== 'success') {
      return;
    }

    if (resolvedStartFromType === undefined || resolvedStartFromType === 'latestMessage') {
      return;
    }

    props.onChange({
      ...props.value,
      val: { ...resolveResult.value, spec: { startFrom: { type: 'latestMessage' } } }
    });
  }, [isHistoryUnavailable, resolvedStartFromType, props.isReadOnly]);

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
  // exact-count across partitions (see the counted-note above), and this line would undersell them.
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
              case 'approximateDataPosition': {
                onSpecChange({ startFrom: { type: 'approximateDataPosition', fraction: defaultApproximateFraction } });
                return;
              }
              case 'approximateTimePosition': {
                onSpecChange({ startFrom: { type: 'approximateTimePosition', fraction: defaultApproximateFraction } });
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
      {persistencyAdvice === 'history-partial' && (
        <div className={s.PersistencyNote} data-testid="cs-start-from-mixed-persistency-note">
          Some of the selected topics are non-persistent and keep no history. Those start from now, whatever is chosen
          here.
        </div>
      )}
      {(itemSpec.startFrom.type === 'nthMessageAfterEarliest' || itemSpec.startFrom.type === 'nthMessageBeforeLatest') && (
        <div className={s.PersistencyNote} data-testid="cs-start-from-counted-note">
          Across a partitioned topic or several topics, "first" and "last" are decided by each message's publish time,
          taken partition by partition in the order they were written. Pulsar keeps no global sequence, so if producer
          clocks disagree - or one steps backwards - the count is still exactly n, but which n can differ from a strict
          publish-time answer.
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
      {itemSpec.startFrom.type === 'approximateDataPosition' && (
        <div className={s.AdditionalControls}>
          <ApproximateFractionInput
            testIdPrefix="cs-start-from-data"
            fraction={itemSpec.startFrom.fraction}
            onChange={(fraction) => onSpecChange({ startFrom: { type: 'approximateDataPosition', fraction } })}
            disabled={props.disabled}
            isReadOnly={props.isReadOnly}
          />
          <div className={s.ApproximateFractionNote} data-testid="cs-start-from-data-note">
            <div>
              Starts partway into the messages a topic still keeps: 0% is the oldest message still kept. 100% goes
              past all of them and shows only messages published from now on, exactly like "Latest message" - it is
              the one percentage that shows nothing that is already there.
            </div>
            <div>
              This counts messages, not time. If most of the messages arrived in the last hour, then 50% lands inside
              that last hour - use "About % through the time range" to go half way back in time instead.
            </div>
            <div>
              Every topic starts at its own position. If this session covers more than one topic, or a partitioned
              topic, each topic and each partition jumps to that percentage of its own messages - not of all of them
              put together.
            </div>
            <div>
              The position is approximate. Pulsar stores messages in batched entries, and the jump is measured in
              entries, so 75% of the entries is not exactly 75% of the messages - the two drift apart as far as batch
              sizes varied. That is the trade for staying instant on a huge topic, where "Skip first n messages" has to
              count every message it skips.
            </div>
          </div>
        </div>
      )}
      {itemSpec.startFrom.type === 'approximateTimePosition' && (
        <div className={s.AdditionalControls}>
          <ApproximateFractionInput
            testIdPrefix="cs-start-from-time"
            fraction={itemSpec.startFrom.fraction}
            onChange={(fraction) => onSpecChange({ startFrom: { type: 'approximateTimePosition', fraction } })}
            disabled={props.disabled}
            isReadOnly={props.isReadOnly}
          />
          <div className={s.ApproximateFractionNote} data-testid="cs-start-from-time-note">
            <div>
              Starts partway through the time a topic still covers: 0% is the oldest message still kept, 100% is the
              newest one. 50% is the middle of that stretch of time, whether one message was published in it or a
              billion.
            </div>
            <div>
              This measures time, not messages. If most of the messages arrived in the last hour of a month's worth of
              history, 50% here is about two weeks ago - use "About % through the data" to land half way through the
              messages instead.
            </div>
            <div>
              A partitioned topic is treated as one topic: the stretch runs from its oldest message to its newest,
              across every partition, and all of them jump to the same moment. A partition that went quiet early
              simply has nothing left to show from there. Separate topics still each start at their own moment.
            </div>
            <div>
              The moment is approximate: it is worked out from when messages were published, and that timestamp comes
              from the machine that sent them.
            </div>
          </div>
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
