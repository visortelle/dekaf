import { IoConfigField } from "../../../../IoConfigField/IoConfigField"
import { dbNameField, dbServerNameField, hostnameField, passwordField, portField, pulsarHistoryServiceUrlField, userField } from "./debeziumConfigs";

export const debeziumPostgreSqlFields: IoConfigField[] = [
  hostnameField,
  portField,
  userField,
  passwordField,
  dbNameField,
  dbServerNameField,
  {
    name: 'plugin.name',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Plugin name',
  },
  {
    name: 'schema.whitelist',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Schema whitelist',
  },
  {
    name: 'table.whitelist',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Table whitelist',
  },
  pulsarHistoryServiceUrlField,
];

export type PostgreSqlConfigs = {
  [key: string]: string | number,
  "database.hostname": string,
  "database.port": number,
  "database.user": string ,
  "database.password": string,
  "database.dbname": string,
  "database.server.name": string,
  "plugin.name": string,
  "schema.whitelist": string,
  "table.whitelist": string, // "public.users"
  "database.history.pulsar.service.url": string
}

export const postgreSqlDefault: PostgreSqlConfigs = {
  "database.hostname": '',
  "database.port": 1111,
  "database.user": '',
  "database.password": '',
  "database.dbname": '',
  "database.server.name": '',
  "plugin.name": '',
  "schema.whitelist": '',
  "table.whitelist": '', // "public.users"
  "database.history.pulsar.service.url": '',
}