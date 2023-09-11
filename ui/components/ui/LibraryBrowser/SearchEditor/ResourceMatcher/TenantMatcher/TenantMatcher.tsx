import React from 'react';
import s from './TenantMatcher.module.css';
import Select from '../../../../Select/Select';
import ExactTenantMatcher, { ExactTenantMatcherValue } from './ExactTenantMatcher/ExactTenantMatcher';
import RegexTenantMatcher, { RegexTenantMatcherValue } from './RegexTenantMatcher/RegexTenantMatcher';
import FormItem from '../../../../ConfigurationTable/FormItem/FormItem';
import ResourceFormLabel from '../ResourceFormLabel/ResourceFormLabel';

export type TenantMatcherValue = {
  type: 'tenant-matcher',
  value: ExactTenantMatcherValue | RegexTenantMatcherValue
};

export type TenantMatcherType = TenantMatcherValue['value']['type'];

export type TenantMatcherProps = {
  value: TenantMatcherValue;
  onChange: (value: TenantMatcherValue) => void;
};

const TenantMatcher: React.FC<TenantMatcherProps> = (props) => {
  return (
    <div className={s.TenantMatcher}>
      <FormItem>
        <ResourceFormLabel type='tenant' />
        <Select<TenantMatcherType>
          value={props.value.value.type}
          onChange={(v) => {
            if (v === 'exact-tenant-matcher') {
              props.onChange({ type: 'tenant-matcher', value: { type: 'exact-tenant-matcher', tenant: '' } })
            } else {
              props.onChange({ type: 'tenant-matcher', value: { type: 'regex-tenant-matcher', tenantRegex: '' } })
            }
          }}
          list={[
            { type: 'item', value: 'exact-tenant-matcher', title: 'Exact' },
            { type: 'item', value: 'regex-tenant-matcher', title: 'Regex' },
          ]}
        />
      </FormItem>

      {props.value.value.type === 'exact-tenant-matcher' && (
        <ExactTenantMatcher
          value={props.value.value}
          onChange={(v) => props.onChange({ ...props.value, value: v })}
        />
      )}
      {props.value.value.type === 'regex-tenant-matcher' && (
        <RegexTenantMatcher
          value={props.value.value}
          onChange={(v) => props.onChange({ ...props.value, value: v })}
        />
      )}
    </div>
  );
}

export default TenantMatcher;
