import React from 'react';
import s from './RegexTenantMatcher.module.css'
import Input from '../../../../../Input/Input';
import FormItem from '../../../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../ConfigurationTable/FormLabel/FormLabel';

export type RegexTenantMatcherValue = {
  type: 'regex-tenant-matcher',
  tenantRegex: string;
};

export type RegexTenantMatcherProps = {
  value: RegexTenantMatcherValue;
  onChange: (value: RegexTenantMatcherValue) => void;
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
