import React from "react";
import {PulsarTopicPersistency} from "../../pulsar/pulsar-resources";
import s from "./Overview.module.css";
import * as st from '../../ui/SimpleTable/SimpleTable.module.css';
import SubscriptionPropertiesEditor from "./SubscriptionPropertiesEditor/SubsctiptionPropertiesEditor";
import Statistics from "./Statistics/Statistics";
import NothingToShow from "../../ui/NothingToShow/NothingToShow";
import useSWR from "swr";
import {swrKeys} from "../../swrKeys";
import * as pb from "../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb";
import {Code} from "../../../grpc-web/google/rpc/code_pb";
import * as Notifications from "../../app/contexts/Notifications";
import * as GrpcClient from "../../app/contexts/GrpcClient/GrpcClient";
import Td from "../../ui/SimpleTable/Td";
import Link from "../../ui/Link/Link";
import {routes} from "../../routes";
import * as I18n from "../../app/contexts/I18n/I18n";
import ExpireMessagesModal from "./ExpireMessages/ExpireMessages";
import SkipMessagesModal from "./SkipMessages/SkipMessages";
import ResetCursorModal from "./ResetCursor/ResetCursor";
import * as Modals from "../../app/contexts/Modals/Modals";
import ActionButton from "../../ui/ActionButton/ActionButton";
import Tabs from "../../ui/Tabs/Tabs";

type OverviewProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicPersistency: PulsarTopicPersistency;
  subscription: string;
  isPartitionedTopic: boolean | undefined;
}

type TabKey = 'stats'

const Overview: React.FC<OverviewProps> = (props) => {
  const modals = Modals.useContext();
  const {topicServiceClient} = GrpcClient.useContext();
  const i18n = I18n.useContext();
  const {notifyError} = Notifications.useContext();

  const topicFqn = `${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`;

  const {data: subscriptionStats, error: subscriptionStatsError, isLoading: isLoading} = useSWR(
    swrKeys.pulsar.customApi.metrics.subscriptionStats._(props.subscription),
    async () => {
      const getIsPartitionedTopic = async () => {
        const req = new pb.GetIsPartitionedTopicRequest();
        req.setTopicFqn(topicFqn);

        const res = await topicServiceClient.getIsPartitionedTopic(req, null)
          .catch(err => notifyError(`Unable to get topic partitioning: ${err}`));

        if (res === undefined) {
          return;
        }

        if (res.getStatus()?.getCode() !== Code.OK) {
          notifyError(`Unable to get topic partitioning: ${res.getStatus()?.getMessage()}`)
          return;
        }

        return res.getIsPartitioned()
      }

      const isPartitioned = await getIsPartitionedTopic();

      if (isPartitioned === undefined) {
        return;
      }

      const req = new pb.GetSubscriptionStatsRequest();
      req.setTopicFqn(topicFqn);
      req.setSubscriptionName(props.subscription);
      req.setIsPartitionedTopic(isPartitioned);

      req.setIsGetPreciseBacklog(true);
      req.setIsEarliestTimeInBacklog(true);
      req.setIsSubscriptionBacklogSize(true);

      const res = await topicServiceClient.getSubscriptionStats(req, {})
        .catch((err) => notifyError(`Unable to get subscription stats. ${err}`));

      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get subscription stats. ${res.getStatus()?.getMessage()}`);
        return;
      }

      return res.getSubscriptionStats();
    },
    {refreshInterval: 5_000}
  )

  if (subscriptionStatsError !== undefined) {
    notifyError(`Unable to get topic stats. ${subscriptionStatsError}`);
  }

  if (subscriptionStats === undefined || props.isPartitionedTopic === undefined) {
    return (
      <div className={s.NothingToShow}>
        <NothingToShow reason={isLoading ? 'loading-in-progress' : 'no-items-found'}/>
      </div>
    );
  }

  return (
    <div className={s.Overview}>
      <div className={s.LeftPanel}>
        <div className={s.MainStatistics}>
          <table className={st.Table} style={{width: '100%'}}>
            <tbody>
            <tr>
              <td className={st.HighlightedCell}>Subscription Name</td>
              <Td>{props.subscription}</Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Type</td>
              <Td style={{minWidth: '120rem'}}>
                {i18n.withVoidDefault(subscriptionStats.getType()?.getValue(), (v) => v)}
              </Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Consumers</td>
              <Td>{
                i18n.withVoidDefault(subscriptionStats.getConsumersList().length, v => (
                  <Link
                    to={routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.subscriptions.subscription.consumers._.get({
                      tenant: props.tenant,
                      namespace: props.namespace,
                      topic: props.topic,
                      topicPersistency: props.topicPersistency,
                      subscription: props.subscription
                    })}
                  >
                    {v}
                  </Link>
                ))}
              </Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Is Durable</td>
              <Td>{i18n.withVoidDefault(subscriptionStats.getIsDurable()?.getValue(), i18n.formatBoolean)}</Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Is Replicated</td>
              <Td>{i18n.withVoidDefault(subscriptionStats.getIsReplicated()?.getValue(), i18n.formatBoolean)}</Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Is Allow Out Of Order Delivery</td>
              <Td>{i18n.withVoidDefault(subscriptionStats.getIsAllowOutOfOrderDelivery()?.getValue(), i18n.formatBoolean)}</Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Key Shared Mode</td>
              <Td>{i18n.withVoidDefault(subscriptionStats.getKeySharedMode()?.getValue(), (x) => x)}</Td>
            </tr>
            </tbody>
          </table>
        </div>

        <div className={s.ActionsWrapper}>
          <div className={s.ActionButtons}>
            <ActionButton
              buttonProps={{
                text: 'Expire Messages',
              }}
              title={'Expire Messages'}
              testId={'expire-subscription-messages-button'}
              onClick={() =>
                modals.push({
                  id: 'expire-messages',
                  title: 'Expire Messages',
                  styleMode: 'no-content-padding',
                  content:
                    <ExpireMessagesModal
                      tenant={props.tenant}
                      namespace={props.namespace}
                      topic={props.topic}
                      topicPersistency={props.topicPersistency}
                      subscription={props.subscription}
                      isPartitionedTopic={props.isPartitionedTopic!}
                    />,
                })}
             action={{type: 'predefined', action: 'without-icon'}}
            />
            <ActionButton
              buttonProps={{
                text: 'Skip Messages',
              }}
              title={'Skip Messages'}
              testId={'skip-subscription-messages-button'}
              onClick={() =>
                modals.push({
                  id: 'skip-messages',
                  title: 'Skip Messages',
                  styleMode: 'no-content-padding',
                  content:
                    <SkipMessagesModal
                      tenant={props.tenant}
                      namespace={props.namespace}
                      topic={props.topic}
                      topicPersistency={props.topicPersistency}
                      subscription={props.subscription}
                      isPartitionedTopic={props.isPartitionedTopic!}
                    />,
                })}
              action={{type: 'predefined', action: 'without-icon'}}
            />
            <ActionButton
              buttonProps={{
                text: 'Reset Cursor',
              }}
              title={'Reset Cursor'}
              testId={'reset-subscription-cursor-button'}
              onClick={() =>
                modals.push({
                  id: 'reset-cursor',
                  title: 'Reset Cursor',
                  styleMode: 'no-content-padding',
                  content:
                    <ResetCursorModal
                      tenant={props.tenant}
                      namespace={props.namespace}
                      topic={props.topic}
                      topicPersistency={props.topicPersistency}
                      subscription={props.subscription}
                      isPartitionedTopic={props.isPartitionedTopic!}
                    />,
                })}
              action={{type: 'predefined', action: 'without-icon'}}
            />
          </div>
        </div>

        <div className={s.SubscriptionPropertiesWrapper}>
          <SubscriptionPropertiesEditor
            tenant={props.tenant}
            namespace={props.namespace}
            topic={props.topic}
            topicPersistency={props.topicPersistency}
            subscription={props.subscription}
          />
        </div>

        <Tabs<TabKey>
          activeTab={'stats'}
          onActiveTabChange={() => {}}
          tabs={[
            {
              key: 'stats',
              title: 'Statistics',
              render: () => (
                <div className={s.Tab}>
                  <Statistics
                    tenant={props.tenant}
                    namespace={props.namespace}
                    topic={props.topic}
                    topicPersistency={props.topicPersistency}
                    subscription={props.subscription}
                    subscriptionStats={subscriptionStats}
                  />
                </div>
              )
            }
          ]}
        />
      </div>

      <div className={s.RightPanel}>

      </div>
    </div>
  );
}

export default Overview;