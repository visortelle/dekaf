import React from 'react';
import s from './CompressionTypeInput.module.css'
import { CompressionType } from '../compression-type';
import FormItem from '../../../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../ConfigurationTable/FormLabel/FormLabel';
import Select from '../../../../../Select/Select';

export type CompressionTypeInputProps = {
  value: CompressionType,
  onChange: (v: CompressionType) => void
};

const CompressionTypeInput: React.FC<CompressionTypeInputProps> = (props) => {
  return (
    <div className={s.CompressionTypeInput}>
      <FormItem size='small'>
        <FormLabel content="Compression Type" />
        <Select<CompressionType>
          size='small'
          value={props.value}
          list={[
            { type: 'item', title: 'None', value: 'none' },
            { type: 'item', title: 'LZ4', value: 'lz4' },
            { type: 'item', title: 'ZLib', value: 'zlib' },
            { type: 'item', title: 'ZSTD', value: 'zstd' },
            { type: 'item', title: 'Snappy', value: 'snappy' }
          ]}
          onChange={props.onChange}
        />
      </FormItem>
    </div>
  );
}

export default CompressionTypeInput;
