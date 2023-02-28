import { IoConfigField } from "../../../../IoConfigField/IoConfigField";
import { pulsarHistoryServiceUrlField, whiteListField } from "./debeziumConfigs";

export const debeziumMongoDbFields: IoConfigField[] = [
  {
    name: 'mongodb.hosts',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Hosts',
  },
  {
    name: 'mongodb.name',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'DB name',
  },
  {
    name: 'mongodb.user',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'User name',
  },
  {
    name: 'mongodb.password',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Password',
  },
  {
    name: 'mongodb.task.id',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Task id',
  },
  whiteListField,
  pulsarHistoryServiceUrlField,
];

export type DebeziumMongoDbConfigs = {
  [key: string]: string | number,
  "mongodb.hosts": string,
  "mongodb.name": string,
  "mongodb.user": string,
  "mongodb.password": string,
  "mongodb.task.id": number,
  "database.whitelist": string,
  "database.history.pulsar.service.url": string,
}

export const debeziumMongoDbDefault: DebeziumMongoDbConfigs = {
  "mongodb.hosts": '',
  "mongodb.name": '',
  "mongodb.user": '',
  "mongodb.password": '',
  "mongodb.task.id": 1,
  "database.whitelist": '',
  "database.history.pulsar.service.url": '',
}