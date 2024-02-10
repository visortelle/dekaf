import React from 'react';
import s from './ViewTopicPartitionsButton.module.css'
import Topics from '../../../NamespacePage/Topics/Topics';
import * as Modals from '../../../app/contexts/Modals/Modals';
import ActionButton from '../../../ui/ActionButton/ActionButton';
import { PulsarTopicPersistency } from '../../../pulsar/pulsar-resources';

export type ViewTopicPartitionsButtonProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicPersistency: PulsarTopicPersistency;
};

const ViewTopicPartitionsButton: React.FC<ViewTopicPartitionsButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <ActionButton
      action={{ type: 'predefined', action: 'view' }}
      buttonProps={{ className: s.ViewTopicPartitionsButton }}
      title="View topic partitions"
      onClick={() => {
        modals.push({
          id: 'topic-partitions',
          title: `Topic Partitions`,
          content: (
            <div className={s.Topics}>
              <Topics
                tenant={props.tenant}
                namespace={props.namespace}
                defaultFilters={{
                  'topicName': {
                    state: 'active',
                    value: { 'type': 'string', value: `${props.topic}-partition-` }
                  },
                  'persistency': {
                    state: 'active',
                    value: { 'type': 'singleOption', value: 'all' }
                  },
                  'partitioning': {
                    state: 'active',
                    value: { 'type': 'singleOption', value: 'show-partitions' }
                  }
                }}
              />
            </div>
          ),
          styleMode: 'no-content-padding'
        });
      }}
    />
  );
}

export default ViewTopicPartitionsButton;
