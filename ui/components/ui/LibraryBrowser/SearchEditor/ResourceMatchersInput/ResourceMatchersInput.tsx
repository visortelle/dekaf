import React from 'react';
import s from './ResourceMatchersInput.module.css'
import { ResourceMatcher } from '../../model/resource-matchers';
import ResourceMatcherInput from './ResourceMatcherInput/ResourceMatcherInput';
import SmallButton from '../../../SmallButton/SmallButton';
import { LibraryContext } from '../../model/library-context';
import { resourceMatcherFromContext } from '../../model/library-context';
import AddButton from '../../../AddButton/AddButton';

export type ResourceMatchersInputProps = {
  value: ResourceMatcher[];
  onChange: (value: ResourceMatcher[]) => void
  libraryContext: LibraryContext;
};

const ResourceMatchersInput: React.FC<ResourceMatchersInputProps> = (props) => {
  return (
    <div className={s.ResourceMatchersInput}>
      <div className={s.Matchers}>
        {props.value.map((matcher) => (
          <div key={matcher.reactKey}>
            <ResourceMatcherInput
              value={matcher}
              onChange={(v) => {
                const newMatchers = props.value.map(mt => mt.reactKey === matcher.reactKey ? v : mt);
                props.onChange(newMatchers);
              }}
              onDelete={() => {
                const newMatchers = props.value.filter(mt => mt.reactKey !== matcher.reactKey);
                props.onChange(newMatchers);
              }}
            />
          </div>
        ))}
      </div>

      <div className={s.AddButton}>
        <AddButton
          onClick={() => {
            const newMatcher = resourceMatcherFromContext(props.libraryContext);
            const newMatchers = [...props.value, newMatcher];
            props.onChange(newMatchers);
          }}
          itemName="Matcher"
        />
      </div>
    </div>
  );
}

export default ResourceMatchersInput;
