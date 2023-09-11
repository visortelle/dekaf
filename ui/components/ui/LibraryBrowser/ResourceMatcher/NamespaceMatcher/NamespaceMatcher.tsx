import React from 'react';
import s from './NamespaceMatcher.module.css';
import Select from '../../../Select/Select';
import ExactNamespaceMatcher, { ExactNamespaceMatcherValue } from './ExactNamespaceMatcher/ExactNamespaceMatcher';
import RegexNamespaceMatcher, { RegexNamespaceMatcherValue } from './RegexNamespaceMatcher/RegexNamespaceMatcher';

export type NamespaceMatcherValue = {
  type: 'namespace-matcher',
  value: ExactNamespaceMatcherValue | RegexNamespaceMatcherValue
};
export type NamespaceMatcherType = NamespaceMatcherValue['value']['type'];

export type NamespaceMatcherProps = {
  value: NamespaceMatcherValue;
  onChange: (value: NamespaceMatcherValue) => void;
};

const NamespaceMatcher: React.FC<NamespaceMatcherProps> = (props) => {
  return (
    <div className={s.NamespaceMatcher}>
      <Select<NamespaceMatcherType>
        value={props.value.type}
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
      {props.value.value.type === 'exact-namespace-matcher' && (
        <ExactNamespaceMatcher
          value={props.value.value}
          onChange={(v) => props.onChange({ ...props.value, value: v })}
        />
      )}
      {props.value.value.type === 'regex-namespace-matcher' && (
        <RegexNamespaceMatcher
          value={props.value.value}
          onChange={(v) => props.onChange({ ...props.value, value: v })}
        />
      )}
    </div>
  );
}

export default NamespaceMatcher;
