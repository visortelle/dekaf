import React from 'react';
import s from './AuthParamsString.module.css'
import Input from '../../../../../ui/Input/Input';
import { AuthParamsStringCredentials } from '../../../domain';
import FormItem from '../../../../../ui/ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../ui/ConfigurationTable/FormLabel/FormLabel';

export type AuthParamsStringProps = {
  value: AuthParamsStringCredentials;
  onChange: (config: AuthParamsStringCredentials) => void;
};

const AuthParamsString: React.FC<AuthParamsStringProps> = (props) => {
  return (
    <div className={s.AuthParamsString}>
      <FormItem>
        <FormLabel
          content='Auth Plugin Class Name'
          isRequired
          help={(
            <p>
              Name of the Authentication-Plugin you want to use.
              <br />
              <br />
              Example:
              <br />
              <code>org.apache.pulsar.client.impl.auth.AuthenticationBasic</code>
            </p>
          )}
        />
        <Input
          value={props.value.authPluginClassName}
          onChange={v => props.onChange({ ...props.value, authPluginClassName: v })}
        />
      </FormItem>

      <FormItem>
        <FormLabel
          content='Auth Params'
          isRequired
          help={(
            <p>
              A string which represents parameters for the Authentication-Plugin, e.g., <code>key1:val1,key2:val2</code>
              <br />
              <br />
              Example:
              <br />
              <code>userId:john,password:very-secret-password</code>
            </p>
          )}
        />
        <Input
          value={props.value.authParams}
          onChange={v => props.onChange({ ...props.value, authParams: v })}
        />
      </FormItem>
    </div>
  );
}

export default AuthParamsString;
