import React from 'react';
import s from './ExactNamespaceMatcherInput.module.css'
import Input from '../../../../../../Input/Input';
import TenantMatcherInput from '../../TenantMatcherInput/TenantMatcherInput';
import FormItem from '../../../../../../ConfigurationTable/FormItem/FormItem';
import { ExactNamespaceMatcher } from '../../../../../model/resource-matchers';

export type ExactNamespaceMatcherInputProps = {
  value: ExactNamespaceMatcher;
  onChange: (value: ExactNamespaceMatcher) => void;
  isReadOnly?: boolean;
};

const ExactNamespaceMatcherInput: React.FC<ExactNamespaceMatcherInputProps> = (props) => {
  return (
    <div className={s.ExactNamespaceMatcher}>
      <FormItem size='small'>
        <Input
          size='small'
          value={props.value.namespace}
          onChange={(v) => props.onChange({ ...props.value, namespace: v })}
          isReadOnly={props.isReadOnly}
        />
      </FormItem>
      <FormItem size='small'>
        <TenantMatcherInput
          value={props.value.tenant}
          onChange={(v) => props.onChange({ ...props.value, tenant: v })}
          isReadOnly={props.isReadOnly}
        />
      </FormItem>
    </div>
  );
}

export default ExactNamespaceMatcherInput;
