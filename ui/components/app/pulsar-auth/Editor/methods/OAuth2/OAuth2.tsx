import React from 'react';
import s from './OAuth2.module.css'
import { OAuth2Credentials } from '../../../domain';
import Input from '../../../../../ui/Input/Input';
import FormItem from '../../../../../ui/ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../ui/ConfigurationTable/FormLabel/FormLabel';

export type OAuth2Props = {
  value: OAuth2Credentials
  onChange: (config: OAuth2Credentials) => void,
};

const OAuth2: React.FC<OAuth2Props> = (props) => {
  return (
    <div className={s.OAuth2}>
      <FormItem>
        <FormLabel content='Issuer URL' isRequired />
        <Input
          onChange={() => props.onChange({ ...props.value, issuerUrl: '' })}
          value={props.value.issuerUrl}
        />
      </FormItem>

      <FormItem>
        <FormLabel content='Private Key' isRequired />
        <Input
          onChange={() => props.onChange({ ...props.value, privateKey: '' })}
          value={props.value.privateKey}
        />
      </FormItem>

      <FormItem>
        <FormLabel content='Audience' />
        <Input
          onChange={() => props.onChange({ ...props.value, audience: '' })}
          value={props.value.audience}
        />
      </FormItem>

      <FormItem>
        <FormLabel content='Scope' />
        <Input
          onChange={() => props.onChange({ ...props.value, scope: '' })}
          value={props.value.scope}
        />
      </FormItem>
    </div>
  );
}

export default OAuth2;
