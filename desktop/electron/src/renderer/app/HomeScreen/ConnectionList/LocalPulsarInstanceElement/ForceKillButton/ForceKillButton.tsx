import React from 'react';
import s from './ForceKillButton.module.css'
import SmallButton from '../../../../../ui/SmallButton/SmallButton';
import { KillProcess } from '../../../../../../main/api/processes/types';
import { apiChannel } from '../../../../../../main/channels';

export type ForceKillButtonProps = {
  processId: string
};

const ForceKillButton: React.FC<ForceKillButtonProps> = (props) => {
  return (
    <SmallButton
      type='danger'
      text='Force Stop'
      appearance='borderless'
      onClick={() => {
        const req: KillProcess = { type: "KillProcess", processId: props.processId, isForce: true };
        window.electron.ipcRenderer.sendMessage(apiChannel, req);
      }}
    />
  );
}

export default ForceKillButton;
