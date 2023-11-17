import React from 'react';
import SmallButton, { SmallButtonProps } from '../SmallButton/SmallButton';
import deleteIcon from './delete.svg';

export type DeleteButtonProps = SmallButtonProps & {
  itemName?: string;
  appearance?: 'default' | 'compact'
};

const DeleteButton: React.FC<DeleteButtonProps> = (props) => {
  return (
    <SmallButton
      svgIcon={deleteIcon}
      text={props.appearance === 'compact' ? undefined : `Delete${props.itemName ? ' ' + props.itemName : ''}`}
      type="danger"
      {...props}
    />
  );
}

export default DeleteButton;
