import React from 'react';
import s from './Producer.module.css'
import ProducerSession from '../../../ProducerSession/ProducerSession';
import { LibraryContext } from '../../../LibraryBrowser/model/library-context';

export type ProducerProps = {
  libraryContext: LibraryContext
};

const Producer: React.FC<ProducerProps> = (props) => {
  return (
    <div className={s.Producer}>
      <ProducerSession
        libraryContext={props.libraryContext}
      />
    </div>
  );
}

export default Producer;
