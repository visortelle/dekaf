import React from 'react';
import IconToggle from '../IconToggle';
import powerIcon from './power.svg';

export type OnOffToggleProps = {
  value: boolean,
  onChange: (v: boolean) => void,
  isReadOnly?: boolean
};

const OnOffToggle: React.FC<OnOffToggleProps> = (props) => {
  return (
    <IconToggle<boolean>
      items={[
        {
          type: "item",
          value: true,
          help: "Enabled",
          iconSvg: powerIcon,
          foregroundColor: '#fff',
          backgroundColor: 'var(--accent-color-blue)'
        },
        {
          type: "item",
          value: false,
          help: "Disabled",
          iconSvg: powerIcon,
          foregroundColor: 'var(--background-color)',
          backgroundColor: '#aaa'
        },
      ]}
      value={props.value}
      onChange={props.onChange}
      isReadOnly={props.isReadOnly}
    />
  );
}

export default OnOffToggle;
