import React, {useEffect} from "react";
import InternalConfig from "./InternalConfig/InternalConfig";
import HealthCheck from "./HealthCheck/HealthCheck";
import Clusters from "./Clusters/Clusters";
import * as AppContext from '../../app/contexts/AppContext';
import s from "./Overview.module.css";
import Ui from "./Ui/Ui";
import sts from "../../ui/SimpleTable/SimpleTable.module.css";
import stt from '../../ui/Tabs/Tabs.module.css';
import { H2 } from "../../ui/H/H";
import * as HealthCheckContext from '../../app/contexts/HealthCheckContext/HealthCheckContext';
import NoData from "../../ui/NoData/NoData";
import * as GrpcClient from "../../app/contexts/GrpcClient/GrpcClient";
import {GetInstanceMarkdownRequest} from "../../../grpc-web/tools/teal/pulsar/ui/markdown/v1/markdown_pb";
import {Code} from "../../../grpc-web/google/rpc/code_pb";
import NothingToShow from "../../ui/NothingToShow/NothingToShow";
import * as Notifications from "../../app/contexts/Notifications";
import Markdown from "../../ui/Markdown/Markdown";


const Overview: React.FC = () => {
  const { config } = AppContext.useContext();
  const { brokerVersion } = HealthCheckContext.useContext();
  const {notifyError} = Notifications.useContext();
  const [ clusters, setClusters ] = React.useState<string[] | undefined>()
  const [ isClustersLoading, setIsClustersLoading ] = React.useState<boolean>(false)
  const [activeClusterTab, setActiveClusterTab] = React.useState<string>("");
  const {markdownServiceClient} = GrpcClient.useContext();
  const [markdownData, setMarkdownData] = React.useState<string>('');

  useEffect(() => {
    const fetchMarkdownData = async (cluster: string) => {
      const req = new GetInstanceMarkdownRequest();
      req.setInstanceUrl(config.pulsarInstance.webServiceUrl);
      req.setClusterName(cluster);

      const res = await markdownServiceClient.getInstanceMarkdown(req, null)
        .catch(err => notifyError(`Unable to get cluster markdown. ${err.getMessage()}`));

      if (res === undefined) {
        return "";
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get cluster markdown. ${res.getStatus()?.getMessage()}`);
        return "";
      }

      return res.getMarkdown();
    };

    activeClusterTab &&
      fetchMarkdownData(activeClusterTab).then(markdown => {
        setMarkdownData(markdown.toString());
      });
  }, [activeClusterTab]);

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
          <Clusters
            setClusters={setClusters}
            setIsLoading={setIsClustersLoading}
            setActiveTab={setActiveClusterTab}
          />
        </div>
      </div>

      <div className={s.RightPane}>
        <div className={s.MarkdownTitle}>Markdown</div>
        {
          (!isClustersLoading && clusters) ? (
            <div className={stt.Tabs}>
              <div className={stt.TabsList}>
                {clusters.map(tabKey => {
                  return (
                    <div
                      key={tabKey}
                      className={`${stt.Tab} ${tabKey === activeClusterTab ? stt.ActiveTab : ''}`}
                      onClick={() => setActiveClusterTab(tabKey)}
                    >
                      <div>{tabKey}</div>
                    </div>
                  );
                })}
              </div>
              <div className={stt.TabContent}>
                <Markdown markdown={markdownData} />
              </div>
            </div>
          ) : (
            <NothingToShow reason={'no-items-found'}/>
          )
        }
      </div>
    </div>
  );
};

export default Overview;
