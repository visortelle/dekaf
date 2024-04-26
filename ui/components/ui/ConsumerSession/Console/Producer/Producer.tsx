import React, { useMemo } from 'react';
import s from './Producer.module.css'
import ProducerSession from '../../../ProducerSession/ProducerSession';
import { LibraryContext } from '../../../LibraryBrowser/model/library-context';
import { ManagedProducerSessionConfig, ManagedProducerSessionConfigValOrRef } from '../../../LibraryBrowser/model/user-managed-items';
import { getDefaultManagedItem } from '../../../LibraryBrowser/default-library-items';

export type ProducerProps = {
  libraryContext: LibraryContext
};

const Producer: React.FC<ProducerProps> = (props) => {
  const config: ManagedProducerSessionConfigValOrRef = useMemo(() => {
    const v: ManagedProducerSessionConfig = getDefaultManagedItem('producer-session-config', props.libraryContext) as ManagedProducerSessionConfig;

    return {
      type: 'value',
      val: v
    }
  }, [props.libraryContext]);

  return (
    <div className={s.Producer}>
      <ProducerSession
        initialConfig={config}
        libraryContext={props.libraryContext}
      />
    </div>
  );
}

export default Producer;
