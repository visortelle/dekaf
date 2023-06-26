import React from 'react';
import s from './PersistentTopicInternalStats.module.css'
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import Ledgers from './ManagedLedgerInternalStats/Ledgers/Ledgers';
import ManagedLedgerInternalStats from './ManagedLedgerInternalStats/ManagedLedgerInternalStats';
import { H3 } from '../../../../ui/H/H';
import NothingToShow from '../../../../ui/NothingToShow/NothingToShow';

export type PersistentTopicInternalStatsProps = {
  stats: pb.PersistentTopicInternalStats;
};

const PersistentTopicInternalStats: React.FC<PersistentTopicInternalStatsProps> = (props) => {
  const managedLedgerInternalStats = props.stats.getManagedLedgerInternalStats();
  const compactedLedger = props.stats.getCompactedLedger();
  const schemaLedgers = props.stats.getSchemaLedgersList();

  return (
    <div className={s.PersistentTopicInternalStats}>
      {managedLedgerInternalStats && (
        <div className={s.Section}>
          <div className={s.SectionTitle}>
            <H3>Managed Ledger Internal Stats</H3>
          </div>
          <ManagedLedgerInternalStats stats={managedLedgerInternalStats} />
        </div>
      )}

      <div className={s.Section}>
        <div className={s.SectionTitle}>
          <H3>Schema Ledgers</H3>
        </div>
        <div className={s.SchemaLedgers} style={schemaLedgers.length === 0 ? { height: 'auto'} : undefined}>
          <Ledgers ledgers={schemaLedgers} />
        </div>
      </div>

      <div className={s.Section}>
        <div className={s.SectionTitle}>
          <H3>Compacted Ledger</H3>
        </div>

        {compactedLedger ? (
          <div className={s.CompactedLedger}>
            <Ledgers ledgers={[compactedLedger]} />
          </div>
        ) : <NothingToShow />}
      </div>
    </div>
  );
}

export default PersistentTopicInternalStats;
