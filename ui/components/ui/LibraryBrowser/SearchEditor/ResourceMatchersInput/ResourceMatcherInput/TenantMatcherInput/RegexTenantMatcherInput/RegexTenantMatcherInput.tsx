import React from 'react';
import s from './RegexTenantMatcherInput.module.css'
import Input from '../../../../../../Input/Input';
import FormItem from '../../../../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../../ConfigurationTable/FormLabel/FormLabel';
import { RegexTenantMatcher } from '../../../../../model/resource-matchers';

export type RegexTenantMatcherInputProps = {
  value: RegexTenantMatcher;
  onChange: (value: RegexTenantMatcher) => void;
};

const RegexTenantMatcherInput: React.FC<RegexTenantMatcherInputProps> = (props) => {
  return (
    <div className={s.RegexTenantMatcherInput}>
      <FormItem>
        <FormLabel content="Tenant Name Regex" />
        <Input
          value={props.value.tenantRegex}
          onChange={(v) => props.onChange({ ...props.value, tenantRegex: v })}
          placeholder='Use .* regex to match all tenants'
        />
      </FormItem>
    </div>
  );
}

export default RegexTenantMatcherInput;
