import React from 'react';
import s from './ExactTenantMatcher.module.css'
import Input from '../../../../Input/Input';

export type ExactTenantMatcherValue = {
  type: 'exact-tenant-matcher',
  tenant: string;
};

export type ExactTenantMatcherProps = {
  value: ExactTenantMatcherValue;
  onChange: (value: ExactTenantMatcherValue) => void;
};

const ExactTenantMatcher: React.FC<ExactTenantMatcherProps> = (props) => {
  return (
    <div className={s.ExactTenantMatcher}>
      <Input value={props.value.tenant} onChange={(v) => props.onChange({ tenant: v })} />
    </div>
  );
}

export default ExactTenantMatcher;
