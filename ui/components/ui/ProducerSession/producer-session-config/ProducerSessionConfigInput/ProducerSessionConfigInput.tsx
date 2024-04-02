import React from 'react';
import s from './ProducerSessionConfigInput.module.css'
import { ManagedProducerSessionConfigValOrRef } from '../../../LibraryBrowser/model/user-managed-items';

export type ProducerSessionConfigInputProps = {
  value: ManagedProducerSessionConfigValOrRef,
  onChange: (v: ManagedProducerSessionConfigValOrRef) => void
};

const ProducerSessionConfigInput: React.FC<ProducerSessionConfigInputProps> = (props) => {
  return (
    <div className={s.ProducerSessionConfigInput}>

    </div>
  );
}

export default ProducerSessionConfigInput;
