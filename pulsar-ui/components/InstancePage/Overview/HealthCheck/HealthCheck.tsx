import React, { useEffect } from 'react';
import s from './HealthCheck.module.css'
import * as PulsarAdminClient from '../../../app/contexts/PulsarAdminClient';
import useSWR from 'swr';
import { swrKeys } from '../../../swrKeys';

const HealthCheck: React.FC = () => {
  const adminClient = PulsarAdminClient.useContext().client;

  const { error: healthCheckError } = useSWR(
    swrKeys.pulsar.brokers.healthCheck._(),
    async () => await adminClient.brokers.healthCheck(),
    { refreshInterval: 1000 }
  );

  const { error: backlogQuotaCheckError } = useSWR(
    swrKeys.pulsar.brokers.backlogQuotaHealthCheck._(),
    async () => await adminClient.brokers.backlogQuotaCheck(),
    { refreshInterval: 1000 }
  );

  return (
    <div className={s.InternalConfig}>
      <div className={s.Title}>Status</div>
      <table className={s.Table}>
        <tbody>
          <tr className={s.Row}>
            <td className={s.Cell}>Connection</td>
            <td className={s.Cell}>{
              healthCheckError === undefined ?
                <strong style={{ color: 'var(--accent-color-green)' }}>OK</strong> :
                <strong style={{ color: 'var(--accent-color-red)' }}>Fail</strong>
            }
            </td>
          </tr>
          <tr className={s.Row}>
            <td className={s.Cell}>Backlog quota</td>
            <td className={s.Cell}>{
              backlogQuotaCheckError === undefined ?
                <strong style={{ color: 'var(--accent-color-green)' }}>OK</strong> :
                <strong style={{ color: 'var(--accent-color-red)' }}>Fail</strong>
            }
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default HealthCheck;
