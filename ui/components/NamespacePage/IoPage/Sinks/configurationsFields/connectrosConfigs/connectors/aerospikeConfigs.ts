import { IoConfigField } from "../../../../IoConfigField/IoConfigField";

export type AerospikeConfigs = {
  [key: string]: string | number,
  seedHosts: string,
  keyspace: string,
  columnName: string,
  userName: string,
  password: string,
  keySet: string,
  maxConcurrentRequests: number,
  timeoutMs: number,
  retries: number,
}

export const aerospikeFields: IoConfigField[] = [
  {
    name: 'seedHosts',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Seed hosts',
  },
  {
    name: 'keyspace',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Keyspace',
  },
  {
    name: 'columnName',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Column name',
  },
  {
    name: 'userName',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'User name',
  },
  {
    name: 'password',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Password',
  },
  {
    name: 'keySet',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Key set',
  },
  {
    name: 'maxConcurrentRequests',
    type: 'int',
    isRequired: false,
    help: 'help',
    label: 'Max concurrent requests',
  },
  {
    name: 'timeoutMs',
    type: 'duration',
    isRequired: false,
    help: 'help',
    label: 'Timeout',
  },
  {
    name: 'retries',
    type: 'int',
    isRequired: false,
    help: 'help',
    label: 'Retries',
  },
]

export const aerospikeDefault: AerospikeConfigs = {
  seedHosts: '',
  keyspace: '',
  columnName: '',
  userName: '',
  password: '',
  keySet: '',
  maxConcurrentRequests: 100,
  timeoutMs: 100,
  retries: 1,
}