import * as I18n from '../../../../../../app/contexts/I18n/I18n';
import * as pb from '../../../../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import { useMemo } from 'react';
import Table from '../../../../../../ui/Table/Table';
import Td from '../../../../../../ui/SimpleTable/Td';
import * as st from '../../../../../../ui/SimpleTable/SimpleTable.module.css';
import * as s from './Ledgers.module.css';

type LedgersColumnKey = "ledgerId" | "entries" | "size" | "offloaded" | "metadata" | "underReplicated";
type Ledger = {
  ledgerId?: number;
  entries?: number;
  size?: number;
  offloaded?: boolean;
  metadata?: string;
  underReplicated?: boolean;
};

function ledgerFromPb(ledger: pb.LedgerInfo): Ledger {
  return {
    ledgerId: ledger.getLedgerId()?.getValue(),
    entries: ledger.getEntries()?.getValue(),
    size: ledger.getSize()?.getValue(),
    offloaded: ledger.getOffloaded()?.getValue(),
    metadata: ledger.getMetadata()?.getValue(),
    underReplicated: ledger.getUnderReplicated()?.getValue()
  };
}

const Ledgers: React.FC<{ ledgers: pb.LedgerInfo[] }> = (props) => {
  const i18n = I18n.useContext();

  const ledgers = useMemo(() => props.ledgers.map(ledgerFromPb), [props.ledgers]);

  return (
    <div className={s.Ledgers}>
      <Table<LedgersColumnKey, Ledger, {}>
        autoRefresh={{ intervalMs: 5000 }}
        toolbar={{ visibility: 'hidden' }}
        columns={{
          columns: {
            ledgerId: {
              title: "Ledger Id",
              render: (ledger) => i18n.withVoidDefault(ledger.ledgerId, v => v),
              sortFn: (a, b) => (a.data.ledgerId || 0) - (b.data.ledgerId || 0)
            },
            entries: {
              title: "Entries",
              render: (ledger) => i18n.withVoidDefault(ledger.entries, i18n.formatCount),
              sortFn: (a, b) => (a.data.entries || 0) - (b.data.entries || 0)
            },
            size: {
              title: "Size",
              render: (ledger) => i18n.withVoidDefault(ledger.size, i18n.formatBytes),
              sortFn: (a, b) => (a.data.size || 0) - (b.data.size || 0)
            },
            metadata: {
              title: "Metadata",
              render: (ledger) => i18n.withVoidDefault(ledger.metadata, v => v),
              sortFn: (a, b) => (a.data.metadata || "").localeCompare(b.data.metadata || "")
            },
            offloaded: {
              title: "Offloaded",
              render: (ledger) => i18n.withVoidDefault(ledger.offloaded, i18n.formatBoolean),
              sortFn: (a, b) => Number(a.data.offloaded) - Number(b.data.offloaded)
            },
            underReplicated: {
              title: "Under Replicated",
              render: (ledger) => i18n.withVoidDefault(ledger.underReplicated, i18n.formatBoolean),
              sortFn: (a, b) => Number(a.data.underReplicated) - Number(b.data.underReplicated)
            }
          },
          defaultConfig: [
            { columnKey: "ledgerId", width: 100, visibility: 'visible', stickyTo: 'left' },
            { columnKey: "entries", width: 100, visibility: 'visible' },
            { columnKey: "size", width: 100, visibility: 'visible' },
            { columnKey: "metadata", width: 100, visibility: 'visible' },
            { columnKey: "offloaded", width: 100, visibility: 'visible' },
            { columnKey: "underReplicated", width: 100, visibility: 'visible' },
          ]
        }}
        dataLoader={{
          cacheKey: ledgers.map(ledger => ledger.ledgerId?.toString() || ''),
          loader: async () => ledgers,
        }}
        getId={(ledger) => ledger.ledgerId?.toString() || ""}
        tableId='ledgers-table'
        defaultSort={{ column: "ledgerId", direction: 'asc', type: 'by-single-column' }}
      />
    </div>
  );
}

export default Ledgers;
