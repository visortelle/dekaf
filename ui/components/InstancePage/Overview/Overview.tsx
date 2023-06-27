import React from "react";
import InternalConfig from "./InternalConfig/InternalConfig";
import HealthCheck from "./HealthCheck/HealthCheck";
import Clusters from "./Clusters/Clusters";
import * as AppContext from '../../app/contexts/AppContext';
import s from "./Overview.module.css";
import Ui from "./Ui/Ui";
import sts from "../../ui/SimpleTable/SimpleTable.module.css";
import { H2 } from "../../ui/H/H";
import * as HealthCheckContext from '../../app/contexts/HealthCheckContext/HealthCheckContext';
import NoData from "../../ui/NoData/NoData";

const Overview: React.FC = () => {
  const { config } = AppContext.useContext();
  const { brokerVersion } = HealthCheckContext.useContext();

  return (
    <div className={s.Overview}>
      <div className={s.LeftPane}>
        <div className={s.Section}>
          <div className={s.SubSection}>
            <Ui />
          </div>

          <div className={s.SubSection}>
            <HealthCheck />
          </div>
        </div>

        <div className={s.Section}>
          <div className={s.SectionHeader}>
            <H2>Pulsar Instance</H2>
          </div>
          <table className={sts.Table}>
            <tbody>
              <tr className={sts.Row}>
                <td className={sts.HighlightedCell}>Instance Name</td>
                <td className={sts.Cell}>{config?.pulsarInstance.name}</td>
              </tr>
              <tr className={sts.Row}>
                <td className={sts.HighlightedCell}>Broker Version</td>
                <td className={sts.Cell}>{brokerVersion || <NoData />}</td>
              </tr>
              <tr className={sts.Row}>
                <td className={sts.HighlightedCell}>Broker Service URL</td>
                <td className={sts.Cell}>
                  {config.pulsarInstance.brokerServiceUrl}
                </td>
              </tr>
              <tr className={sts.Row}>
                <td className={sts.HighlightedCell}>Web Service URL</td>
                <td className={sts.Cell}>
                  {config.pulsarInstance.webServiceUrl}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className={s.Section}>
          <div className={s.SectionHeader}>
            <H2>Internal Broker Configuration</H2>
          </div>
          <InternalConfig />
        </div>

        <div className={s.Section}>
          <div className={s.SectionHeader}>
            <H2>Clusters</H2>
          </div>
          <Clusters />
        </div>
      </div>

    </div>
  );
};

export default Overview;
