import React from 'react';
import s from './Jwt.module.css'
import Input from '../../../../../../Input/Input';
import { JwtConfig } from '../../../types';
import FormItem from '../../../../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../../ConfigurationTable/FormLabel/FormLabel';

export type JwtProps = {
  value: JwtConfig;
  onChange: (config: JwtConfig) => void;
};

const Jwt: React.FC<JwtProps> = (props) => {
  console.log('jwt')
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

