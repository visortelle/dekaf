import React from 'react';
import s from './HashingSchemeInput.module.css'
import { HashingScheme } from '../hashing-scheme';
import FormItem from '../../../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../ConfigurationTable/FormLabel/FormLabel';
import Select from '../../../../../Select/Select';

export type HashingSchemeInputProps = {
  value: HashingScheme,
  onChange: (v: HashingScheme) => void
};

const HashingSchemeInput: React.FC<HashingSchemeInputProps> = (props) => {
  return (
    <div className={s.HashingSchemeInput}>
      <FormItem>
        <FormLabel content="Hashing Scheme" />

        <Select<HashingScheme>
          value={props.value}
          onChange={props.onChange}
          list={[
            { type: 'item', value: 'java-string-hash', title: 'Java String' },
            { type: 'item', value: 'murmur3-hash-32', title: 'MurmurHash3 32-bit' },
          ]}
        />
      </FormItem>
    </div>
  );
}

export default HashingSchemeInput;
