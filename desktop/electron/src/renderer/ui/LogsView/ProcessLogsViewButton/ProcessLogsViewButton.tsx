import React from 'react';
import s from './ProcessLogsViewButton.module.css'
import * as Modals from '../../../app/Modals/Modals';
import SmallButton from '../../SmallButton/SmallButton';
import ProcessLogsView, { ProcessLogsViewProps } from '../ProcessLogsView/ProcessLogsView';

export type ProcessLogsViewButtonProps = {
  modalTitle?: string,
  disabled?: boolean
} & ProcessLogsViewProps;

const ProcessLogsViewButton: React.FC<ProcessLogsViewButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <div className={s.ProcessLogsViewButton}>
      <SmallButton
        type='regular'
        text='Show logs'
        disabled={props.disabled}
        onClick={() => {
          modals.push({
            id: 'process-logs',
            title: props.modalTitle || 'Logs',
            content: (
              <div style={{ display: 'flex', maxWidth: 'calc(100vw - 48rem)' }}>
                <ProcessLogsView {...props} />
              </div>
            ),
            styleMode: 'no-content-padding'
          });
        }}
      />
    </div>
  );
}

export default ProcessLogsViewButton;
