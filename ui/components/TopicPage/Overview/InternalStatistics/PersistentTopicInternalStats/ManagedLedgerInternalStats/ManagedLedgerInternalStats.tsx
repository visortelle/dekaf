import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import * as I18n from '../../../../../app/contexts/I18n/I18n';
import * as st from '../../../../../ui/SimpleTable/SimpleTable.module.css';
import * as s from './ManagedLedgerInternalStats.module.css';
import Td from '../../../../../ui/SimpleTable/Td';
import { H3 } from '../../../../../ui/H/H';
import Ledgers from './Ledgers/Ledgers';
import Cursors from './Cursors/Cursors';
import * as pbUtils from '../../../../../../proto-utils/proto-utils';
import { useMemo } from 'react';
import { PulsarTopicPersistency } from '../../../../../pulsar/pulsar-resources';

export type PersistentTopicInternalStatsProps = {
  stats: pb.ManagedLedgerInternalStats;
  tenant: string;
  namespace: string;
  topic: string;
  topicPersistency: PulsarTopicPersistency;
};

const PersistentTopicInternalStats: React.FC<PersistentTopicInternalStatsProps> = (props) => {
  const i18n = I18n.useContext();

  const lastLedgerCreatedTimestamp = props.stats?.getLastLedgerCreatedTimestamp()?.getValue();
  const lastLedgerCreationFailure = props.stats?.getLastLedgerCreationFailureTimestamp()?.getValue();
  const ledgers = props.stats?.getLedgersList() || undefined;
  const cursors = useMemo(() => pbUtils.mapToObject(props.stats.getCursorsMap()) || {}, [props.stats]);

  return (
    <div className={s.ManagedLedgerInternalStats}>
      <div className={s.Section}>
        <table className={st.Table}>
          <tbody>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Entries Added Counter</td>
              <Td>{i18n.withVoidDefault(props.stats?.getEntriesAddedCounter()?.getValue(), i18n.formatCount)}</Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Number of Entries</td>
              <Td>{i18n.withVoidDefault(props.stats?.getNumberOfEntries()?.getValue(), i18n.formatCount)}</Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Total Size</td>
              <Td>{i18n.withVoidDefault(props.stats?.getTotalSize()?.getValue(), i18n.formatBytes)}</Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Current Ledger Entries</td>
              <Td>{i18n.withVoidDefault(props.stats?.getCurrentLedgerEntries()?.getValue(), i18n.formatCount)}</Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Current Ledger Size</td>
              <Td>{i18n.withVoidDefault(props.stats?.getCurrentLedgerSize()?.getValue(), i18n.formatBytes)}</Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Last Ledger Created</td>
              <Td>{i18n.withVoidDefault(lastLedgerCreatedTimestamp === undefined ? undefined : new Date(lastLedgerCreatedTimestamp), i18n.formatDateTime)}</Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Last Ledger Creation Failure</td>
              <Td>{i18n.withVoidDefault(lastLedgerCreationFailure === undefined ? undefined : new Date(lastLedgerCreationFailure), i18n.formatDateTime)}</Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Waiting Cursors Count</td>
              <Td>{i18n.withVoidDefault(props.stats?.getWaitingCursorsCount()?.getValue(), i18n.formatCount)}</Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Pending Entries Count</td>
              <Td>{i18n.withVoidDefault(props.stats?.getPendingEntriesCount()?.getValue(), i18n.formatCount)}</Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Last Confirmed Entry</td>
              <Td>{i18n.withVoidDefault(props.stats?.getLastConfirmedEntry()?.getValue(), v => v)}</Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>State</td>
              <Td>{i18n.withVoidDefault(props.stats?.getState()?.getValue(), v => v)}</Td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={s.Section}>
        <div className={s.SectionTitle}>
          <H3>Cursors</H3>
        </div>

        <div
          className={s.Cursors}
          style={props.stats.getCursorsMap().getLength() === 0 ? { height: 'auto', flexDirection: 'column' } : undefined}
        >
          <Cursors
            cursors={cursors}
            tenant={props.tenant}
            namespace={props.namespace}
            topic={props.topic}
            topicPersistency={props.topicPersistency}
          />
        </div>
      </div>

      <div className={s.Section}>
        <div className={s.SectionTitle}>
          <H3>Ledgers</H3>
        </div>

        <div className={s.Ledgers} style={ledgers.length === 0 ? { height: 'auto' } : undefined}>
          <Ledgers ledgers={ledgers} />
        </div>
      </div>
    </div>
  );
};

export default PersistentTopicInternalStats;
