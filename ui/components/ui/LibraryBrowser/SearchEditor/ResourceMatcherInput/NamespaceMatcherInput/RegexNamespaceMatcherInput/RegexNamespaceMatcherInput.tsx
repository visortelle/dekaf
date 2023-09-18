import React from 'react';
import s from './RegexNamespaceMatcherInput.module.css'
import Input from '../../../../../Input/Input';
import TenantMatcherInput from '../../TenantMatcherInput/TenantMatcherInput';
import FormLabel from '../../../../../ConfigurationTable/FormLabel/FormLabel';
import FormItem from '../../../../../ConfigurationTable/FormItem/FormItem';
import { RegexNamespaceMatcher } from '../../../../types';

export type RegexNamespaceMatcherInputProps = {
  value: RegexNamespaceMatcher;
  onChange: (value: RegexNamespaceMatcher) => void;
};

const RegexNamespaceMatcherInput: React.FC<RegexNamespaceMatcherInputProps> = (props) => {
  return (
    <div className={s.RegexNamespaceMatcherInput}>
      <FormItem>
        <FormLabel content="Namespace Name Regex" />
        <Input
          value={props.value.namespaceRegex}
          onChange={(v) => props.onChange({ ...props.value, namespaceRegex: v })}
          placeholder='.*'
        />
      </FormItem>
      <FormItem>
        <TenantMatcherInput value={props.value.tenant} onChange={(v) => props.onChange({ ...props.value, tenant: v })} />
      </FormItem>
    </div>
  );
}

export default RegexNamespaceMatcherInput;
