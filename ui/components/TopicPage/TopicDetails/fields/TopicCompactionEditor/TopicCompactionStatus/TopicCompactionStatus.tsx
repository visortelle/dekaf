import React from 'react';
import s from './TopicCompactionStatus.module.css'
import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import * as GrpcClient from '../../../../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../../../app/contexts/Notifications';
import * as st from '../../../../../ui/SimpleTable/SimpleTable.module.css';
import Td from '../../../../../ui/SimpleTable/Td';
import * as I18n from '../../../../../app/contexts/I18n/I18n';
import useSWR, { mutate } from 'swr';
import { swrKeys } from '../../../../../swrKeys';
import { Code } from '../../../../../../grpc-web/google/rpc/code_pb';
import NoData from '../../../../../ui/NoData/NoData';
import { longRunningProcessStatusFromPb } from '../../../../../pulsar/LongRunningProcessStatus';
import SmallButton from '../../../../../ui/SmallButton/SmallButton';
import ActionButton from '../../../../../ui/ActionButton/ActionButton';
import NothingToShow from '../../../../../ui/NothingToShow/NothingToShow';
import Ledgers from '../../../../Overview/InternalStatistics/PersistentTopicInternalStats/ManagedLedgerInternalStats/Ledgers/Ledgers';

export type TopicCompactionStatusProps = {
  topicFqn: string,
};

const TopicCompactionStatus: React.FC<TopicCompactionStatusProps> = (props) => {
  const i18n = I18n.useContext();
  const { topicServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();

  const statusKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.topic.topicCompactionStatus({ topicFqn: props.topicFqn });
  const { data: status, error: statusError } = useSWR(
    statusKey,
    async () => {
      const req = new pb.GetCompactionStatusRequest();
      req.setTopicFqn(props.topicFqn);

      const res = await topicServiceClient.getCompactionStatus(req, {})
        .catch(err => notifyError(`Can't get topic compaction status. ${err}`));

      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Can't get topic compaction status. ${res.getStatus()?.getMessage()}`);
        return undefined;
      }

      return longRunningProcessStatusFromPb(res.getProcessStatus()!);
    },
    { refreshInterval: 5_000 }
  );

  if (statusError) {
    notifyError(`Can't get topic compaction status: ${statusError}`);
  }

  const statsKey = swrKeys.pulsar.customApi.metrics.topicsStats._([props.topicFqn]).concat(['-compaction-status']);
  const { data: stats, error: statsError, isLoading: isStatsLoading } = useSWR(
    statsKey,
    async () => {
      const req = new pb.GetTopicsStatsRequest();

      req.setIsGetPreciseBacklog(true);
      req.setIsEarliestTimeInBacklog(true);
      req.setIsSubscriptionBacklogSize(true);
      req.setIsPerPartition(false);

      req.setTopicsList([props.topicFqn]);
      req.setPartitionedTopicsList([props.topicFqn]);

      const res = await topicServiceClient.getTopicsStats(req, null)
        .catch((err) => notifyError(`Unable to get topic properties. ${err}`));

      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get topic stats. ${res.getStatus()?.getMessage()}`);
        return;
      }

      return res.getTopicStatsMap().get(props.topicFqn) || res.getPartitionedTopicStatsMap().get(props.topicFqn)?.getStats();
    },
    { refreshInterval: 5_000 }
  );

  if (statsError !== undefined) {
    notifyError(`Unable to get topic stats. ${statsError}`);
  }

  const internalStatsKey = swrKeys.pulsar.customApi.metrics.topicsInternalStats._([props.topicFqn]).concat(['-compaction-status']);

  const { data: internalStats, error: internalStatsError } = useSWR(
    internalStatsKey,
    async () => {
      const req = new pb.GetTopicsInternalStatsRequest();
      req.setTopicsList([props.topicFqn]);
      const res = await topicServiceClient.getTopicsInternalStats(req, {})
        .catch((err) => notifyError(`Unable to get topics internal stats. ${err}`));

      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get topic internal stats. ${res.getStatus()?.getMessage()}`);
        return;
      }

      return res.getStatsMap().get(props.topicFqn);
    },
    { refreshInterval: 5_000 }
  );

  if (internalStatsError) {
    notifyError(`Unable to get topics internal stats. ${internalStatsError}`);
  }

  if (stats === undefined || internalStats === undefined) {
    return (
      <div className={s.NothingToShow}>
        <NothingToShow reason={isStatsLoading ? 'loading-in-progress' : 'no-items-found'} />
      </div>
    );
  }

  let statusColor: string | undefined = undefined;
  switch (status?.status) {
    case 'error': statusColor = 'var(--accent-color-red)'; break;
    case 'success': statusColor = 'var(--accent-color-blue)'; break;
  }

  const compactedLedger = internalStats.getTopicStats()?.getCompactedLedger();

  const refresh = () => {
    mutate(statusKey);
    mutate(statsKey);
    mutate(internalStatsKey);
  }

  return (
    <div className={s.TopicCompactionStatus}>
      <div style={{ marginTop: '24rem' }}>
        <strong>Status:</strong> {<span style={{ color: statusColor }}>{status?.status}</span> || <NoData />}
      </div>
      <div style={{ display: 'flex' }}>
        <strong>Last error:</strong>&nbsp;{status?.lastError || <NoData />}
      </div>

      <div style={{ display: 'flex', gap: '8rem', marginTop: '8rem' }}>
        <ActionButton
          action={{ type: 'predefined', action: 'refresh' }}
          onClick={refresh}
          title="Refresh status"
        />

        <SmallButton
          type='regular'
          text='Trigger Compaction'
          onClick={async () => {
            const req = new pb.TriggerCompactionRequest();
            req.setTopicFqn(props.topicFqn);

            const res = await topicServiceClient.triggerCompaction(req, null)
              .catch(err => notifyError(`Unable to trigger topic compaction: ${err}`));

            if (res === undefined) {
              return;
            }

            if (res.getStatus()?.getCode() !== Code.OK) {
              notifyError(`Unable to trigger topic compaction: ${res.getStatus()?.getMessage()}`)
              return;
            }

            refresh();
          }}
        />
      </div>

      <div style={{ marginTop: '24rem' }}>
        <table className={st.Table}>
          <tbody>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Last Compaction Succeed Timestamp</td>
              <Td>{i18n.withVoidDefault(stats?.getCompaction()?.getLastCompactionSucceedTimestamp()?.getValue() || undefined, (v) => i18n.formatDateTime(new Date(v)))}</Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Last Compaction Duration Time</td>
              <Td>{i18n.withVoidDefault(stats?.getCompaction()?.getLastCompactionDurationTimeInMills()?.getValue() || undefined, i18n.formatDuration)}</Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Last Compaction Removed Event Count</td>
              <Td>{i18n.withVoidDefault(stats?.getCompaction()?.getLastCompactionRemovedEventCount()?.getValue(), v => v)}</Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Last Compaction Failed Timestamp</td>
              <Td>{i18n.withVoidDefault(stats?.getCompaction()?.getLastCompactionFailedTimestamp()?.getValue() || undefined, (v) => i18n.formatDateTime(new Date(v)))}</Td>
            </tr>
          </tbody>
        </table>
      </div>

      {compactedLedger !== undefined && (
        <div style={{ height: '320rem', marginTop: '24rem', display: 'flex' }}>
          <Ledgers ledgers={[compactedLedger]} />
        </div>
      )}
    </div>
  );
}

export default TopicCompactionStatus;
