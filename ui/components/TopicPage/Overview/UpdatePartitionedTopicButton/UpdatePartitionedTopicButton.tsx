import React from 'react';
import s from './UpdatePartitionedTopicButton.module.css'
import UpdatePartitionedTopicDialog from './UpdatePartitionedTopicDialog/UpdatePartitionedTopicDialog';
import * as Modals from '../../../app/contexts/Modals/Modals';
import ActionButton from '../../../ui/ActionButton/ActionButton';

export type UpdatePartitionedTopicButtonProps = {
  topicFqn: string,
  currentNumPartitions: number,
};

const UpdatePartitionedTopicButton: React.FC<UpdatePartitionedTopicButtonProps> = (props) => {
  const modals = Modals.useContext();
  return (
    <ActionButton
      action={{ type: 'predefined', action: 'edit' }}
      title="Update partitions count"
      buttonProps={{ text: 'Update', className: s.UpdatePartitionedTopicButton }}
      onClick={() => {
        modals.push({
          id: 'update-partitions-count',
          title: 'Update Partitions Count',
          content: (
            <UpdatePartitionedTopicDialog {...props} onCancel={modals.pop} onSuccess={modals.pop} />
          ),
          styleMode: 'no-content-padding'
        });
      }}
    />
  );
}

export default UpdatePartitionedTopicButton;
