import React, { useEffect, useState } from 'react';
import s from './PulsarVersionInfoElement.module.css'
import { AnyPulsarVersion, PulsarDistributionStatus, PulsarVersionInfo } from '../../../main/api/local-pulsar-distributions/types';
import { apiChannel } from '../../../main/channels';
import { ApiEvent } from '../../../main/api/service';

export type PulsarVersionInfoElementProps = {
  version: AnyPulsarVersion
};

const PulsarVersionInfoElement: React.FC<PulsarVersionInfoElementProps> = (props) => {
  const [distributionStatus, setDistributionStatus] = useState<PulsarDistributionStatus>({ type: "unknown", version: props.version });

  useEffect(() => {
    window.electron.ipcRenderer.on('api', (arg) => {
      if (arg.type === "PulsarDistributionStatusChanged" && arg.version === props.version) {
        setDistributionStatus(arg.distributionStatus);
      }
    });
  }, []);

  return (
    <div className={s.PulsarVersionInfoElement}>
      <div>{props.version}</div>
      {distributionStatus && (<div>{JSON.stringify(distributionStatus)}</div>)}
      {distributionStatus.type === "not-downloaded"}
    </div>
  );
}

export default PulsarVersionInfoElement;
