import React, { useEffect, useRef } from 'react';
import s from './ProducerSessionConfigInput.module.css'
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import * as GrpcClient from '../../../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../../app/contexts/Notifications';
import { v4 as uuid } from 'uuid';
import { ManagedProducerSessionConfig, ManagedProducerSessionConfigSpec, ManagedProducerSessionConfigTask, ManagedProducerSessionConfigValOrRef, ManagedProducerTask, ManagedProducerTaskValOrRef } from '../../../LibraryBrowser/model/user-managed-items';
import { useHover } from '../../../../app/hooks/use-hover';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../LibraryBrowser/useManagedItemValue';
import { LibraryContext } from '../../../LibraryBrowser/model/library-context';
import LibraryBrowserPanel, { LibraryBrowserPanelProps } from '../../../LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import ProducerTaskInput from '../../producer-task/ProducerTaskInput/ProducerTaskInput';
import { cloneDeep } from 'lodash';
import AddButton from '../../../AddButton/AddButton';
import { getDefaultManagedItem } from '../../../LibraryBrowser/default-library-items';
import DeleteButton from '../../../DeleteButton/DeleteButton';
import SmallButton from '../../../SmallButton/SmallButton';
import { producerSessionConfigToPb } from '../producer-session-config';
import { producerSessionConfigFromValOrRef } from '../../../LibraryBrowser/model/resolved-items-conversions';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';

export type ProducerSessionConfigInputProps = {
  value: ManagedProducerSessionConfigValOrRef,
  onChange: (v: ManagedProducerSessionConfigValOrRef) => void,
  libraryContext: LibraryContext;
  isReadOnly?: boolean;
  libraryBrowserPanel?: Partial<LibraryBrowserPanelProps>
};

const ProducerSessionConfigInput: React.FC<ProducerSessionConfigInputProps> = (props) => {
  const [hoverRef, isHovered] = useHover();
  const ref = useRef<HTMLDivElement>(null);
  const { producerServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();

  const resolveResult = useManagedItemValue<ManagedProducerSessionConfig>(props.value);

  useEffect(() => {
    if (props.value.val === undefined && resolveResult.type === 'success') {
      props.onChange({ ...props.value, val: resolveResult.value });
    }
  }, [resolveResult]);

  if (resolveResult.type !== 'success') {
    return <UseManagedItemValueSpinner item={props.value} result={resolveResult} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: ManagedProducerSessionConfigSpec) => {
    const newValue: ManagedProducerSessionConfigValOrRef = { ...props.value, val: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedProducerSessionConfigValOrRef = { type: 'value', val: item };
    props.onChange(newValue);
  };

  return (
    <div ref={ref} className={s.ProducerSessionConfigInput}>
      <div ref={hoverRef} className={s.Column}>
        <LibraryBrowserPanel
          itemType='producer-session-config'
          value={item}
          onPick={(item) => props.onChange({
            type: 'value',
            val: item as ManagedProducerSessionConfig
          })}
          onSave={(item) => props.onChange({
            type: 'value',
            val: item as ManagedProducerSessionConfig
          })}
          onChange={(item) => {
            props.onChange({
              ...props.value,
              val: item as ManagedProducerSessionConfig
            });
          }}
          isForceShowButtons={isHovered}
          libraryContext={props.libraryContext}
          managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
          isReadOnly={props.isReadOnly}
          {...props.libraryBrowserPanel}
        />

        <SmallButton
          type='primary'
          text='Run'
          onClick={async () => {
            const createSessionReq = new pb.CreateProducerSessionRequest();

            const sessionId = uuid();
            createSessionReq.setSessionId(sessionId);

            const currentTopic = props.libraryContext.pulsarResource.type === 'topic' ? props.libraryContext.pulsarResource : undefined;
            const currentTopicFqn: string | undefined = currentTopic === undefined ? undefined : `${currentTopic.topicPersistency}://${currentTopic.tenant}/${currentTopic.namespace}/${currentTopic.topic}`;

            const conf = producerSessionConfigFromValOrRef(props.value, currentTopicFqn);
            const confPb = producerSessionConfigToPb(conf);

            createSessionReq.setSessionConfig(confPb);

            const createSessionRes = await producerServiceClient.createProducerSession(createSessionReq, null).catch((err) => {
              notifyError('Failed to create producer session', err);
            });

            if (createSessionRes === undefined) {
              return;
            }

            if (createSessionRes.getStatus()?.getCode() !== Code.OK) {
              notifyError('Failed to create producer session', createSessionRes.getStatus()?.getMessage());
              return;
            }

            const resumeSessionReq = new pb.ResumeProducerSessionRequest();
            resumeSessionReq.setSessionId(sessionId);

            const resumeSessionRes = await producerServiceClient.resumeProducerSession(resumeSessionReq, null).catch((err) => {
              notifyError('Failed to resume producer session', err);
            });

            if (resumeSessionRes === undefined) {
              return;
            }

            if (resumeSessionRes.getStatus()?.getCode() !== Code.OK) {
              notifyError('Failed to resume producer session', resumeSessionRes.getStatus()?.getMessage());
              return;
            }
          }}
        />
      </div>

      {itemSpec.tasks.map((task, i) => {
        const key = task.task.type === 'producer-task' ? task.task.task.val?.metadata.id : i;
        return (
          <div key={key} className={s.Column}>
            <div className={s.TaskIndex}>Task {i + 1}</div>
            <div className={s.DeleteButton}>
              <DeleteButton
                appearance='borderless-semitransparent'
                onClick={() => {
                  const newTasks = itemSpec.tasks.filter((_, j) => j !== i);
                  onSpecChange({ ...itemSpec, tasks: newTasks });
                }}
                isHideText
              />
            </div>

            {task.task.type === 'producer-task' && (
              <div className={s.Task}>
                <ProducerTaskInput
                  value={task.task.task}
                  onChange={(v) => {
                    const newTasks = cloneDeep(itemSpec.tasks);
                    newTasks[i].task.task = v;
                    onSpecChange({ ...itemSpec, tasks: newTasks });
                  }}
                  libraryContext={props.libraryContext}
                  isReadOnly={props.isReadOnly}
                  libraryBrowserPanel={props.libraryBrowserPanel}
                />
              </div>
            )}
          </div>
        );
      })}

      <div className={s.LastColumn}>
        <AddButton
          text='Add Producer Task'
          onClick={() => {
            const newProducerTask: ManagedProducerTaskValOrRef = {
              type: "value",
              val: getDefaultManagedItem("producer-task", props.libraryContext) as ManagedProducerTask
            };

            const newTask: ManagedProducerSessionConfigTask = {
              task: { type: 'producer-task', task: newProducerTask }
            };

            const newTasks = itemSpec.tasks.concat([newTask]);
            onSpecChange({ ...itemSpec, tasks: newTasks });

            setTimeout(() => {
              ref.current?.scrollTo({ left: ref.current.scrollWidth, behavior: 'smooth' });
            }, 100);
          }}
        />
      </div>
    </div>
  );
}

export default ProducerSessionConfigInput;
