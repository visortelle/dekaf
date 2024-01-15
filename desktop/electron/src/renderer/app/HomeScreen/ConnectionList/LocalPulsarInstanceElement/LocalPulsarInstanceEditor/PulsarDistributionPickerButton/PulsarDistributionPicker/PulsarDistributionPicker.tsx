import React, { useEffect, useState } from 'react';
import s from './PulsarDistributionPicker.module.css';
import PulsarVersionElement from './PulsarVersionInfoElement/PulsarVersionElement';
import { AnyPulsarVersion, ListPulsarDistributions } from '../../../../../../../../main/api/local-pulsar-distributions/types';
import { apiChannel } from '../../../../../../../../main/channels';
import { knownPulsarVersions, pulsarReleaseLines } from '../../../../../../../../main/api/local-pulsar-distributions/versions';
import { H2 } from '../../../../../../../ui/H/H';

const formatDate = (date: Date) => (
  <span>
    {date.toLocaleDateString('en-us', { year: "numeric", month: "short", day: "numeric" })}
  </span>
);

export type PulsarDistributionPickerProps = {
  onSelectVersion: (v: string) => void
};

export const PulsarDistributionsPicker: React.FC<PulsarDistributionPickerProps> = (props) => {
  const [versions, setVersions] = useState<AnyPulsarVersion[]>([]);

  useEffect(() => {
    const refreshPulsarDistributionsList = () => {
      const req: ListPulsarDistributions = { type: "ListPulsarDistributions", isInstalledOnly: false };
      window.electron.ipcRenderer.sendMessage(apiChannel, req);
    };

    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "ListPulsarDistributionsResult" && !arg.isInstalledOnly) {
        setVersions(arg.versions || []);
      } else if (arg.type === "PulsarDistributionDeleted") {
        refreshPulsarDistributionsList();
      }
    });

    refreshPulsarDistributionsList();
  }, []);

  const unknownPulsarVersions = versions.filter(v => !knownPulsarVersions.includes(v));

  return (
    <div className={s.PulsarDistributionPicker}>
      {pulsarReleaseLines.sort((a, b) => b.minorVersion.localeCompare(a.minorVersion, 'en', { numeric: true })).map(rl => {
        return (
          <div key={rl.minorVersion} className={s.ReleaseLine}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem', padding: '12rem 24rem' }}>
              <span>
                <H2>
                  <strong style={{ color: rl.versionType === 'lts' ? 'var(--accent-color-blue)' : 'inherit' }}>{rl.minorVersion}.x</strong>
                  {rl.versionType === 'lts' && <strong style={{ color: 'var(--accent-color-blue)' }}>&nbsp;LTS</strong>}
                </H2>
              </span>
              <span><strong>Released at:</strong> {formatDate(new Date(rl.releasedAt))}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8rem' }}>
                <div style={{ width: '12rem', height: '12rem', borderRadius: '12rem', background: new Date(rl.activeSupportEndsAt).getTime() < Date.now() ? `var(--accent-color-red)` : 'var(--accent-color-green)' }}></div>
                <strong>Active support:</strong> {formatDate(new Date(rl.activeSupportEndsAt))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8rem' }}>
                <div style={{ width: '12rem', height: '12rem', borderRadius: '12rem', background: new Date(rl.securitySupportEndsAt).getTime() < Date.now() ? `var(--accent-color-red)` : 'var(--accent-color-green)' }}></div>
                <strong>Security support:</strong> {formatDate(new Date(rl.securitySupportEndsAt))}
              </div>
            </div>
            {rl.knownVersions.sort((a, b) => b.version.localeCompare(a.version, 'en', { numeric: true })).map(knownVersion => (
              <PulsarVersionElement
                key={knownVersion.version}
                version={{ type: 'known-version', knownVersion }}
                onSelectThisVersion={() => props.onSelectVersion(knownVersion.version)}
              />
            ))}
          </div>
        );
      })}

      {unknownPulsarVersions.length > 0 && (
        <>
          <div style={{ padding: '12rem 24rem' }}>
            <H2>Other versions:</H2>
          </div>
          <div>
            {unknownPulsarVersions.sort((a, b) => b.localeCompare(a, 'en', { numeric: true })).map(unknownVersion => (
              <PulsarVersionElement
                key={unknownVersion}
                version={{ type: 'unknown-version', unknownVersion: unknownVersion }}
                onSelectThisVersion={() => props.onSelectVersion(unknownVersion)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PulsarDistributionsPicker;
