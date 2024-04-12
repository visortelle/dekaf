import React, {ReactNode} from 'react';
import * as s from './Statistics.module.css'
import * as st from '../../../ui/SimpleTable/SimpleTable.module.css';
import Td from '../../../ui/SimpleTable/Td';
import * as I18n from '../../../app/contexts/I18n/I18n';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import {PulsarTopicPersistency} from '../../../pulsar/pulsar-resources';
import KeyValueEditor, {recordToIndexedKv} from "../../../ui/KeyValueEditor/KeyValueEditor";
import FormLabel from "../../../ui/ConfigurationTable/FormLabel/FormLabel";
import * as pbUtils from "../../../../proto-utils/proto-utils";
import NoData from "../../../ui/NoData/NoData";

export type StatisticsProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicPersistency: PulsarTopicPersistency;
  subscription: string;
  subscriptionStats: pb.SubscriptionStats;
};

const Statistics: React.FC<StatisticsProps> = (props) => {
  const i18n = I18n.useContext();

  function renderTimestamp(timestamp: number | undefined): ReactNode | undefined {
    if (timestamp === 0) {
      return <NoData />;
    }

    if (timestamp === undefined) {
      return;
    }

    return i18n.withVoidDefault(new Date(timestamp), i18n.formatDateTime);
  }

  return (
    <div className={s.Statistics}>
      <table className={st.Table}>
        <tbody>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Msg Rate Out</td>
          <Td>{i18n.withVoidDefault(props.subscriptionStats.getMsgRateOut()?.getValue(), i18n.formatCountRate)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Msg rate redeliver</td>
          <Td>{i18n.withVoidDefault(props.subscriptionStats.getMsgRateRedeliver()?.getValue(), i18n.formatCountRate)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Message Ack rate</td>
          <Td>{i18n.withVoidDefault(props.subscriptionStats.getMessageAckRate()?.getValue(), i18n.formatCountRate)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Chunked Msg rate</td>
          <Td>{i18n.withVoidDefault(props.subscriptionStats.getChunkedMessageRate()?.getValue(), i18n.formatCountRate)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Msg Rate Expired</td>
          <Td>{i18n.withVoidDefault(props.subscriptionStats.getMsgRateExpired()?.getValue(), i18n.formatCountRate)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Total messages expired</td>
          <Td>{i18n.withVoidDefault(props.subscriptionStats.getTotalMsgExpired()?.getValue(), i18n.formatCount)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Last Expire Timestamp</td>
          <Td>{renderTimestamp(props.subscriptionStats.getLastExpireTimestamp()?.getValue())}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Last Consumed Timestamp</td>
          <Td>{renderTimestamp(props.subscriptionStats.getLastConsumedTimestamp()?.getValue())}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Last Consumed Flow Timestamp</td>
          <Td>{renderTimestamp(props.subscriptionStats.getLastConsumedFlowTimestamp()?.getValue())}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Last Acked Timestamp</td>
          <Td>{renderTimestamp(props.subscriptionStats.getLastAckedTimestamp()?.getValue())}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Last Mark Delete Advanced Timestamp</td>
          <Td>{renderTimestamp(props.subscriptionStats.getLastMarkDeleteAdvancedTimestamp()?.getValue())}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Msg Throughput Out</td>
          <Td>{i18n.withVoidDefault(props.subscriptionStats.getMsgThroughputOut()?.getValue(), i18n.formatBytesRate)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Backlog Size</td>
          <Td>{i18n.withVoidDefault(props.subscriptionStats.getBacklogSize()?.getValue(), i18n.formatBytes)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Messages in Backlog</td>
          <Td>{i18n.withVoidDefault(props.subscriptionStats.getMsgBacklog()?.getValue(), i18n.formatCount)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Messages in Backlog No Delayed</td>
          <Td>{i18n.withVoidDefault(props.subscriptionStats.getMsgBacklogNoDelayed()?.getValue(), i18n.formatCount)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Messages Delayed</td>
          <Td>{i18n.withVoidDefault(props.subscriptionStats.getMsgDelayed()?.getValue(), i18n.formatCount)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Bytes Out Counter</td>
          <Td>{i18n.withVoidDefault(props.subscriptionStats.getBytesOutCounter()?.getValue(), i18n.formatBytes)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Msg Out Counter</td>
          <Td>{i18n.withVoidDefault(props.subscriptionStats.getMsgOutCounter()?.getValue(), i18n.formatCount)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Unacked Messages</td>
          <Td>{i18n.withVoidDefault(props.subscriptionStats.getUnackedMessages()?.getValue(), i18n.formatCount)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Filter Processed Msg Count</td>
          <Td>{i18n.withVoidDefault(props.subscriptionStats.getFilterProcessedMsgCount()?.getValue(), i18n.formatCount)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Filter Accepted Msg Count</td>
          <Td>{i18n.withVoidDefault(props.subscriptionStats.getFilterAcceptedMsgCount()?.getValue(), i18n.formatCount)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Filter Rejected Msg Count</td>
          <Td>{i18n.withVoidDefault(props.subscriptionStats.getFilterRejectedMsgCount()?.getValue(), i18n.formatCount)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Filter Rescheduled Msg Count</td>
          <Td>{i18n.withVoidDefault(props.subscriptionStats.getFilterRescheduledMsgCount()?.getValue(), i18n.formatCount)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Active consumer name</td>
          <td
            className={st.Cell}>{i18n.withVoidDefault(props.subscriptionStats.getActiveConsumerName()?.getValue(), (x) => x)}</td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Earliest Msg Publish Time In Backlogs</td>
          <Td>
            {i18n.withVoidDefault(props.subscriptionStats.getEarliestMsgPublishTimeInBacklog()?.getValue() || undefined, (v) => i18n.formatDateTime(new Date(v)))}
          </Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Is Blocked Subscription On Unacked Msgs</td>
          <Td>
            {i18n.withVoidDefault(props.subscriptionStats.getIsBlockedSubscriptionOnUnackedMsgs()?.getValue(), i18n.formatBoolean)}
          </Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Non Contiguous Deleted Messages Range</td>
          <Td>{i18n.withVoidDefault(props.subscriptionStats.getNonContiguousDeletedMessagesRanges()?.getValue(), v => v)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Last Contiguous Deleted Messages Ranges Serialized Size</td>
          <Td>{i18n.withVoidDefault(props.subscriptionStats.getNonContiguousDeletedMessagesRangesSerializedSize()?.getValue(), i18n.formatBytes)}</Td>
        </tr>
        <tr className={st.Row}>
          <td className={st.HighlightedCell}>Delayed Message Index Size In Bytes</td>
          <Td>{i18n.withVoidDefault(props.subscriptionStats.getDelayedMessageIndexSizeInBytes()?.getValue(), i18n.formatBytes)}</Td>
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
          value={recordToIndexedKv(pbUtils.mapToObject(props.subscriptionStats.getConsumersAfterMarkDeletePositionMap()))}
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