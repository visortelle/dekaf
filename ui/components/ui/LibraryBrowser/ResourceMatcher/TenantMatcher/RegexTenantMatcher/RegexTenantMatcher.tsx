import React from 'react';
import s from './RegexTenantMatcher.module.css'
import Input from '../../../../Input/Input';

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
      <Input value={props.value.tenantRegex} onChange={(v) => props.onChange({ tenantRegex: v })} />
    </div>
  );
}

export default RegexTenantMatcher;
