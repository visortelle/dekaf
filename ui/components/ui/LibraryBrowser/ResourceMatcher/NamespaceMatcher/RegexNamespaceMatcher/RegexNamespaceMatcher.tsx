import React from 'react';
import s from './RegexNamespaceMatcher.module.css'
import Input from '../../../../Input/Input';
import TenantMatcher, { TenantMatcherValue } from '../../TenantMatcher/TenantMatcher';

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
      <TenantMatcher value={props.value.tenant} onChange={(v) => props.onChange({ ...props.value, tenant: v })} />
      <Input value={props.value.namespaceRegex} onChange={(v) => props.onChange({ ...props.value, namespaceRegex: v })} />
    </div>
  );
}

export default RegexNamespaceMatcher;
