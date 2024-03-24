import React from "react";
import s from "./HealthCheck.module.css";
import sts from "../../../ui/SimpleTable/SimpleTable.module.css";
import * as HealthCheckContext from '../../../app/contexts/HealthCheckContext/HealthCheckContext';

const HealthCheck: React.FC = () => {
  const { healthCheckResult } = HealthCheckContext.useContext();

  return (
    <div className={s.InternalConfig}>
      <table className={sts.Table}>
        <tbody>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>Your browser ↔ Dekaf connection</td>
            <td className={sts.Cell}>
              {healthCheckResult.uiServerConnection === 'unknown' && <strong style={{ color: "var(--accent-color-yellow)" }}>Unknown</strong>}
              {healthCheckResult.uiServerConnection === 'ok' && <strong style={{ color: "var(--accent-color-green)" }}>OK</strong>}
              {healthCheckResult.uiServerConnection === 'failed' && <strong style={{ color: "var(--accent-color-red)" }}>Failed</strong>}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>Dekaf ↔ Pulsar broker connection</td>
            <td className={sts.Cell}>
              {healthCheckResult.brokerConnection === 'unknown' && <strong style={{ color: "var(--accent-color-yellow)" }}>Unknown</strong>}
              {healthCheckResult.brokerConnection === 'ok' && <strong style={{ color: "var(--accent-color-green)" }}>OK</strong>}
              {healthCheckResult.brokerConnection === 'failed' && <strong style={{ color: "var(--accent-color-red)" }}>Failed</strong>}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default HealthCheck;
