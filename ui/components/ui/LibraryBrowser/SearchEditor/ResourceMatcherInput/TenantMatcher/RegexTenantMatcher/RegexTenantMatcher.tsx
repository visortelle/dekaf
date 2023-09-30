import React from 'react';
import s from './RegexTenantMatcher.module.css'
import Input from '../../../../../Input/Input';
import FormItem from '../../../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../ConfigurationTable/FormLabel/FormLabel';
import { RegexTenantMatcher } from '../../../../model/resource-matchers';

export type RegexTenantMatcherProps = {
  value: RegexTenantMatcher;
  onChange: (value: RegexTenantMatcher) => void;
};

const RegexTenantMatcher: React.FC<RegexTenantMatcherProps> = (props) => {
  return (
    <div className={s.RegexTenantMatcher}>
      <FormItem>
        <FormLabel content="Tenant Name Regex" />
        <Input
          value={props.value.tenantRegex}
          onChange={(v) => props.onChange({ type: 'regex-tenant-matcher', tenantRegex: v })}
          placeholder='.*'
        />
      </FormItem>
    </div>
  );
}

export default RegexTenantMatcher;
