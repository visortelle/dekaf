import React from 'react';
import SmallButton, { SmallButtonProps } from '../SmallButton/SmallButton';
import deleteIcon from './delete.svg';
import deleteBorderlessIcon from './delete-borderless.svg';

export type DeleteButtonProps = SmallButtonProps & {
  appearance?: SmallButtonProps["appearance"],
  itemName?: string,
  isHideText?: boolean
};

const DeleteButton: React.FC<DeleteButtonProps> = (props) => {
  const isBorderless = props.appearance === "borderless" || props.appearance === "borderless-semitransparent";

  return (
    <SmallButton
      svgIcon={isBorderless ? deleteBorderlessIcon : deleteIcon}
      text={props.isHideText ? undefined : `Delete${props.itemName ? ' ' + props.itemName : ''}`}
      type={isBorderless ? "regular" : "danger"}
      {...props}
    />
  );
}

export default DeleteButton;
