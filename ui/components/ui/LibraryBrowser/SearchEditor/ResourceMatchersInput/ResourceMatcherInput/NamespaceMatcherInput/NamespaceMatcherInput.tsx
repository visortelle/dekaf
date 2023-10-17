import React from 'react';
import s from './NamespaceMatcherInput.module.css';
import Select from '../../../../../Select/Select';
import ExactNamespaceMatcherInput from './ExactNamespaceMatcherInput/ExactNamespaceMatcherInput';
import RegexNamespaceMatcherInput from './RegexNamespaceMatcherInput/RegexNamespaceMatcherInput';
import FormItem from '../../../../../ConfigurationTable/FormItem/FormItem';
import ResourceFormLabel from '../ui/ResourceFormLabel/ResourceFormLabel';
import { NamespaceMatcherType, NamespaceMatcher } from '../../../../model/resource-matchers';

export type NamespaceMatcherInputProps = {
  value: NamespaceMatcher;
  onChange: (value: NamespaceMatcher) => void;
};

const NamespaceMatcherInput: React.FC<NamespaceMatcherInputProps> = (props) => {
  return (
    <div className={s.NamespaceMatcherInput}>
      <FormItem>
        <ResourceFormLabel type='namespace' />
        <Select<NamespaceMatcherType>
          value={props.value.value.type}
          onChange={(v) => {
            if (v === 'exact-namespace-matcher') {
              props.onChange({
                type: 'namespace-matcher',
                value: {
                  type: 'exact-namespace-matcher',
                  tenant: props.value.value.tenant, namespace: ''
                }
              });
            } else if (v === 'regex-namespace-matcher') {
              props.onChange({
                type: 'namespace-matcher',
                value: {
                  type: 'regex-namespace-matcher',
                  tenant: props.value.value.tenant,
                  namespaceRegex: ''
                }
              });
            }
          }}
          list={[
            { type: 'item', value: 'exact-namespace-matcher', title: 'Exact' },
            { type: 'item', value: 'regex-namespace-matcher', title: 'Regex' },
          ]}
        />
      </FormItem>

      {props.value.value.type === 'exact-namespace-matcher' && (
        <ExactNamespaceMatcherInput
          value={props.value.value}
          onChange={(v) => props.onChange({ ...props.value, value: v })}
        />
      )}
      {props.value.value.type === 'regex-namespace-matcher' && (
        <RegexNamespaceMatcherInput
          value={props.value.value}
          onChange={(v) => props.onChange({ ...props.value, value: v })}
        />
      )}
    </div>
  );
}

export default NamespaceMatcherInput;
