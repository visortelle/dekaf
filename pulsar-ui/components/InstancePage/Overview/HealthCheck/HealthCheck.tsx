import React from 'react';
import s from './HealthCheck.module.css'
import sts from '../../../ui/SimpleTable/SimpleTable.module.css';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Notifications from '../../../app/contexts/Notifications';
import useSWR from 'swr';
import { swrKeys } from '../../../swrKeys';
import { HealthCheckRequest } from '../../../../grpc-web/tools/teal/pulsar/ui/brokers/v1/brokers_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';

const HealthCheck: React.FC = () => {
  const { notifyError } = Notifications.useContext();
  const { brokersServiceClient } = PulsarGrpcClient.useContext();

  const { data: healthCheck, error: healthCheckError } = useSWR(
    swrKeys.pulsar.brokers.healthCheck._(),
    async () => {
      const req = new HealthCheckRequest();
      const res = await brokersServiceClient.healthCheck(req, {}).catch(err => console.log(`Failed to health check: ${err}`));
      if (res === undefined) {
        return false;
      }
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Failed to health check: ${res.getStatus()?.getMessage()}`);
        return false;
      }
      return res.getIsOk();
    },
    { refreshInterval: 1000 }
  );
  if (healthCheckError) {
    notifyError(`Unable to health check. ${healthCheckError}`);
  }

  const { data: backlogQuotaCheck, error: backlogQuotaCheckError } = useSWR(
    swrKeys.pulsar.brokers.backlogQuotaHealthCheck._(),
    async () => {
      const req = new HealthCheckRequest();
      const res = await brokersServiceClient.backlogQuotaCheck(req, {}).catch(err => console.log(`Failed to backlog quota check: ${err}`));
      if (res === undefined) {
        return false;
      }
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Failed to backlog quota check: ${res.getStatus()?.getMessage()}`);
        return false;
      }
      return res.getIsOk();
    },
    { refreshInterval: 1000 }
  );
  if (backlogQuotaCheckError) {
    notifyError(`Unable to backlog quota check. ${backlogQuotaCheckError}`);
  }

  return (
    <div className={s.InternalConfig}>
      <table className={sts.Table}>
        <tbody>
          <tr className={sts.Row}>
            <td className={sts.Cell}>Connection</td>
            <td className={sts.Cell}>{
              healthCheck ?
                <strong style={{ color: 'var(--accent-color-green)' }}>OK</strong> :
                <strong style={{ color: 'var(--accent-color-red)' }}>Fail</strong>
            }
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.Cell}>Backlog quota</td>
            <td className={sts.Cell}>{
              backlogQuotaCheck ?
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
