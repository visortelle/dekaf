import React, { useEffect, useState } from 'react';
import s from './PulsarVersionInfoElement.module.css'
import { AnyPulsarVersion, CancelDownloadPulsarDistribution, DeletePulsarDistribution, DownloadPulsarDistribution, KnownPulsarVersion, PulsarDistributionStatus, PulsarVersionInfo, knownPulsarVersions } from '../../../main/api/local-pulsar-distributions/types';
import { apiChannel } from '../../../main/channels';
import SmallButton from '../../ui/SmallButton/SmallButton';
import * as I18n from '../../app/I18n/I18n';
import * as Modals from '../../app/Modals/Modals';
import DeleteDialog from './DeleteDialog/DeleteDialog';

export type PulsarVersionInfoElementProps = {
  version: AnyPulsarVersion
};

const PulsarVersionInfoElement: React.FC<PulsarVersionInfoElementProps> = (props) => {
  const [distributionStatus, setDistributionStatus] = useState<PulsarDistributionStatus>({ type: "unknown", version: props.version });
  const i18n = I18n.useContext();
  const modals = Modals.useContext();

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
        <div>
          <SmallButton
            type="danger"
            onClick={() => {
              const req: CancelDownloadPulsarDistribution = {
                type: "CancelDownloadPulsarDistributionRequest",
                version: props.version
              };

              window.electron.ipcRenderer.sendMessage(apiChannel, req);
            }}
            text="Cancel download"
          />
          <strong>{i18n.formatBytes(distributionStatus.bytesReceived)}</strong> of <strong>{i18n.formatBytes(distributionStatus.bytesTotal)}</strong>
        </div>
      )}
      {distributionStatus.type === "error" && (<div style={{ color: "var(--accent-color-red)" }}>Error occurred. Try to restart the app.</div>)}
      {distributionStatus.type === "unpacking" && (<div>Unpacking ...</div>)}
      {distributionStatus.type === "deleting" && (<div>Deleting ...</div>)}
      {distributionStatus.type === "installed" && (
        <div>
          <SmallButton
            text="Use this version"
            type='primary'
            onClick={() => { }}
          />

          <SmallButton
            text="Delete this version"
            type='danger'
            onClick={() => {
              modals.push({
                id: "delete-pulsar-distribution",
                title: `Delete Pulsar version`,
                content: (
                  <DeleteDialog version={props.version} />
                ),
                styleMode: "no-content-padding",
              });
            }}
          />
        </div>
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
