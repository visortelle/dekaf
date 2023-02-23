import { IoConfigField } from "../../../../IoConfigField/IoConfigField";

export type CassandraConfigs = {
  [key: string]: string,
  roots: string,
  keyspace: string,
  keyname: string,
  columnFamily: string,
  columnName: string,
}

export const cassandraFields: IoConfigField[] = [
  {
    name: 'roots',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Roots',
  },
  {
    name: 'keyspace',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Keyspace',
  },
  {
    name: 'keyname',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Keyname',
  },
  {
    name: 'columnFamily',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Column family',
  },
  {
    name: 'columnName',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Column name',
  },
]

export const cassandraDefault: CassandraConfigs = {
  roots: '',
  keyspace: '',
  keyname: '',
  columnFamily: '',
  columnName: '',
}