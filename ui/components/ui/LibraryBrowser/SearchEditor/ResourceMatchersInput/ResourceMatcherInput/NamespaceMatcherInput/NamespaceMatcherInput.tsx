import React from 'react';
import s from './NamespaceMatcherInput.module.css';
import Select from '../../../../../Select/Select';
import ExactNamespaceMatcherInput from './ExactNamespaceMatcherInput/ExactNamespaceMatcherInput';
import AllNamespaceMatcherInput from './AllNamespaceMatcherInput/AllNamespaceMatcherInput';
import FormItem from '../../../../../ConfigurationTable/FormItem/FormItem';
import ResourceFormLabel from '../ui/ResourceFormLabel/ResourceFormLabel';
import { NamespaceMatcherType, NamespaceMatcher } from '../../../../model/resource-matchers';
import { v4 as uuid } from 'uuid';

export type NamespaceMatcherInputProps = {
  value: NamespaceMatcher;
  onChange: (value: NamespaceMatcher) => void;
  isReadOnly?: boolean;
};

const NamespaceMatcherInput: React.FC<NamespaceMatcherInputProps> = (props) => {
  return (
    <div className={s.NamespaceMatcherInput}>
      <FormItem size='small'>
        <div style={{ display: 'flex', gap: '4rem', alignItems: 'center' }}>
          <ResourceFormLabel type='namespace' />
          <Select<NamespaceMatcherType>
            size='small'
            value={props.value.value.type}
            onChange={(v) => {
              if (v === 'exact-namespace-matcher') {
                props.onChange({
                  type: 'namespace-matcher',
                  value: {
                    type: 'exact-namespace-matcher',
                    tenant: props.value.value.tenant,
                    namespace: '',
                    reactKey: uuid()
                  },
                  reactKey: uuid()
                });
              } else if (v === 'all-namespace-matcher') {
                props.onChange({
                  type: 'namespace-matcher',
                  value: {
                    type: 'all-namespace-matcher',
                    tenant: props.value.value.tenant,
                    reactKey: uuid()
                  },
                  reactKey: uuid()
                });
              }
            }}
            list={[
              { type: 'item', value: 'exact-namespace-matcher', title: 'exact name' },
              { type: 'item', value: 'all-namespace-matcher', title: 'all' },
            ]}
            isReadOnly={props.isReadOnly}
          />
        </div>
      </FormItem>

      {props.value.value.type === 'exact-namespace-matcher' && (
        <ExactNamespaceMatcherInput
          value={props.value.value}
          onChange={(v) => props.onChange({ ...props.value, value: v })}
          isReadOnly={props.isReadOnly}
        />
      )}
      {props.value.value.type === 'all-namespace-matcher' && (
        <AllNamespaceMatcherInput
          value={props.value.value}
          onChange={(v) => props.onChange({ ...props.value, value: v })}
          isReadOnly={props.isReadOnly}
        />
      )}
    </div>
  );
}

export default NamespaceMatcherInput;
