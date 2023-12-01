import React, { useEffect, useState } from 'react';
import s from './PulsarVersionElement.module.css'
import { CancelDownloadPulsarDistribution, DownloadPulsarDistribution, PulsarDistributionStatus, KnownPulsarVersion, GetPulsarDistributionStatus } from '../../../../main/api/local-pulsar-distributions/types';
import { apiChannel } from '../../../../main/channels';
import SmallButton from '../../../ui/SmallButton/SmallButton';
import * as I18n from '../../../app/I18n/I18n';
import * as Modals from '../../../app/Modals/Modals';
import DeleteDialog from './DeleteDialog/DeleteDialog';
import { knownPulsarVersions } from '../../../../main/api/local-pulsar-distributions/versions';
import DeleteButton from '../../../ui/DeleteButton/DeleteButton';

export type PulsarVersionInfoElementProps = {
  version: ({
    type: 'known-version',
    knownVersion: KnownPulsarVersion
  } | {
    type: 'unknown-version',
    unknownVersion: string
  })
};

const PulsarVersionElement: React.FC<PulsarVersionInfoElementProps> = (props) => {
  const version = props.version.type === 'known-version' ? props.version.knownVersion.version : props.version.unknownVersion;
  const [distributionStatus, setDistributionStatus] = useState<PulsarDistributionStatus>({ type: "unknown", version });
  const i18n = I18n.useContext();
  const modals = Modals.useContext();

  useEffect(() => {
    const req: GetPulsarDistributionStatus = {
      type: "GetPulsarDistributionStatus",
      version
    };
    window.electron.ipcRenderer.sendMessage(apiChannel, req);

    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "PulsarDistributionStatusChanged" && arg.version === version) {
        setDistributionStatus(arg.distributionStatus);
      }
    });
  }, []);

  return (
    <div className={s.PulsarVersionInfoElement}>
      <div><strong>{version}</strong></div>
      {distributionStatus.type === "downloading" && (
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12rem' }}>
          <div>
            <strong>{i18n.formatBytes(distributionStatus.bytesReceived)}</strong> of <strong>{i18n.formatBytes(distributionStatus.bytesTotal)}</strong>
          </div>
          <SmallButton
            type="danger"
            onClick={() => {
              const req: CancelDownloadPulsarDistribution = {
                type: "CancelDownloadPulsarDistributionRequest",
                version
              };

              window.electron.ipcRenderer.sendMessage(apiChannel, req);
            }}
            text="Cancel download"
          />
        </div>
      )}
      {distributionStatus.type === "error" && (<div style={{ color: "var(--accent-color-red)" }}>Error occurred. {distributionStatus.message} Try to restart the app.</div>)}
      {distributionStatus.type === "unpacking" && (<div>Unpacking ...</div>)}
      {distributionStatus.type === "deleting" && (<div>Deleting ...</div>)}
      {distributionStatus.type === "installed" && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8rem', marginLeft: 'auto' }}>
          <DeleteButton
            isHideText
            type='danger'
            onClick={() => {
              modals.push({
                id: "delete-pulsar-distribution",
                title: `Delete Pulsar version`,
                content: (
                  <DeleteDialog version={version} />
                ),
                styleMode: "no-content-padding",
              });
            }}
          />
          <SmallButton
            text="Select this version"
            type='primary'
            onClick={() => { }}
          />
        </div>
      )}
      {distributionStatus.type === "not-installed" && knownPulsarVersions.includes(version as any) && (
        <div style={{ marginLeft: 'auto' }}>
          <SmallButton
            text="Install this version"
            type='regular'
            onClick={() => {
              if (props.version.type !== 'known-version') {
                return;
              }

              const req: DownloadPulsarDistribution = {
                type: "DownloadPulsarDistribution",
                version: props.version.knownVersion
              };
              window.electron.ipcRenderer.sendMessage(apiChannel, req);
            }}
          />
        </div>

      )}
    </div>
  );
}

export default PulsarVersionElement;
