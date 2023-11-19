import React from 'react';
import s from './TenantMatcherInput.module.css';
import Select from '../../../../../Select/Select';
import ExactTenantMatcherInput from './ExactTenantMatcherInput/ExactTenantMatcherInput';
import RegexTenantMatcherInput from './RegexTenantMatcherInput/RegexTenantMatcherInput';
import FormItem from '../../../../../ConfigurationTable/FormItem/FormItem';
import ResourceFormLabel from '../ui/ResourceFormLabel/ResourceFormLabel';
import { TenantMatcherType, TenantMatcher } from '../../../../model/resource-matchers';
import { v4 as uuid } from 'uuid';

export type TenantMatcherInputProps = {
  value: TenantMatcher;
  onChange: (value: TenantMatcher) => void;
};

const TenantMatcherInput: React.FC<TenantMatcherInputProps> = (props) => {
  return (
    <div className={s.TenantMatcherInput}>
      <FormItem>
        <ResourceFormLabel type='tenant' />
        <Select<TenantMatcherType>
          value={props.value.value.type}
          onChange={(v) => {
            if (v === 'exact-tenant-matcher') {
              props.onChange({
                type: 'tenant-matcher',
                value: {
                  type: 'exact-tenant-matcher',
                  tenant: '',
                  reactKey: uuid()
                },
                reactKey: uuid()
              });
            } else {
              props.onChange({
                type: 'tenant-matcher',
                value: {
                  type: 'regex-tenant-matcher',
                  tenantRegex: '',
                  reactKey: uuid()
                },
                reactKey: uuid()
              });
            }
          }}
          list={[
            { type: 'item', value: 'exact-tenant-matcher', title: 'Exact' },
            { type: 'item', value: 'regex-tenant-matcher', title: 'Regex' },
          ]}
        />
      </FormItem>

      {props.value.value.type === 'exact-tenant-matcher' && (
        <ExactTenantMatcherInput
          value={props.value.value}
          onChange={(v) => props.onChange({ ...props.value, value: v })}
        />
      )}
      {props.value.value.type === 'regex-tenant-matcher' && (
        <RegexTenantMatcherInput
          value={props.value.value}
          onChange={(v) => props.onChange({ ...props.value, value: v })}
        />
      )}
    </div>
  );
}

export default TenantMatcherInput;
