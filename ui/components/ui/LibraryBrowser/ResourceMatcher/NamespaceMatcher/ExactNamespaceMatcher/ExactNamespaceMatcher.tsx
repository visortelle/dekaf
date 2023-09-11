import React from 'react';
import s from './ExactNamespaceMatcher.module.css'
import Input from '../../../../Input/Input';
import TenantMatcher, { TenantMatcherValue } from '../../TenantMatcher/TenantMatcher';

export type ExactNamespaceMatcherValue = {
  type: 'exact-namespace-matcher',
  tenant: TenantMatcherValue;
  namespace: string;
};

export type ExactNamespaceMatcherProps = {
  value: ExactNamespaceMatcherValue;
  onChange: (value: ExactNamespaceMatcherValue) => void;
};

const ExactNamespaceMatcher: React.FC<ExactNamespaceMatcherProps> = (props) => {
  return (
    <div className={s.ExactNamespaceMatcher}>
      <TenantMatcher value={props.value.tenant} onChange={(v) => props.onChange({ ...props.value, tenant: v })} />
      <Input value={props.value.namespace} onChange={(v) => props.onChange({ ...props.value, namespace: v })} />
    </div>
  );
}

export default ExactNamespaceMatcher;
