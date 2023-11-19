import React from 'react';

import FilterChainEditor from './FilterChainEditor/FilterChainEditor';
import s from './SessionConfiguration.module.css'
import FormLabel from '../../../ui/ConfigurationTable/FormLabel/FormLabel';
import LibraryBrowserPanel from '../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import { useHover } from '../../../app/hooks/use-hover';
import { ManagedConsumerSessionConfig, ManagedConsumerSessionConfigSpec, ManagedConsumerSessionConfigValOrRef } from '../../../ui/LibraryBrowser/model/user-managed-items';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../ui/LibraryBrowser/useManagedItemValue';
import { LibraryContext } from '../../../ui/LibraryBrowser/model/library-context';
import StartFromInput from './StartFromInput/StartFromInput';
import SessionTopicInput from './SessionTopicInput/SessionTopicInput';
import AddButton from '../../../ui/AddButton/AddButton';
import { createNewTarget } from '../../create-new-target';
import DeleteButton from '../../../ui/DeleteButton/DeleteButton';
import ColoringRuleChainInput from './ColoringRulesInput/ColoringRuleChainInput';

export type SessionConfigurationProps = {
  value: ManagedConsumerSessionConfigValOrRef;
  onChange: (config: ManagedConsumerSessionConfigValOrRef) => void;
  libraryContext: LibraryContext;
};

const SessionConfiguration: React.FC<SessionConfigurationProps> = (props) => {
  const [hoverRef, isHovered] = useHover();
  const columnsRef = React.useRef<HTMLDivElement>(null);

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
    <div className={s.SessionConfiguration}>
      <div className={s.Columns} ref={columnsRef}>
        <div className={s.GlobalConfig}>
          <div className={s.Title} ref={hoverRef}>
            <LibraryBrowserPanel
              itemToSave={item}
              itemType='consumer-session-config'
              onPick={(item) => props.onChange({
                type: 'reference',
                ref: item.metadata.id,
                val: item as ManagedConsumerSessionConfig
              })}
              onSave={(item) => props.onChange({
                type: 'reference',
                ref: item.metadata.id,
                val: item as ManagedConsumerSessionConfig
              })}
              isForceShowButtons={isHovered}
              libraryContext={props.libraryContext}
              managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
            />
          </div>

          <StartFromInput
            value={itemSpec.startFrom}
            onChange={(v) => onSpecChange({ ...itemSpec, startFrom: v })}
            libraryContext={props.libraryContext}
          />

          <FilterChainEditor
            value={itemSpec.messageFilterChain}
            onChange={(v) => onSpecChange({ ...itemSpec, messageFilterChain: v })}
            libraryContext={props.libraryContext}
          />

          <ColoringRuleChainInput
            value={itemSpec.coloringRuleChain}
            onChange={(v) => onSpecChange({ ...itemSpec, coloringRuleChain: v })}
            libraryContext={props.libraryContext}
          />

          <FormLabel
            content="Pause Trigger"
            help={(
              <div>
                The consumer will automatically pause when the specified condition is met.
                It useful when you want to find some specific messages in large topics.
              </div>
            )}
          />
          <div>TODO</div>
        </div>

        {itemSpec.targets.map((topic, i) => {
          return (
            <div
              key={topic.type === 'reference' ? topic.ref : topic.val.metadata.id}
              className={s.TargetColumn}
            >
              <SessionTopicInput
                value={topic}
                onChange={(v) => {
                  const newTargets = [...itemSpec.targets];
                  newTargets[i] = v;
                  onSpecChange({ ...itemSpec, targets: newTargets });
                }}
                libraryContext={props.libraryContext}
              />
              <div className={s.DeleteTargetButton}>
                <DeleteButton
                  title='Remove this Consumer Session Target'
                  onClick={() => {
                    const newTargets = [...itemSpec.targets];
                    newTargets.splice(i, 1);
                    onSpecChange({ ...itemSpec, targets: newTargets });
                  }}
                  isHideText
                />
              </div>
            </div>
          );
        })}

        <div className={s.LastColumn}>
          <AddButton
            text='Add Target'
            onClick={() => {
              const newTarget = createNewTarget();
              const newTargets = itemSpec.targets.concat([newTarget]);
              onSpecChange({ ...itemSpec, targets: newTargets });

              setTimeout(() => {
                columnsRef.current?.scrollTo({ left: columnsRef.current.scrollWidth, behavior: 'smooth' });
              }, 100);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default SessionConfiguration;
