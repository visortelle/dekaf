import React from 'react';
import s from './AllNamespaceMatcherInput.module.css'
import TenantMatcherInput from '../../TenantMatcherInput/TenantMatcherInput';
import FormItem from '../../../../../../ConfigurationTable/FormItem/FormItem';
import { AllNamespaceMatcher } from '../../../../../model/resource-matchers';

export type AllNamespaceMatcherInputProps = {
  value: AllNamespaceMatcher;
  onChange: (value: AllNamespaceMatcher) => void;
  isReadOnly?: boolean;
};

const AllNamespaceMatcherInput: React.FC<AllNamespaceMatcherInputProps> = (props) => {
  return (
    <div className={s.AllNamespaceMatcherInput}>
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

export default AllNamespaceMatcherInput;
