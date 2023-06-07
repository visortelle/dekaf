import React, { useState } from 'react';
import s from './Table.module.css'

export type ColumnKey = string;
export type DataEntryKey = string;

export type ColumnsConfig<CK extends ColumnKey> = Record<CK, {
  visibility: 'visible' | 'hidden',
  stickyTo: 'none' | 'left'
}>;

export type Columns<CK extends ColumnKey, DE, LD> = {
  columns: Column<CK, DE, LD>[]
  defaultConfig: ColumnsConfig<CK>
};

export type Column<CK extends ColumnKey, DE, LD> = {
  id: CK,
  title: string,
  defaultWidth?: number,
  help?: React.ReactNode,
  sort?: (a: { data: DE, lazyData: LD }, b: { data: DE, lazyData: LD }) => number,
};

export type Sort<CK extends ColumnKey> = {
  column: CK,
  direction: 'asc' | 'desc',
};

export type TableProps<CK extends ColumnKey, DE, LD> = {
  tableId: string
  data: DE[]
  lazyLoader: (visibleEntries: DE[]) => Promise<LD[]>
  columns: Columns<CK, DE, LD>
  getId: (entry: DE) => DataEntryKey
  defaultSort?: Sort<CK>
};

function Table<CK extends ColumnKey, DE, LD>(props: TableProps<CK, DE, LD>): React.ReactNode {
  const [lazyData, setLazyData] = useState<Record<DataEntryKey, LD>>({});

  return (
    <div className={s.TableContainer}>
      <table className={s.Table}>
        <thead>
          <tr>
            {props.columns.columns.map(column => (
              <th key={column.id}>
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.data.map(entry => (
            <tr key={props.getId(entry)}>
              {props.columns.columns.map(column => (
                <td key={column.id}>
                  {column.id}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
