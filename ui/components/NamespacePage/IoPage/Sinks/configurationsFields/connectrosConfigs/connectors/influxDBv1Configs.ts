import { IoConfigField } from "../../../../IoConfigField/IoConfigField";

const CONSISTENCY_LEVEL = [ { value: 'all', label: 'All' }, { value: 'any', label: 'Any' }, { value: 'one', label: 'One' }, { value: 'quorum', label: 'Quorum' } ]; // ALL ANY ONE QUORUM
type ConsistencyLevel = 'all' | 'any' | 'one' | 'quorum';

const LOG_LEVEL = [ { value: 'none', label: 'None' }, { value: 'basic', label: 'Basic' }, { value: 'headers', label: 'Headers' }, { value: 'full', label: 'Full' } ] //NONE BASIC HEADERS FULL
type LogLevel = 'none' | 'basic' | 'headers' | 'full';

export type InfluxDBv1Configs = {
  [key: string]: string | boolean | number,
  influxdbUrl: string,
  username: string,
  password: string,
  database: string,
  consistencyLevel: ConsistencyLevel,
  logLevel: LogLevel,
  retentionPolicy: string,
  gzipEnable: boolean,
  batchTimeMs: number,
  batchSize: number,
}

export const influxDBv1Fields: IoConfigField[] = [
  {
    name: 'influxdbUrl',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Influxdb url',
  },
  {
    name: 'username',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Username',
  },
  {
    name: 'password',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Password',
  },
  {
    name: 'database',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Database',
  },
  {
    name: 'consistencyLevel',
    type: 'enum',
    isRequired: false,
    help: 'help',
    label: 'Consistency level',
    enum: CONSISTENCY_LEVEL,
  },
  {
    name: 'logLevel',
    type: 'enum',
    isRequired: false,
    help: 'help',
    label: 'Log level',
    enum: LOG_LEVEL
  },
  {
    name: 'retentionPolicy',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Retention policy',
  },
  {
    name: 'gzipEnable',
    type: 'boolean',
    isRequired: false,
    help: 'help',
    label: 'Gzip enable',
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

export const influxDBv1Default: InfluxDBv1Configs = {
  influxdbUrl: '',
  username: '',
  password: '',
  database: '',
  consistencyLevel: 'one',
  logLevel: 'none',
  retentionPolicy: 'autogen',
  gzipEnable: false,
  batchTimeMs: 1000,
  batchSize: 200,
}