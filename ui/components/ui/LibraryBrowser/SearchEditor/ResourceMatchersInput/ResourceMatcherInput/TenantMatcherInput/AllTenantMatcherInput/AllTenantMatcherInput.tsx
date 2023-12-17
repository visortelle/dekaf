import React from 'react';
import s from './AllTenantMatcherInput.module.css'
import FormItem from '../../../../../../ConfigurationTable/FormItem/FormItem';
import { AllTenantMatcher } from '../../../../../model/resource-matchers';

export type AllTenantMatcherInputProps = {
  value: AllTenantMatcher;
  onChange: (value: AllTenantMatcher) => void;
  isReadOnly?: boolean;
};

const RegexTenantMatcherInput: React.FC<AllTenantMatcherInputProps> = (props) => {
  return (
    <div className={s.RegexTenantMatcherInput}>
      <FormItem size='small'>
        <></>
      </FormItem>
    </div>
  );
}

export default RegexTenantMatcherInput;
