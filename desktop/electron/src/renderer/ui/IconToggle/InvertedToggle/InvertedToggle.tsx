import React from 'react';
import IconToggle from '../IconToggle';
import invertedIcon from './inverted.svg';

export type InvertedToggleProps = {
  value: boolean,
  onChange: (v: boolean) => void,
  helpOverride?: React.ReactElement | string,
  isReadOnly?: boolean
};

const InvertedToggle: React.FC<InvertedToggleProps> = (props) => {
  return (
    <IconToggle<boolean>
      items={[
        {
          type: "item",
          value: false,
          help: props.helpOverride ? props.helpOverride : "Not inverted",
          iconSvg: invertedIcon,
          foregroundColor: 'var(--background-color)',
          backgroundColor: '#aaa'
        },
        {
          type: "item",
          value: true,
          help: props.helpOverride ? props.helpOverride : "Inverted",
          iconSvg: invertedIcon,
          foregroundColor: '#fff',
          backgroundColor: 'var(--accent-color-red)'
        },
      ]}
      value={props.value}
      onChange={props.onChange}
      isReadOnly={props.isReadOnly}
    />
  );
}

export default InvertedToggle;
