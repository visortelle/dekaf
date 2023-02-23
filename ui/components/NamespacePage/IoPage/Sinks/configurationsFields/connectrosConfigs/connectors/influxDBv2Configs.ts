import { IoConfigField } from "../../../../IoConfigField/IoConfigField";

const PRECISION = [ { value: 'ns', label: 'ns' }, { value: 'us', label: 'us' }, { value: 'ms', label: 'ms' }, { value: 's', label: 's' } ];
type Precision = 'ns' | 'us' | 'ms' | 's';

const LOG_LEVEL = [ { value: 'none', label: 'None' }, { value: 'basic', label: 'Basic' }, { value: 'headers', label: 'Headers' }, { value: 'full', label: 'Full' } ] //NONE BASIC HEADERS FULL
type LogLevel = 'none' | 'basic' | 'headers' | 'full';

export type InfluxDBv2Configs = {
  [key: string]: string | boolean | number,
  influxdbUrl: string,
  token: string,
  organization: string,
  bucket: string,
  precisiom: Precision,
  logLevel: LogLevel,
  gzipEnable: boolean,
  batchTimeMs: number,
  batchSize: number,
}

export const influxDBv2Fields: IoConfigField[] = [
  {
    name: 'influxdbUrl',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Influxdb url',
  },
  {
    name: 'token',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Token',
  },
  {
    name: 'organization',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Organization',
  },
  {
    name: 'bucket',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Bucket',
  },
  {
    name: 'precision',
    type: 'enum',
    isRequired: false,
    help: 'help',
    label: 'Precision',
    enum: PRECISION,
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

export const influxDBv2Default: InfluxDBv2Configs = {
  influxdbUrl: '',
  token: '',
  organization: '',
  bucket: '',
  precisiom: 'ns',
  logLevel: 'none',
  gzipEnable: false,
  batchTimeMs: 1000,
  batchSize: 200,
}