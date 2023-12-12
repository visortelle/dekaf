import React from 'react';
import s from './RegexNamespaceMatcherInput.module.css'
import Input from '../../../../../../Input/Input';
import TenantMatcherInput from '../../TenantMatcherInput/TenantMatcherInput';
import FormItem from '../../../../../../ConfigurationTable/FormItem/FormItem';
import { RegexNamespaceMatcher } from '../../../../../model/resource-matchers';

export type RegexNamespaceMatcherInputProps = {
  value: RegexNamespaceMatcher;
  onChange: (value: RegexNamespaceMatcher) => void;
};

const RegexNamespaceMatcherInput: React.FC<RegexNamespaceMatcherInputProps> = (props) => {
  return (
    <div className={s.RegexNamespaceMatcherInput}>
      <FormItem size='small'>
        <Input
          size='small'
          value={props.value.namespaceRegex}
          onChange={(v) => props.onChange({ ...props.value, namespaceRegex: v })}
          placeholder='Use .* regex to match all namespaces'
        />
      </FormItem>
      <FormItem size='small'>
        <TenantMatcherInput value={props.value.tenant} onChange={(v) => props.onChange({ ...props.value, tenant: v })} />
      </FormItem>
    </div>
  );
}

export default RegexNamespaceMatcherInput;
