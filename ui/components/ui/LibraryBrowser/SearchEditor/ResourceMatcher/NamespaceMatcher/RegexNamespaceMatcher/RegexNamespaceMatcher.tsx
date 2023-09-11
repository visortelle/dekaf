import React from 'react';
import s from './RegexNamespaceMatcher.module.css'
import Input from '../../../../../Input/Input';
import TenantMatcher, { TenantMatcherValue } from '../../TenantMatcher/TenantMatcher';
import FormLabel from '../../../../../ConfigurationTable/FormLabel/FormLabel';
import FormItem from '../../../../../ConfigurationTable/FormItem/FormItem';

export type RegexNamespaceMatcherValue = {
  type: 'regex-namespace-matcher',
  tenant: TenantMatcherValue;
  namespaceRegex: string;
};

export type RegexNamespaceMatcherProps = {
  value: RegexNamespaceMatcherValue;
  onChange: (value: RegexNamespaceMatcherValue) => void;
};

const RegexNamespaceMatcher: React.FC<RegexNamespaceMatcherProps> = (props) => {
  return (
    <div className={s.RegexNamespaceMatcher}>
      <FormItem>
        <FormLabel content="Namespace Name Regex" />
        <Input
          value={props.value.namespaceRegex}
          onChange={(v) => props.onChange({ ...props.value, namespaceRegex: v })}
          placeholder='.*'
        />
      </FormItem>
      <FormItem>
        <TenantMatcher value={props.value.tenant} onChange={(v) => props.onChange({ ...props.value, tenant: v })} />
      </FormItem>
    </div>
  );
}

export default RegexNamespaceMatcher;
