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
import LibrarySidebar from "../../ui/LibrarySidebar/LibrarySidebar";

const Overview: React.FC = () => {
  const { config } = AppContext.useContext();
  const { brokerVersion } = HealthCheckContext.useContext();

  return (
    <div className={s.Overview}>
      <div className={s.LeftPanel}>
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
            <H2 help={(
              <>
                <p>
                  Pulsar <strong>Instance</strong> is a set of connected Pulsar <strong>Clusters</strong>.
                  <br />
                  You may need the setup with more than one <strong>Cluster</strong> if you want to use Pulsar <strong>Geo-Replication</strong> feature.
                </p>
                <p>
                  A <strong>Cluster</strong> is a set of connected <strong>Brokers</strong> (compute nodes) and <strong>Bookies</strong> (storage nodes).
                  <br />
                  Additionally, <strong>Cluster</strong> can have a <strong>Proxy</strong> (load balancer) and <strong>Function Workers</strong> (compute nodes for running functions).
                </p>
              </>
            )}>
              Pulsar Instance
            </H2>
          </div>
          <table className={sts.Table}>
            <tbody>
              <tr className={sts.Row}>
                <td className={sts.HighlightedCell}>Instance Name</td>
                <td className={sts.Cell}>{config?.pulsarName}</td>
              </tr>
              <tr className={sts.Row}>
                <td className={sts.HighlightedCell}>Broker Version</td>
                <td className={sts.Cell}>{brokerVersion || <NoData />}</td>
              </tr>
              <tr className={sts.Row}>
                <td className={sts.HighlightedCell}>Broker Service URL</td>
                <td className={sts.Cell}>
                  {config.pulsarBrokerUrl}
                </td>
              </tr>
              <tr className={sts.Row}>
                <td className={sts.HighlightedCell}>Web Service URL</td>
                <td className={sts.Cell}>
                  {config.pulsarWebUrl}
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

      <div className={s.RightPanel}>
        <LibrarySidebar
          libraryContext={{
            pulsarResource: {
              type: "instance"
            }
          }}
        />
      </div>
    </div>
  );
};

export default Overview;
