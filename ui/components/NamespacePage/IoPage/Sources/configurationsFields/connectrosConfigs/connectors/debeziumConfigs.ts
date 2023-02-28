import { IoConfigField } from "../../../../IoConfigField/IoConfigField";

export const hostnameField: IoConfigField = {
  name: 'database.hostname',
  type: 'string',
  isRequired: true,
  help: 'help',
  label: 'Host name',
}

export const portField: IoConfigField = {
  name: 'database.port',
  type: 'int',
  isRequired: true,
  help: 'help',
  label: 'Port',
}

export const userField: IoConfigField = {
  name: 'database.user',
  type: 'string',
  isRequired: true,
  help: 'help',
  label: 'User name',
}

export const passwordField: IoConfigField = {
  name: 'database.user',
  type: 'string',
  isRequired: true,
  help: 'help',
  label: 'User name',
}

export const dbNameField: IoConfigField = {
  name: 'database.dbname',
  type: 'string',
  isRequired: true,
  help: 'help',
  label: 'Db name',
}

export const dbServerNameField: IoConfigField = {
  name: 'database.server.name',
  type: 'string',
  isRequired: true,
  help: 'help',
  label: 'Server name',
}

export const whiteListField: IoConfigField = {
  name: 'database.whitelist',
  type: 'string',
  isRequired: true,
  help: 'help',
  label: 'Whitelist',
}

export const pulsarHistoryServiceUrlField: IoConfigField = {
  name: 'database.history.pulsar.service.url',
  type: 'string',
  isRequired: true,
  help: 'help',
  label: 'Pulsar database service url',
}


// export const debeziumFields: IoConfigField[] = [
//   {
//     name: 'task.class',
//     type: 'string',
//     isRequired: true,
//     help: 'help',
//     label: 'Task class',
//   },
//   {
//     name: 'database.hostname',
//     type: 'string',
//     isRequired: true,
//     help: 'help',
//     label: 'Database hostname',
//   },
//   {
//     name: 'database.port',
//     type: 'int',
//     isRequired: true,
//     help: 'help',
//     label: 'Database port',
//   },
//   {
//     name: 'database.user',
//     type: 'string',
//     isRequired: true,
//     help: 'help',
//     label: 'Database user',
//   },
//   {
//     name: 'database.password',
//     type: 'string',
//     isRequired: true,
//     help: 'help',
//     label: 'Database password',
//   },
//   {
//     name: 'database.server.id',
//     type: 'string',
//     isRequired: true,
//     help: 'help',
//     label: 'Database server id',
//   },
//   {
//     name: 'database.server.name',
//     type: 'string',
//     isRequired: true,
//     help: 'help',
//     label: 'Single port',
//   },
//   {
//     name: 'database.whitelist',
//     type: 'array',
//     isRequired: false,
//     help: 'help',
//     label: 'Database whitelist',
//   },
//   {
//     name: 'key.converter',
//     type: 'string',
//     isRequired: true,
//     help: 'help',
//     label: 'Key converter',
//   },
//   {
//     name: 'value.converter',
//     type: 'string',
//     isRequired: true,
//     help: 'help',
//     label: 'Value converter',
//   },
//   {
//     name: 'database.history',
//     type: 'string',
//     isRequired: true,
//     help: 'help',
//     label: 'Database history',
//   },
//   {
//     name: 'database.history.pulsar.topic',
//     type: 'string',
//     isRequired: true,
//     help: 'help',
//     label: 'Database history pulsar topic',
//   },
//   {
//     name: 'database.history.pulsar.service.url',
//     type: 'string',
//     isRequired: true,
//     help: 'help',
//     label: 'Database history pulsar service url',
//   },
//   {
//     name: 'offset.storage.reader.config',
//     type: 'string',
//     isRequired: true,
//     help: 'help',
//     label: 'Offset storage reader config',
//   },
//   {
//     name: 'json-with-envelope',
//     type: 'boolean',
//     isRequired: false,
//     help: 'help',
//     label: 'Json with envelope',
//   },
//   {
//     name: 'database.history.pulsar.reader.config',
//     type: 'json',
//     isRequired: false,
//     help: 'help',
//     label: 'Database history pulsar reader config',
//   },
//   {
//     name: 'offset.storage.reader.config',
//     type: 'json',
//     isRequired: false,
//     help: 'help',
//     label: 'Offset storage reader config',
//   },
// ];

// export type DebeziumConfigs = {
//   [key: string]: string | number | boolean | string[] | StringMap,
//   "database.hostname": string,
//   "database.port": number,
//   "database.user": string ,
//   "database.password": string,
//   "database.server.id": number,
//   "database.server.name": string,
//   "database.whitelist": string[],
//   "database.history": string, // "org.apache.pulsar.io.debezium.PulsarDatabaseHistory",
//   "database.history.pulsar.topic": string, // "debezium-oracle-source-history-topic",
//   "database.history.pulsar.service.url": string, // "pulsar://127.0.0.1:6650"
//   "key.converter": string, // "org.apache.kafka.connect.json.JsonConverter"
//   "value.converter": string, // "org.apache.kafka.connect.json.JsonConverter",
//   "offset.storage.reader.config": StringMap,

//   "task.class": string, // "io.debezium.connector.oracle.OracleConnectorTask",
//   "offset.storage.topic": string,
//   "json-with-envelope": boolean,
//   "database.history.pulsar.reader.config": StringMap,
// }

// export const debeziumDefault: DebeziumConfigs = {
//   "task.class": '',
//   "database.hostname": '',
//   "database.port": 1111,
//   "database.user": '',
//   "database.password": '',
//   "database.server.id": 1,
//   "database.server.name": '',
//   "database.whitelist": [],
//   "key.converter": '',
//   "value.converter": '',
//   "database.history": '',
//   "database.history.pulsar.topic": '',
//   "database.history.pulsar.service.url": '',
//   "offset.storage.topic": '',
//   "json-with-envelope": false,
//   "database.history.pulsar.reader.config": {},
//   "offset.storage.reader.config": {},
// }