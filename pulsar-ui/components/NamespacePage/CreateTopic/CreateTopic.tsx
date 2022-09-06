import React from 'react';
import { CreateNonPartitionedTopicRequest, CreatePartitionedTopicRequest } from '../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import ConfigurationTable from '../../ui/ConfigurationTable/ConfigurationTable';
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import Button from '../../ui/Button/Button';
import Input from '../../ui/Input/Input';
import Select from '../../ui/Select/Select';
import s from './CreateTopic.module.css'
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import { mutate } from 'swr';
import { swrKeys } from '../../swrKeys';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../routes';
import { H1 } from '../../ui/H/H';

export type CreateTopicProps = {
  tenant: string;
  namespace: string;
};

type TopicPersistency = 'non-persistent' | 'persistent';
type TopicPartitioning = 'partitioned' | 'non-partitioned';

const CreateTopic: React.FC<CreateTopicProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const { topicServiceClient } = PulsarGrpcClient.useContext();
  const navigate = useNavigate();

  const [topicName, setTopicName] = React.useState('');
  const [topicPersistency, setTopicPersistency] = React.useState<TopicPersistency>('persistent');
  const [topicPartitioning, setTopicPartitioning] = React.useState<TopicPartitioning>('non-partitioned');
  const [numPartitions, setNumPartitions] = React.useState(2);

  const topicNameInput = <Input value={topicName} onChange={setTopicName} />
  const topicPersistencyInput = (
    <Select<TopicPersistency>
      onChange={setTopicPersistency}
      value={topicPersistency}
      list={[
        { type: 'item', value: 'persistent', title: 'Persistent' },
        { type: 'item', value: 'non-persistent', title: 'Non-persistent' },
      ]}
    />
  );

  const topicPartitioningInput = (
    <Select<TopicPartitioning>
      onChange={setTopicPartitioning}
      value={topicPartitioning}
      list={[
        { type: 'item', value: 'partitioned', title: 'Partitioned' },
        { type: 'item', value: 'non-partitioned', title: 'Non-partitioned' },
      ]}
    />
  );

  const numPartitionsInput = <Input type='number' value={numPartitions.toString()} onChange={v => setNumPartitions(parseInt(v))} />

  const postCreateTopic = () => {
    mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics._({ tenant: props.tenant, namespace: props.namespace }));
    mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics._({ tenant: props.tenant, namespace: props.namespace }));
    navigate(routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.messages._.get({ tenant: props.tenant, namespace: props.namespace, topicType: topicPersistency, topic: topicName }));
  }

  const createPartitionedTopic = async () => {
    const req = new CreatePartitionedTopicRequest();
    req.setTopic(`${topicPersistency}://${props.tenant}/${props.namespace}/${topicName}`);
    req.setNumPartitions(numPartitions);

    const res = await topicServiceClient.createPartitionedTopic(req, null).catch(err => notifyError(`Unable to create partitioned topic: ${err.message}`));
    if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to create partitioned topic: ${res.getStatus()?.getMessage()}`);
      return;
    }

    postCreateTopic();
  }

  const createNonPartitionedTopic = async () => {
    const req = new CreateNonPartitionedTopicRequest();
    req.setTopic(`${topicPersistency}://${props.tenant}/${props.namespace}/${topicName}`);

    const res = await topicServiceClient.createNonPartitionedTopic(req, null).catch(err => notifyError(`Unable to create non-partitioned topic: ${err.message}`));
    if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to create non-partitioned topic: ${res.getStatus()?.getMessage()}`);
      return;
    }

    postCreateTopic();
  }

  const isFormValid = topicName.length > 0;

  return (
    <form className={s.CreateTopic} onSubmit={e => e.preventDefault()}>
      <div className={s.Title}>
        <H1>Create topic</H1>
      </div>

      <ConfigurationTable
        fields={[
          {
            id: "topicName",
            title: "Topic name",
            description: <span>Each topic has a name, unique for a specific namespace. You may have a persistent topic with the name ABC and a non-persistent topic with the same name in the same namespace simultaneously.</span>,
            input: topicNameInput,
            isRequired: true,
          },
          {
            id: "persistency",
            title: "Persistency",
            description: (
              <span>
                With <strong>persistent </strong>topics, all messages are durably persisted on disks (if the broker is not standalone, messages are durably persisted on multiple disks), whereas data for <strong>non-persistent</strong> topics is not persisted to storage disks.
              </span>
            ),
            input: topicPersistencyInput,
          },
          {
            id: "partitioning",
            title: "Partitioning",
            description: (
              <span>
                By default, Pulsar topics are served by a single broker. Using only a single broker limits a topic&apos;s maximum throughput. <strong>Partitioned </strong> topics are a special type of topic that can span multiple brokers and thus allow for much higher throughput.
              </span>
            ),
            input: topicPartitioningInput,
          },
          ...topicPartitioning === 'partitioned' ? [
            {
              id: "numPartitions",
              title: "Partitions count",
              description: <span></span>,
              input: numPartitionsInput,
            }
          ] : []
        ]}
      />

      <Button
        type='primary'
        onClick={() => {
          switch (topicPartitioning) {
            case 'partitioned': createPartitionedTopic(); break;
            case 'non-partitioned': createNonPartitionedTopic(); break;
          }
        }}
        text='Create topic'
        disabled={!isFormValid}
        buttonProps={{
          type: 'submit'
        }}
      />
    </form>
  );
}

export default CreateTopic;
