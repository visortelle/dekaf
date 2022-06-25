import React from 'react';
import s from './HealthCheck.module.css'
import sts from '../../../ui/SimpleTable/SimpleTable.module.css';
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
      <table className={sts.Table}>
        <tbody>
          <tr className={sts.Row}>
            <td className={sts.Cell}>Connection</td>
            <td className={sts.Cell}>{
              healthCheckError === undefined ?
                <strong style={{ color: 'var(--accent-color-green)' }}>OK</strong> :
                <strong style={{ color: 'var(--accent-color-red)' }}>Fail</strong>
            }
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.Cell}>Backlog quota</td>
            <td className={sts.Cell}>{
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
