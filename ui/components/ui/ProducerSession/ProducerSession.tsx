import React from 'react';
import s from './ProducerSession.module.css'
import ProducerSessionConfigInput from './producer-session-config/ProducerSessionConfigInput/ProducerSessionConfigInput';
import { ManagedProducerSessionConfigValOrRef } from '../LibraryBrowser/model/user-managed-items';
import { LibraryContext } from '../LibraryBrowser/model/library-context';
import { LibraryBrowserPanelProps } from '../LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';

export type ProducerSessionProps = {
  initialConfig: ManagedProducerSessionConfigValOrRef
  libraryContext: LibraryContext;
  isReadOnly?: boolean;
  libraryBrowserPanel?: Partial<LibraryBrowserPanelProps>
};

const ProducerSession: React.FC<ProducerSessionProps> = (props) => {
  const [config, setConfig] = React.useState<ManagedProducerSessionConfigValOrRef>(props.initialConfig);

  return (
    <div className={s.ProducerSession}>
      <ProducerSessionConfigInput
        value={config}
        onChange={setConfig}
        libraryContext={props.libraryContext}
        isReadOnly={props.isReadOnly}
        libraryBrowserPanel={props.libraryBrowserPanel}
      />
    </div>
  );
}

export default ProducerSession;
