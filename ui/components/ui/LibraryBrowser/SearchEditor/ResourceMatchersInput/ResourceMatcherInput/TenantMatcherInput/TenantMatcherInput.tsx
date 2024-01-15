import React from 'react';
import s from './TenantMatcherInput.module.css';
import Select from '../../../../../Select/Select';
import ExactTenantMatcherInput from './ExactTenantMatcherInput/ExactTenantMatcherInput';
import AllTenantMatcherInput from './AllTenantMatcherInput/AllTenantMatcherInput';
import FormItem from '../../../../../ConfigurationTable/FormItem/FormItem';
import ResourceFormLabel from '../ui/ResourceFormLabel/ResourceFormLabel';
import { TenantMatcherType, TenantMatcher } from '../../../../model/resource-matchers';
import { v4 as uuid } from 'uuid';

export type TenantMatcherInputProps = {
  value: TenantMatcher;
  onChange: (value: TenantMatcher) => void;
  isReadOnly?: boolean;
};

const TenantMatcherInput: React.FC<TenantMatcherInputProps> = (props) => {
  return (
    <div className={s.TenantMatcherInput}>
      <FormItem size='small'>
        <div style={{ display: 'flex', gap: '4rem', alignItems: 'center' }}>
          <ResourceFormLabel type='tenant' />
          <Select<TenantMatcherType>
            size='small'
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
                    type: 'all-tenant-matcher',
                    reactKey: uuid()
                  },
                  reactKey: uuid()
                });
              }
            }}
            list={[
              { type: 'item', value: 'exact-tenant-matcher', title: 'exact name' },
              { type: 'item', value: 'all-tenant-matcher', title: 'all' },
            ]}
            isReadOnly={props.isReadOnly}
          />
        </div>
      </FormItem>

      {props.value.value.type === 'exact-tenant-matcher' && (
        <ExactTenantMatcherInput
          value={props.value.value}
          onChange={(v) => props.onChange({ ...props.value, value: v })}
          isReadOnly={props.isReadOnly}
        />
      )}
      {props.value.value.type === 'all-tenant-matcher' && (
        <AllTenantMatcherInput
          value={props.value.value}
          onChange={(v) => props.onChange({ ...props.value, value: v })}
          isReadOnly={props.isReadOnly}
        />
      )}
    </div>
  );
}

export default TenantMatcherInput;
