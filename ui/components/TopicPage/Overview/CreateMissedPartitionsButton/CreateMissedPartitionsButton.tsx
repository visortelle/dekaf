import React from 'react';
import s from './CreateMissedPartitionsButton.module.css'
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../app/contexts/Notifications';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import { mutate } from 'swr';
import { swrKeys } from '../../../swrKeys';
import SmallButton from '../../../ui/SmallButton/SmallButton';
import createMissedPartitionsIcon from './create-missed-partitions.svg';
import { pulsarResourceFromFqn } from '../../../pulsar/pulsar-resources';

export type CreateMissedPartitionsButtonProps = {
  topicFqn: string
};

const CreateMissedPartitionsButton: React.FC<CreateMissedPartitionsButtonProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const { topicServiceClient } = GrpcClient.useContext();

  const createMissedPartitions = async () => {
    const req = new pb.CreateMissedPartitionsRequest();
    req.setTopicFqn(props.topicFqn);

    const res = await topicServiceClient.createMissedPartitions(req, null)
      .catch(err => notifyError(`Unable to create missed partitions: ${err}`));

    if (res === undefined) {
      return;
    }

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to create missed partitions: ${res.getStatus()?.getMessage()}`);
      return;
    }

    const topicResource = pulsarResourceFromFqn(props.topicFqn);
    if (topicResource.type !== 'topic') {
      return;
    }

    mutate(swrKeys.pulsar.customApi.metrics.topicsStats._([props.topicFqn]));
    mutate(swrKeys.pulsar.customApi.metrics.topicsInternalStats._([props.topicFqn]));
    mutate(swrKeys.pulsar.customApi.metrics.isPartitionedTopic._(props.topicFqn));
    mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.partitionedTopics._({ tenant: topicResource.tenant, namespace: topicResource.namespace }));
    mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPartitionedTopics._({ tenant: topicResource.tenant, namespace: topicResource.namespace }));
  }

  return (
    <SmallButton
      type='regular'
      onClick={createMissedPartitions}
      text='Create missed partitions'
      svgIcon={createMissedPartitionsIcon}
      className={s.CreateMissedPartitionsButton}
    />
  );
}

export default CreateMissedPartitionsButton;
