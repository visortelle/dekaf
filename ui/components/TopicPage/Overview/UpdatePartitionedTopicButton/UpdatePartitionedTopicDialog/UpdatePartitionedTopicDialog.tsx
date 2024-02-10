import React, { useState } from 'react';
import s from './UpdatePartitionedTopicDialog.module.css'
import Button from '../../../../ui/Button/Button';
import * as GrpcClient from '../../../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../../app/contexts/Notifications';
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import FormItem from '../../../../ui/ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../ui/ConfigurationTable/FormLabel/FormLabel';
import Input from '../../../../ui/Input/Input';
import Checkbox from '../../../../ui/Checkbox/Checkbox';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import { mutate } from 'swr';
import { swrKeys } from '../../../../swrKeys';

export type UpdatePartitionedTopicDialogProps = {
  topicFqn: string,
  currentNumPartitions: number,
  onCancel: () => void,
  onSuccess: () => void
};

const UpdatePartitionedTopicDialog: React.FC<UpdatePartitionedTopicDialogProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const { topicServiceClient } = GrpcClient.useContext();
  const [numPartitions, setNumPartitions] = useState(props.currentNumPartitions);
  const [isUpdateLocalTopicOnly, setIsUpdateLocalTopicOnly] = useState(false);
  const [isForce, setIsForce] = useState(false);

  const confirm = async () => {
    const req = new pb.UpdatePartitionedTopicRequest();
    req.setTopicFqn(props.topicFqn);
    req.setNumPartitions(numPartitions);
    req.setUpdateLocalTopicOnly(isUpdateLocalTopicOnly);
    req.setForce(isForce);

    const res = await topicServiceClient.updatePartitionedTopic(req, null)
      .catch(err => notifyError(`Unable to update partitioned topic: ${err}`));

    if (res === undefined) {
      return;
    }

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to update partitioned topic: ${res.getStatus()?.getMessage()}`);
      return;
    }

    mutate(swrKeys.pulsar.customApi.metrics.topicsStats._([props.topicFqn]));
    mutate(swrKeys.pulsar.customApi.metrics.topicsInternalStats._([props.topicFqn]));
    mutate(swrKeys.pulsar.customApi.metrics.isPartitionedTopic._(props.topicFqn));

    props.onSuccess();
  }

  return (
    <div className={s.UpdatePartitionedTopicDialog}>
      <div className={s.Content}>
        <FormItem>
          <FormLabel content="Number of partitions" help="Number of new partitions must be greater than existing number of partitions. Decrementing number of partitions requires deletion of topic which is not supported." />
          <div style={{ maxWidth: '120rem' }}>
            <Input
              value={String(numPartitions)}
              onChange={v => setNumPartitions(Number(v))}
              inputProps={{ type: 'number' }}
            />
          </div>
        </FormItem>

        <FormItem>
          <FormLabel content="Update local topic only" help="Used by broker for global topic with multiple replicated clusters." />
          <div>
            <Checkbox
              checked={isUpdateLocalTopicOnly}
              onChange={setIsUpdateLocalTopicOnly}
            />
          </div>
        </FormItem>

        <FormItem>
          <FormLabel content="Force" help="Update forcefully without validating existing partitioned topic." />
          <div>
            <Checkbox
              checked={isForce}
              onChange={setIsForce}
            />
          </div>
        </FormItem>
      </div>
      <div className={s.Footer}>
        <Button
          type='regular'
          text='Cancel'
          onClick={props.onCancel}
        />

        <Button
          type='primary'
          text='Confirm'
          onClick={confirm}
        />
      </div>
    </div>
  );
}

export default UpdatePartitionedTopicDialog;
