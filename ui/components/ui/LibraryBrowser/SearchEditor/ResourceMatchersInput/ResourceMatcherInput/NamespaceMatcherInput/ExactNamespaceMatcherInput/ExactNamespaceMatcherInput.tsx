import React from 'react';
import s from './ExactNamespaceMatcherInput.module.css'
import Input from '../../../../../../Input/Input';
import TenantMatcherInput from '../../TenantMatcherInput/TenantMatcherInput';
import FormItem from '../../../../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../../ConfigurationTable/FormLabel/FormLabel';
import { ExactNamespaceMatcher } from '../../../../../model/resource-matchers';

export type ExactNamespaceMatcherInputProps = {
  value: ExactNamespaceMatcher;
  onChange: (value: ExactNamespaceMatcher) => void;
};

const ExactNamespaceMatcherInput: React.FC<ExactNamespaceMatcherInputProps> = (props) => {
  return (
    <div className={s.ExactNamespaceMatcher}>
      <FormItem>
        <FormLabel content="Namespace Name" />
        <Input value={props.value.namespace} onChange={(v) => props.onChange({ ...props.value, namespace: v })} />
      </FormItem>
      <FormItem>
        <TenantMatcherInput value={props.value.tenant} onChange={(v) => props.onChange({ ...props.value, tenant: v })} />
      </FormItem>
    </div>
  );
}

export default ExactNamespaceMatcherInput;
