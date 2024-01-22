import React from 'react';
import s from './TopicCompactionEditor.module.css'
import { PulsarTopicPersistency } from '../../../../pulsar/pulsar-resources';
import { PartitioningWithActivePartitions } from '../../../TopicPage';
import TopicCompactionStatus from './TopicCompactionStatus/TopicCompactionStatus';

export type TopicCompactionEditorProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicPersistency: PulsarTopicPersistency;
  partitioning: PartitioningWithActivePartitions;
};

const TopicCompactionEditor: React.FC<TopicCompactionEditorProps> = (props) => {
  const topicFqn = `${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`;

  return (
    <div className={s.TopicCompactionEditor}>
      <TopicCompactionStatus
        topicFqn={topicFqn}
      />
    </div>
  );
}

export default TopicCompactionEditor;
