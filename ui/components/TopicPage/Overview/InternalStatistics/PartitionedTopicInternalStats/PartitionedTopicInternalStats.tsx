import React from 'react';
import s from './PartitionedTopicInternalStats.module.css'
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import Select from '../../../../ui/Select/Select';
import * as pbUtils from '../../../../../pbUtils/pbUtils';
import PersistentTopicInternalStats from '../PersistentTopicInternalStats/PersistentTopicInternalStats';
import FormLabel from '../../../../ui/ConfigurationTable/FormLabel/FormLabel';

export type PartitionedTopicInternalStatsProps = {
  stats: pb.PartitionedTopicInternalStats;
  tenant: string;
  namespace: string;
  topic: string;
  topicType: "persistent" | "non-persistent";
};

const PartitionedTopicInternalStats: React.FC<PartitionedTopicInternalStatsProps> = (props) => {
  const partitions = pbUtils.mapToObject(props.stats.getPartitionsMap());
  const [selectedPartition, setSelectedPartition] = React.useState<string>(Object.keys(partitions)[0] || '');

  return (
    <div className={s.PartitionedTopicInternalStats}>
      <div className={s.Section}>
        <FormLabel content="Partition" />
        <div className={s.PartitionSelect}>
          <Select<string>
            list={Object.entries(partitions).map(([partitionFqn, _]) => {
              const partitionReMatch = partitionFqn.match(/partition-(\d+)$/);
              const partition = partitionReMatch === null ? partitionFqn : partitionReMatch[1];

              return ({
                type: 'item', value: partitionFqn, title: partition,
              })
            })}
            onChange={setSelectedPartition}
            value={selectedPartition}
          />
        </div>
      </div>

      <div className={s.Section}>
        <PersistentTopicInternalStats
          stats={partitions[selectedPartition]}
          tenant={props.tenant}
          namespace={props.namespace}
          topic={props.topic}
          topicType={props.topicType}
        />
      </div>
    </div>
  );
}

export default PartitionedTopicInternalStats;
