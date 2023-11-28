import React, { useEffect, useState } from 'react';
import s from './PulsarVersionInfoElement.module.css'
import { AnyPulsarVersion, DownloadPulsarDistribution, KnownPulsarVersion, PulsarDistributionStatus, PulsarVersionInfo, knownPulsarVersions } from '../../../main/api/local-pulsar-distributions/types';
import { apiChannel } from '../../../main/channels';
import SmallButton from '../../ui/SmallButton/SmallButton';
import * as I18n from '../../app/I18n/I18n';
import { ErrorHappened } from '../../../main/api/api/types';

export type PulsarVersionInfoElementProps = {
  version: AnyPulsarVersion
};

const PulsarVersionInfoElement: React.FC<PulsarVersionInfoElementProps> = (props) => {
  const [distributionStatus, setDistributionStatus] = useState<PulsarDistributionStatus>({ type: "unknown", version: props.version });
  const i18n = I18n.useContext();

  useEffect(() => {
    window.electron.ipcRenderer.on('api', (arg) => {
      if (arg.type === "PulsarDistributionStatusChanged" && arg.version === props.version) {
        setDistributionStatus(arg.distributionStatus);
      }
    });
  }, []);

  return (
    <div className={s.PulsarVersionInfoElement}>
      <div><strong>{props.version}</strong></div>
      {distributionStatus.type === "downloading" && (
        <div>Downloading <strong>{i18n.formatBytes(distributionStatus.bytesReceived)}</strong> of <strong>{i18n.formatBytes(distributionStatus.bytesTotal)}</strong></div>
      )}
      {distributionStatus.type === "unpacking" && (
        <div>Unpacking ...</div>
      )}
      {distributionStatus.type === "installed" && (
        <SmallButton
          text="Use this version"
          type='primary'
          onClick={() => {}}
        />
      )}
      {distributionStatus.type === "not-installed" && knownPulsarVersions.includes(props.version as any) && (
        <SmallButton
          text="Install this version"
          type='regular'
          onClick={() => {
            const req: DownloadPulsarDistribution = {
              type: "DownloadPulsarDistribution",
              version: props.version as KnownPulsarVersion
            };
            window.electron.ipcRenderer.sendMessage(apiChannel, req);
          }}
        />
      )}
    </div>
  );
}

export default PulsarVersionInfoElement;
