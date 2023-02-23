import { IoConfigField } from "../../../../IoConfigField/IoConfigField"

export type HBaseConfigs = {
  [key: string]: string | number,
  hbaseConfigResources: string,
  zookeeperQuorum: string,
  zookeeperClientPort: string,
  zookeeperZnodeParent: string,
  tableName: string,
  rowKeyName: string,
  familyName: string,
  qualifierNames: string,
  batchTimeMs: number,
  batchSize: number,
}

export const hbaseFields: IoConfigField[] = [
  {
    name: 'hbaseConfigResources',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Hbase config resources',
  },
  {
    name: 'zookeeperQuorum',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Zookeeper quorum',
  },
  {
    name: 'zookeeperClientPort',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Zookeeper client port',
  },
  {
    name: 'zookeeperZnodeParent',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Zookeeper znode parent',
  },
  {
    name: 'tableName',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Table name',
  },
  {
    name: 'rowKeyName',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Row key name',
  },
  {
    name: 'familyName',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Family name',
  },
  {
    name: 'qualifierNames',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Qualifier names',
  },
  {
    name: 'batchTimeMs',
    type: 'duration',
    isRequired: false,
    help: 'help',
    label: 'Batch time',
  },
  {
    name: 'batchSize',
    type: 'int',
    isRequired: false,
    help: 'help',
    label: 'Batch size',
  },
];

export const hbaseDefault: HBaseConfigs = {
  hbaseConfigResources: '',
  zookeeperQuorum: '',
  zookeeperClientPort: '2181',
  zookeeperZnodeParent: '/hbase',
  tableName: '',
  rowKeyName: '',
  familyName: '',
  qualifierNames: '',
  batchTimeMs: 10001,
  batchSize: 200,
}