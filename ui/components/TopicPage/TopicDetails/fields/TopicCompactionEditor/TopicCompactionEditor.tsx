import React from 'react';
import s from './TopicCompactionEditor.module.css'
import { PulsarTopicPersistency } from '../../../../pulsar/pulsar-resources';
import { PartitioningWithActivePartitions } from '../../../TopicPage';
import TopicCompactionStatus from './TopicCompactionStatus/TopicCompactionStatus';
import A from '../../../../ui/A/A';

export type TopicCompactionEditorProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicPersistency: PulsarTopicPersistency;
  partitioning: PartitioningWithActivePartitions;
  isHideDescription?: boolean
};

const TopicCompactionEditor: React.FC<TopicCompactionEditorProps> = (props) => {
  const topicFqn = `${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`;

  return (
    <div className={s.TopicCompactionEditor}>
      {!props.isHideDescription && (<div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12rem', maxWidth: '480rem' }}>
          Pulsar's topic compaction feature enables you to create compacted topics in which older, "obscured" entries are pruned from the topic, allowing for faster reads through the topic's history (which messages are deemed obscured/outdated/irrelevant will depend on your use case).
        </div>
        <A href="https://pulsar.apache.org/docs/next/cookbooks-compaction/" isExternalLink>Learn more</A>
      </div>
      )}

      <TopicCompactionStatus topicFqn={topicFqn} />
    </div>
  );
}

export default TopicCompactionEditor;
