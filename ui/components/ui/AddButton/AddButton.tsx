import React from 'react';
import SmallButton, { SmallButtonProps } from '../SmallButton/SmallButton';
import addIcon from './add.svg';

export type AddButtonProps = SmallButtonProps & {
  itemName?: string;
};

const AddButton: React.FC<AddButtonProps> = (props) => {
  return (
    <SmallButton
      svgIcon={addIcon}
      text={`Add${props.itemName ? ' ' + props.itemName : ''}`}
      type="primary"
      {...props}
    />
  );
}

export default AddButton;
