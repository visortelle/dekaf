import React from 'react';
import s from './ExactTenantMatcherInput.module.css'
import Input from '../../../../../../Input/Input';
import FormItem from '../../../../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../../ConfigurationTable/FormLabel/FormLabel';
import { ExactTenantMatcher } from '../../../../../model/resource-matchers';

export type ExactTenantMatcherInputProps = {
  value: ExactTenantMatcher;
  onChange: (value: ExactTenantMatcher) => void;
  isReadOnly?: boolean;
};

const ExactTenantMatcherInput: React.FC<ExactTenantMatcherInputProps> = (props) => {
  return (
    <div className={s.ExactTenantMatcherInput}>
      <FormItem size='small'>
        <Input
          size='small'
          value={props.value.tenant}
          onChange={(v) => props.onChange({ ...props.value, tenant: v })}
          isReadOnly={props.isReadOnly}
        />
      </FormItem>
    </div>
  );
}

export default ExactTenantMatcherInput;
