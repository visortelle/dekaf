import { IoConfigField } from "../../../../IoConfigField/IoConfigField"

export type MongoDBConfigs = {
  [key: string]: string | number,
  mongoUrl: string,
  database: string,
  collection: string,
  batchSize: number,
  batchTimeMs: number,
}

export const mongodbFields: IoConfigField[] = [
  {
    name: 'mongoUrl',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Mongo ul',
  },
  {
    name: 'database',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Database',
  },
  {
    name: 'collection',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Collection',
  },
  {
    name: 'batchSize',
    type: 'bytes',
    isRequired: false,
    help: 'help',
    label: 'Batch size',
  },
  {
    name: 'batchTimeMs',
    type: 'duration',
    isRequired: false,
    help: 'help',
    label: 'Batch time',
  },
];

export const mongoDBDefault: MongoDBConfigs = {
  mongoUrl: '',
  database: '',
  collection: '',
  batchSize: 100,
  batchTimeMs: 1000,
}