import { IoConfigField } from "../../../../IoConfigField/IoConfigField";

const CLIENT_MODE = [ { value: 'Standalone', label: 'Standalone' }, { value: 'Cluster', label: 'Cluster' } ];
type ClientMode = 'Standalone' | 'Cluster';

export type RedisConfigs = {
  [key: string]: string | boolean | number,
  redisHosts: string,
  redisPassword: string,
  redisDatabase: number,
  clientMode: ClientMode,
  autoReconnect: boolean,
  requestQueue: number,
  tcpNoDelay: boolean,
  keepAlive: boolean,
  connectTimeout: number,
  operationTimeout: number,
  batchTimeMs: number,
  batchSize: number,
}

export const redisFields: IoConfigField[] = [
  {
    name: 'redisHosts',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Redis hosts',
  },
  {
    name: 'redisPassword',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Redis password',
  },
  {
    name: 'redisDatabase',
    type: 'int',
    isRequired: true,
    help: 'help',
    label: 'Redis databse',
  },
  {
    name: 'clientMode',
    type: 'enum',
    isRequired: false,
    help: 'help',
    label: 'Client mode',
    enum: CLIENT_MODE,
  },
  {
    name: 'autoReconnect',
    type: 'boolean',
    isRequired: false,
    help: 'help',
    label: 'Auto reconnect',
  },
  {
    name: 'requestQueue',
    type: 'int',
    isRequired: false,
    help: 'help',
    label: 'Request queue',
  },
  {
    name: 'tcpNoDelay',
    type: 'boolean',
    isRequired: false,
    help: 'help',
    label: 'Tcp no delay',
  },
  {
    name: 'keepAlive',
    type: 'boolean',
    isRequired: false,
    help: 'help',
    label: 'Keep alive',
  },
  {
    name: 'connectTimeout',
    type: 'duration',
    isRequired: false,
    help: 'help',
    label: 'Connect timeout',
  },
  {
    name: 'operationTimeout',
    type: 'duration',
    isRequired: false,
    help: 'help',
    label: 'Operation timeout',
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

export const redisDefault: RedisConfigs = {
  redisHosts: '',
  redisPassword: '',
  redisDatabase: 0,
  clientMode: 'Standalone',
  autoReconnect: true,
  requestQueue: 2147483647,
  tcpNoDelay: false,
  keepAlive: false,
  connectTimeout: 10000,
  operationTimeout: 10000,
  batchTimeMs: 1000,
  batchSize: 200,
}