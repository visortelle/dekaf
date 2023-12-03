import React from 'react';
import s from './ProcessLogsViewButton.module.css'
import * as Modals from '../../../app/Modals/Modals';
import SmallButton from '../../SmallButton/SmallButton';
import ProcessLogsView, { ProcessLogsViewProps } from '../ProcessLogsView/ProcessLogsView';

export type ProcessLogsViewButtonProps = {} & ProcessLogsViewProps;

const ProcessLogsViewButton: React.FC<ProcessLogsViewButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <div className={s.ProcessLogsViewButton}>
      <SmallButton
        type='regular'
        text='Show logs'
        onClick={() => {
          modals.push({
            id: 'process-logs',
            title: 'Logs',
            content: (
              <ProcessLogsView {...props} />
            ),
            styleMode: 'no-content-padding'
          });
        }}
      />
    </div>
  );
}

export default ProcessLogsViewButton;
