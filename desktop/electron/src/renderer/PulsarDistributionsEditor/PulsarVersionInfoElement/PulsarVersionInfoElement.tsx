import React, { useEffect } from 'react';
import s from './PulsarVersionInfoElement.module.css'
import { AnyPulsarVersion, PulsarDistributionStatus, PulsarVersionInfo } from '../../../main/api/local-pulsar-distributions/types';
import { apiChannel } from '../../../main/channels';

export type PulsarVersionInfoElementProps = {
  version: AnyPulsarVersion,
  distributionStatus?: PulsarDistributionStatus
};

const PulsarVersionInfoElement: React.FC<PulsarVersionInfoElementProps> = (props) => {
  // useEffect(() => {
  //   const listReq = { type: "ListPulsarDistributionsRequest" };
  //   window.electron.ipcRenderer.sendMessage(apiChannel, listReq);

  //   window.electron.ipcRenderer.once('api', (arg) => {
  //     if (arg.type === "ListPulsarDistributionsResponse") {
  //       setVersions(arg.versions || []);
  //     }
  //   });
  // }, []);

  return (
    <div className={s.PulsarVersionInfoElement}>
      <div>{props.version}</div>
      {props.distributionStatus && (<div>{JSON.stringify(props.distributionStatus)}</div>)}
    </div>
  );
}

export default PulsarVersionInfoElement;
