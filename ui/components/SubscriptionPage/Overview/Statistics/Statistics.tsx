import React from 'react';
import * as s from './Statistics.module.css'
import * as st from '../../../ui/SimpleTable/SimpleTable.module.css';
import Td from '../../../ui/SimpleTable/Td';
import {routes} from '../../../routes';
import * as I18n from '../../../app/contexts/I18n/I18n';
import Link from '../../../ui/Link/Link';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import {PulsarTopicPersistency} from '../../../pulsar/pulsar-resources';
import useSWR from "swr";
import {swrKeys} from "../../../swrKeys";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import * as Notifications from "../../../app/contexts/Notifications";
import {Code} from "../../../../grpc-web/google/rpc/code_pb";
import NothingToShow from "../../../ui/NothingToShow/NothingToShow";
import KeyValueEditor, {recordToIndexedKv} from "../../../ui/KeyValueEditor/KeyValueEditor";
import FormLabel from "../../../ui/ConfigurationTable/FormLabel/FormLabel";
import * as pbUtils from "../../../../proto-utils/proto-utils";

export type StatisticsProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicPersistency: PulsarTopicPersistency;
  subscription: string;
};

const Statistics: React.FC<StatisticsProps> = (props) => {
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

  if (subscriptionStats === undefined) {
    return (
      <div className={s.NothingToShow}>
        <NothingToShow reason={isLoading ? 'loading-in-progress' : 'no-items-found'}/>
      </div>
    );
  }

  return (
    <div className={s.Statistics}>
      <table className={st.Table}>
        <tbody>
        <tr>
          <td className={st.HighlightedCell}>Subscription Name:</td>
          <Td>{props.subscription}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Type</td>
          <Td style={{minWidth: '100rem'}}>
            {i18n.withVoidDefault(subscriptionStats?.getType()?.getValue(), (v) => v)}
          </Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Consumers</td>
          <Td>{
            i18n.withVoidDefault(subscriptionStats?.getConsumersList().length, v => (
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
          <Td>{i18n.withVoidDefault(subscriptionStats?.getIsDurable()?.getValue(), i18n.formatBoolean)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Is Replicated</td>
          <Td>{i18n.withVoidDefault(subscriptionStats?.getIsReplicated()?.getValue(), i18n.formatBoolean)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Is Allow Out Of Order Delivery</td>
          <Td>{i18n.withVoidDefault(subscriptionStats?.getIsAllowOutOfOrderDelivery()?.getValue(), i18n.formatBoolean)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Key Shared Mode</td>
          <Td>{i18n.withVoidDefault(subscriptionStats?.getKeySharedMode()?.getValue(), (x) => x)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Msg Rate Out</td>
          <Td>{i18n.withVoidDefault(subscriptionStats?.getMsgRateOut()?.getValue(), i18n.formatCountRate)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Msg rate redeliver</td>
          <Td>{i18n.withVoidDefault(subscriptionStats?.getMsgRateRedeliver()?.getValue(), i18n.formatCountRate)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Message Ack rate</td>
          <Td>{i18n.withVoidDefault(subscriptionStats?.getMessageAckRate()?.getValue(), i18n.formatCountRate)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Chunked Msg rate</td>
          <Td>{i18n.withVoidDefault(subscriptionStats?.getChunkedMessageRate()?.getValue(), i18n.formatCountRate)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Msg Rate Expired</td>
          <Td>{i18n.withVoidDefault(subscriptionStats.getMsgRateExpired()?.getValue(), i18n.formatCountRate)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Total messages expired</td>
          <Td>{i18n.withVoidDefault(subscriptionStats.getTotalMsgExpired()?.getValue(), i18n.formatCount)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Last Expire Timestamp</td>
          <Td>{i18n.withVoidDefault(
            subscriptionStats.getLastExpireTimestamp()?.getValue(),
            (v) => `${i18n.formatLongNumber(v)} (${i18n.formatDateTime(new Date(v))})`
          )}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Last Consumed Timestamp</td>
          <Td>{i18n.withVoidDefault(
            subscriptionStats.getLastConsumedTimestamp()?.getValue(),
            (v) => `${i18n.formatLongNumber(v)} (${i18n.formatDateTime(new Date(v))})`
          )}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Last Consumed Flow Timestamp</td>
          <Td>{i18n.withVoidDefault(
            subscriptionStats.getLastConsumedFlowTimestamp()?.getValue(),
            (v) => `${i18n.formatLongNumber(v)} (${i18n.formatDateTime(new Date(v))})`
          )}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Last Acked Timestamp</td>
          <Td>{i18n.withVoidDefault(
            subscriptionStats.getLastAckedTimestamp()?.getValue(),
            (v) => `${i18n.formatLongNumber(v)} (${i18n.formatDateTime(new Date(v))})`
          )}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Last Mark Delete Advanced Timestamp</td>
          <Td>{i18n.withVoidDefault(
            subscriptionStats.getLastMarkDeleteAdvancedTimestamp()?.getValue(),
            (v) => `${i18n.formatLongNumber(v)} (${i18n.formatDateTime(new Date(v))})`
          )}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Msg Throughput Out</td>
          <Td>{i18n.withVoidDefault(subscriptionStats?.getMsgThroughputOut()?.getValue(), i18n.formatBytesRate)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Backlog Size</td>
          <Td>{i18n.withVoidDefault(subscriptionStats?.getBacklogSize()?.getValue(), i18n.formatBytes)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Messages in Backlog</td>
          <Td>{i18n.withVoidDefault(subscriptionStats?.getMsgBacklog()?.getValue(), i18n.formatCount)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Messages in Backlog No Delayed</td>
          <Td>{i18n.withVoidDefault(subscriptionStats?.getMsgBacklogNoDelayed()?.getValue(), i18n.formatCount)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Messages Delayed</td>
          <Td>{i18n.withVoidDefault(subscriptionStats?.getMsgDelayed()?.getValue(), i18n.formatCount)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Bytes Out Counter</td>
          <Td>{i18n.withVoidDefault(subscriptionStats?.getBytesOutCounter()?.getValue(), i18n.formatBytes)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Msg Out Counter</td>
          <Td>{i18n.withVoidDefault(subscriptionStats?.getMsgOutCounter()?.getValue(), i18n.formatCount)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Unacked Messages</td>
          <Td>{i18n.withVoidDefault(subscriptionStats?.getUnackedMessages()?.getValue(), i18n.formatCount)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Filter Processed Msg Count</td>
          <Td>{i18n.withVoidDefault(subscriptionStats?.getFilterProcessedMsgCount()?.getValue(), i18n.formatCount)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Filter Accepted Msg Count</td>
          <Td>{i18n.withVoidDefault(subscriptionStats?.getFilterAcceptedMsgCount()?.getValue(), i18n.formatCount)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Filter Rejected Msg Count</td>
          <Td>{i18n.withVoidDefault(subscriptionStats?.getFilterRejectedMsgCount()?.getValue(), i18n.formatCount)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Filter Rescheduled Msg Count</td>
          <Td>{i18n.withVoidDefault(subscriptionStats?.getFilterRescheduledMsgCount()?.getValue(), i18n.formatCount)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Active consumer name</td>
          <td
            className={st.Cell}>{i18n.withVoidDefault(subscriptionStats?.getActiveConsumerName()?.getValue(), (x) => x)}</td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Earliest Msg Publish Time In Backlogs</td>
          <Td>
            {i18n.withVoidDefault(subscriptionStats?.getEarliestMsgPublishTimeInBacklog()?.getValue() || undefined, (v) => i18n.formatDateTime(new Date(v)))}
          </Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Is Blocked Subscription On Unacked Msgs</td>
          <Td>
            {i18n.withVoidDefault(subscriptionStats?.getIsBlockedSubscriptionOnUnackedMsgs()?.getValue(), i18n.formatBoolean)}
          </Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Non Contiguous Deleted Messages Range</td>
          <Td>{i18n.withVoidDefault(subscriptionStats?.getNonContiguousDeletedMessagesRanges()?.getValue(), v => v)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Last Contiguous Deleted Messages Ranges Serialized Size</td>
          <Td>{i18n.withVoidDefault(subscriptionStats?.getNonContiguousDeletedMessagesRangesSerializedSize()?.getValue(), i18n.formatBytes)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Delayed Message Index Size In Bytes</td>
          <Td>{i18n.withVoidDefault(subscriptionStats?.getDelayedMessageIndexSizeInBytes()?.getValue(), i18n.formatBytes)}</Td>
        </tr>
        </tbody>
      </table>
      <div className={s.ConsumersAfterMarkDeletePositionWrapper}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4rem'}}>
          <FormLabel
            content="Consumers After Mark Delete Position"
            help={(
              <div>
                This is for Key_Shared subscription to get the recentJoinedConsumers in the Key_Shared subscription.
              </div>
            )}
          />
        </div>

        <KeyValueEditor
          value={recordToIndexedKv(pbUtils.mapToObject(subscriptionStats.getConsumersAfterMarkDeletePositionMap()))}
          onChange={v => v}
          height="300rem"
          testId="consumers-after-mark-delete-position-map"
          mode={'readonly'}
        />
      </div>
    </div>
  );
}

export default Statistics;