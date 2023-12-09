import React from 'react';
import Input from '../Input';
import matchCaseIcon from './match-case.svg';

export type StringFilterInputProps = {
  value: string,
  onChange: (v: string) => void,
  isMatchCase: boolean,
  onIsMatchCaseChange: (v: boolean) => void
};

const StringFilterInput: React.FC<StringFilterInputProps> = (props) => {
  return (
    <Input
      value={props.value}
      onChange={props.onChange}
      addons={[{
        id: '1ddd4ec6-2ae3-427d-b1ec-9c02afca8c07',
        isEnabled: props.isMatchCase,
        onClick: () => {
          console.log(!props.isMatchCase);
          props.onIsMatchCaseChange(!props.isMatchCase);
        },
        iconSvg: matchCaseIcon,
        help: "Match case"
      }]}
    />
  );
}

export default StringFilterInput;
