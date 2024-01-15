import React, { useEffect } from 'react';
import s from './ProcessLogsViewButton.module.css'
import * as Modals from '../../../app/Modals/Modals';
import SmallButton from '../../SmallButton/SmallButton';
import ProcessLogsView, { ProcessLogsViewProps } from '../ProcessLogsView/ProcessLogsView';
import { usePrevious } from '../../../app/hooks/use-previous';

export type ProcessLogsViewButtonProps = {
  modalTitle?: string,
  disabled?: boolean
} & ProcessLogsViewProps;

const ProcessLogsViewButton: React.FC<ProcessLogsViewButtonProps> = (props) => {
  const prevSources = usePrevious(props.sources);
  const modals = Modals.useContext();

  const modalId = 'process-logs';

  const modal: Modals.ModalStackEntry = {
    id: modalId,
    title: props.modalTitle || 'Logs',
    content: (
      <div style={{ display: 'flex', maxWidth: 'calc(100vw - 48rem)' }}>
        <ProcessLogsView {...props} key={JSON.stringify(props.sources)} />
      </div>
    ),
    styleMode: 'no-content-padding'
  }

  useEffect(() => {
    if (JSON.stringify(props.sources) === JSON.stringify(prevSources)) {
      return;
    }

    modals.update(modalId, modal);
  }, [props.sources, prevSources]);

  return (
    <div className={s.ProcessLogsViewButton}>
      <SmallButton
        type='regular'
        text='Show logs'
        disabled={props.disabled}
        onClick={() => modals.push(modal)}
      />
    </div>
  );
}

export default ProcessLogsViewButton;
