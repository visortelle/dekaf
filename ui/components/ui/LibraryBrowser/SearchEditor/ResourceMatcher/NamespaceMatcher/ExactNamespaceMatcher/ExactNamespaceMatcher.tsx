import React from 'react';
import s from './ExactNamespaceMatcher.module.css'
import Input from '../../../../../Input/Input';
import TenantMatcher, { TenantMatcherValue } from '../../TenantMatcher/TenantMatcher';
import FormItem from '../../../../../ConfigurationTable/FormItem/FormItem';
import { Form } from 'react-router-dom';
import FormLabel from '../../../../../ConfigurationTable/FormLabel/FormLabel';

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
      <FormItem>
        <FormLabel content="Namespace Name" />
        <Input value={props.value.namespace} onChange={(v) => props.onChange({ ...props.value, namespace: v })} />
      </FormItem>
      <FormItem>
        <TenantMatcher value={props.value.tenant} onChange={(v) => props.onChange({ ...props.value, tenant: v })} />
      </FormItem>
    </div>
  );
}

export default ExactNamespaceMatcher;
