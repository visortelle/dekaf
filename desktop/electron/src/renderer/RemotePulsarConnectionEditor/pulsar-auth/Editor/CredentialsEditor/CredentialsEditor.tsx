import React from 'react';
import s from './CredentialsEditor.module.css'
import OAuth2 from '../methods/OAuth2/OAuth2';
import Jwt from '../methods/Jwt/Jwt';
import Select from '../../../../ui/Select/Select';
import { Credentials, CredentialsType } from '../../domain';
import FormItem from '../../../../ui/FormItem/FormItem';
import FormLabel from '../../../../ui/FormLabel/FormLabel';
import AuthParamsString from '../methods/AuthParamsString/AuthParamsString';

export type CredentialsEditorProps = {
  value: Credentials,
  onChange: (v: Credentials) => void
};

const CredentialsEditor: React.FC<CredentialsEditorProps> = (props) => {
  return (
    <div className={s.CredentialsEditor}>
      <FormItem>
        <FormLabel content='Type' isRequired />
        <Select<CredentialsType>
          list={[
            { type: 'item', title: 'Params String', value: 'authParamsString' },
            { type: 'item', title: 'OAuth2', value: 'oauth2' },
            { type: 'item', title: 'JWT', value: 'jwt' },
          ]}
          value={props.value.type}
          onChange={(type) => {
            switch (type) {
              case 'empty':
                props.onChange({ type: 'empty' });
                break;
              case 'oauth2':
                props.onChange({ type: 'oauth2', issuerUrl: '', privateKey: '', audience: '', scope: '' });
                break;
              case 'jwt':
                props.onChange({ type: 'jwt', token: '' });
                break;
              case 'authParamsString':
                props.onChange({ type: 'authParamsString', authPluginClassName: '', authParams: '' });
                break;
            }
          }}
        />
      </FormItem>

      <div>
        {props.value.type === 'oauth2' && (
          <OAuth2
            value={props.value}
            onChange={props.onChange}
          />
        )}
        {props.value.type === 'jwt' && (
          <Jwt
            value={props.value}
            onChange={props.onChange}
          />
        )}
        {props.value.type === 'authParamsString' && (
          <AuthParamsString
            value={props.value}
            onChange={props.onChange}
          />
        )}
      </div>
    </div>
  );
}

export default CredentialsEditor;
