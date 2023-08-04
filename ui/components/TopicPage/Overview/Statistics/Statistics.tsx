import React, {useCallback} from 'react';
import * as s from './Statistics.module.css'
import * as st from '../../../ui/SimpleTable/SimpleTable.module.css';
import Td from '../../../ui/SimpleTable/Td';
import { routes } from '../../../routes';
import * as I18n from '../../../app/contexts/I18n/I18n';
import Link from '../../../ui/Link/Link';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import {SubscriptionStats} from "../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb";
import * as Notifications from "../../../app/contexts/Notifications";

export type StatisticsProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicType: "persistent" | "non-persistent";
  topicsStatsRes: pb.GetTopicsStatsResponse;
};

const Statistics: React.FC<StatisticsProps> = (props) => {
  const topicFqn = `${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`;
  const i18n = I18n.useContext();
  const { notifyError } = Notifications.useContext();
  const topicStats = props.topicsStatsRes.getTopicStatsMap().get(topicFqn) || props.topicsStatsRes.getPartitionedTopicStatsMap().get(topicFqn)?.getStats();

  const getConsumersCount = useCallback(() => {
    let consumersCount = 0;

    if (topicStats) {
        topicStats.getSubscriptionsMap().forEach((entry, _) => {
            consumersCount += entry.getConsumersList().length
        })
    } else {
        notifyError('Unable to count consumers count.');
    }

    return consumersCount;
  }, [topicStats]);

  return (
    <div className={s.Statistics}>
      <table className={st.Table}>
        <tbody>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Subscriptions</td>
            <Td style={{ minWidth: '100rem' }}>{i18n.withVoidDefault(topicStats?.getSubscriptionsMap()?.getLength(), v => (
              <Link
                to={routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.subscriptions._.get({
                  tenant: props.tenant,
                  namespace: props.namespace,
                  topic: props.topic,
                  topicType: props.topicType,
                })}
              >
                {v}
              </Link>
            ))}
            </Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Producers</td>
            <Td>{
              i18n.withVoidDefault(topicStats?.getPublishersList()?.length, v => (
                <Link
                  to={routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.producers._.get({
                    tenant: props.tenant,
                    namespace: props.namespace,
                    topic: props.topic,
                    topicType: props.topicType,
                  })}
                >
                  {v}
                </Link>
              ))}
            </Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Consumers</td>
            <Td>{i18n.withVoidDefault(getConsumersCount(), i18n.formatCountRate)}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Msg Rate In</td>
            <Td>{i18n.withVoidDefault(topicStats?.getMsgRateIn()?.getValue(), i18n.formatCountRate)}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Msg Rate Out</td>
            <Td>{i18n.withVoidDefault(topicStats?.getMsgRateOut()?.getValue(), i18n.formatCountRate)}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Msg Throughput In</td>
            <Td>{i18n.withVoidDefault(topicStats?.getMsgThroughputIn()?.getValue(), i18n.formatBytesRate)}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Msg Throughput Out</td>
            <Td>{i18n.withVoidDefault(topicStats?.getMsgThroughputOut()?.getValue(), i18n.formatBytesRate)}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Storage Size</td>
            <Td>{i18n.withVoidDefault(topicStats?.getStorageSize()?.getValue(), i18n.formatBytes)}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Backlog Size</td>
            <Td>{i18n.withVoidDefault(topicStats?.getBacklogSize()?.getValue(), i18n.formatBytes)}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Bytes In Counter</td>
            <Td>{i18n.withVoidDefault(topicStats?.getBytesInCounter()?.getValue(), i18n.formatBytes)}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Bytes Out Counter</td>
            <Td>{i18n.withVoidDefault(topicStats?.getBytesOutCounter()?.getValue(), i18n.formatBytes)}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Msg In Counter</td>
            <Td>{i18n.withVoidDefault(topicStats?.getMsgInCounter()?.getValue(), i18n.formatCount)}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Msg Out Counter</td>
            <Td>{i18n.withVoidDefault(topicStats?.getMsgOutCounter()?.getValue(), i18n.formatCount)}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Average Msg Size</td>
            <Td>{i18n.withVoidDefault(topicStats?.getAverageMsgSize()?.getValue(), i18n.formatBytes)}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Is Msg Chunk Published</td>
            <td className={st.Cell}>{i18n.withVoidDefault(topicStats?.getIsMsgChunkPublished()?.getValue(), i18n.formatBoolean)}</td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Earliest Msg Publish Time In Backlogs</td>
            <Td>
              {i18n.withVoidDefault(topicStats?.getEarliestMsgPublishTimeInBacklogs()?.getValue() || undefined, (v) => i18n.formatDateTime(new Date(v)))}
            </Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Offloaded Storage Size</td>
            <Td>{i18n.withVoidDefault(topicStats?.getOffloadedStorageSize()?.getValue(), i18n.formatBytes)}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Waiting Publishers</td>
            <Td>{i18n.withVoidDefault(topicStats?.getWaitingPublishers()?.getValue(), v => v)}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Replicators</td>
            <Td>{i18n.withVoidDefault(topicStats?.getReplicationMap()?.getLength(), v => v)}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Deduplication Status</td>
            <Td>{i18n.withVoidDefault(topicStats?.getDeduplicationStatus()?.getValue(), v => v)}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Topic Epoch</td>
            <Td>{i18n.withVoidDefault(topicStats?.getTopicEpoch()?.getValue(), v => v)}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Non Contiguous Deleted Messages Range</td>
            <Td>{i18n.withVoidDefault(topicStats?.getNonContiguousDeletedMessagesRanges()?.getValue(), v => v)}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Last Contiguous Deleted Messages Ranges Serialized Size</td>
            <Td>{i18n.withVoidDefault(topicStats?.getNonContiguousDeletedMessagesRangesSerializedSize()?.getValue(), i18n.formatBytes)}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Last Compaction Removed Event Count</td>
            <Td>{i18n.withVoidDefault(topicStats?.getCompaction()?.getLastCompactionRemovedEventCount()?.getValue(), v => v)}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Last Compaction Succeed Timestamp</td>
            <Td>{i18n.withVoidDefault(topicStats?.getCompaction()?.getLastCompactionSucceedTimestamp()?.getValue() || undefined, (v) => i18n.formatDateTime(new Date(v)))}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Last Compaction Failed Timestamp</td>
            <Td>{i18n.withVoidDefault(topicStats?.getCompaction()?.getLastCompactionFailedTimestamp()?.getValue() || undefined, (v) => i18n.formatDateTime(new Date(v)))}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Last Compaction Duration Time</td>
            <Td>{i18n.withVoidDefault(topicStats?.getCompaction()?.getLastCompactionDurationTimeInMills()?.getValue() || undefined, i18n.formatDuration)}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Owner Broker</td>
            <Td>{i18n.withVoidDefault(topicStats?.getOwnerBroker()?.getValue(), v => v)}</Td>
          </tr>
          <tr className={st.Row}>
            <td className={st.HighlightedCell}>Delayed Message Index Size In Bytes</td>
            <Td>{i18n.withVoidDefault(topicStats?.getDelayedMessageIndexSizeInBytes()?.getValue(), i18n.formatBytes)}</Td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default Statistics;


