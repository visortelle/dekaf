import React from 'react';
import s from './Jwt.module.css'
import Input from '../../../../../ui/Input/Input';
import { JwtCredentials } from '../../../domain';
import FormItem from '../../../../../ui/ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../ui/ConfigurationTable/FormLabel/FormLabel';

export type JwtProps = {
  value: JwtCredentials;
  onChange: (config: JwtCredentials) => void;
};

const Jwt: React.FC<JwtProps> = (props) => {
  return (
    <div className={s.Jwt}>
      <FormItem>
        <FormLabel content='Token' isRequired />
        <Input
          value={props.value.token}
          onChange={v => props.onChange({ ...props.value, token: v })}
        />
      </FormItem>
    </div>
  );
}

export default Jwt;
