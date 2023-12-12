import React from 'react';
import s from './ResourceMatchersInput.module.css'
import { ResourceMatcher } from '../../model/resource-matchers';
import ResourceMatcherInput from './ResourceMatcherInput/ResourceMatcherInput';
import { LibraryContext } from '../../model/library-context';
import { resourceMatcherFromContext } from '../../model/library-context';
import ListInput from '../../../ConfigurationTable/ListInput/ListInput';

export type ResourceMatchersInputProps = {
  value: ResourceMatcher[];
  onChange: (value: ResourceMatcher[]) => void
  libraryContext: LibraryContext;
};

const ResourceMatchersInput: React.FC<ResourceMatchersInputProps> = (props) => {
  return (
    <div className={s.ResourceMatchersInput}>
      <ListInput<ResourceMatcher>
        value={props.value}
        renderItem={(matcher) => {
          return (
            <div className={s.ResourceMatcherInput}>
              <ResourceMatcherInput
                value={matcher}
                onChange={(v) => {
                  const newMatchers = props.value.map(mt => mt.reactKey === matcher.reactKey ? v : mt);
                  props.onChange(newMatchers);
                }}
              />
            </div>
          );
        }}
        itemName='Pulsar Resource Selector'
        onChange={(v) => props.onChange(v)}
        onAdd={() => {
          const newMatcher = resourceMatcherFromContext(props.libraryContext);
          const newMatchers = [...props.value, newMatcher];
          props.onChange(newMatchers);
        }}
        onRemove={(reactKey) => {
          const newMatchers = props.value.filter(mt => mt.reactKey !== reactKey);
          props.onChange(newMatchers);
        }}
        getId={(matcher) => matcher.reactKey}
        isContentDoesntOverlapRemoveButton
        isHideNothingToShow
      />
    </div>
  );
}

export default ResourceMatchersInput;
