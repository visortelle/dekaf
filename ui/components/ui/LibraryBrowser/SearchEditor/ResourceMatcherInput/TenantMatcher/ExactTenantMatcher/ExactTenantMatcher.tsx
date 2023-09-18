import React from 'react';
import s from './ExactTenantMatcher.module.css'
import Input from '../../../../../Input/Input';
import FormItem from '../../../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../ConfigurationTable/FormLabel/FormLabel';
import { ExactTenantMatcher } from '../../../../types';

export type ExactTenantMatcherProps = {
  value: ExactTenantMatcher;
  onChange: (value: ExactTenantMatcher) => void;
};

const ExactTenantMatcher: React.FC<ExactTenantMatcherProps> = (props) => {
  return (
    <div className={s.ExactTenantMatcher}>
      <FormItem>
        <FormLabel content="Tenant Name" />
        <Input value={props.value.tenant} onChange={(v) => props.onChange({ ...props.value, tenant: v })} />
      </FormItem>
    </div>
  );
}

export default ExactTenantMatcher;
