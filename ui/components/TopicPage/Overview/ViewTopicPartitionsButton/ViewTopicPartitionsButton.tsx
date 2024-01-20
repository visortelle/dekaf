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
    <div className={s.ViewTopicPartitionsButton}>
      <ActionButton
        action={{ type: 'predefined', action: 'view' }}
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
                />
              </div>
            ),
            styleMode: 'no-content-padding'
          });
        }}
      />
    </div>
  );
}

export default ViewTopicPartitionsButton;
