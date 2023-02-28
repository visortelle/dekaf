import { IoConfigField } from "../../../../IoConfigField/IoConfigField";
import { StringMap } from "../../../../Sinks/configurationsFields/configurationsFields";
import { dbServerNameField, hostnameField, passwordField, portField, pulsarHistoryServiceUrlField, userField, whiteListField } from "./debeziumConfigs";

export const debeziumMySqlFields: IoConfigField[] = [
  hostnameField,
  portField,
  userField,
  passwordField,
  {
    name: 'database.server.id',
    type: 'int',
    isRequired: true,
    help: 'help',
    label: 'Server id',
  },
  dbServerNameField,
  whiteListField,
  {
    name: 'database.history',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'DB history',
  },
  {
    name: 'database.history.pulsar.topic',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'pulsar history topic',
  },
  pulsarHistoryServiceUrlField,
  {
    name: 'key.converter',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Key converter',
  },
  {
    name: 'value.converter',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Value converter',
  },
  {
    name: 'offset.storage.reader.config',
    type: 'json',
    isRequired: true,
    help: 'help',
    label: 'Offset storage reader config',
  },
];

export type MySqlConfigs = { 
  [key: string]: string | number | boolean | string[] | StringMap,
  "database.hostname": string,
  "database.port": number,
  "database.user": string ,
  "database.password": string,
  "database.server.id": number,
  "database.server.name": string,
  "database.whitelist": string[],
  "database.history": string, // "org.apache.pulsar.io.debezium.PulsarDatabaseHistory",
  "database.history.pulsar.topic": string, // "debezium-oracle-source-history-topic",
  "database.history.pulsar.service.url": string, // "pulsar://127.0.0.1:6650"
  "key.converter": string, // "org.apache.kafka.connect.json.JsonConverter"
  "value.converter": string, // "org.apache.kafka.connect.json.JsonConverter",
  "offset.storage.reader.config": StringMap,
}

export const mySqlDefault: MySqlConfigs = {
  "database.hostname": '',
  "database.port": 1111,
  "database.user": '',
  "database.password": '',
  "database.server.id": 1,
  "database.server.name": '',
  "database.whitelist": [],
  "database.history": '', // "org.apache.pulsar.io.debezium.PulsarDatabaseHistory",
  "database.history.pulsar.topic": '', // "debezium-oracle-source-history-topic",
  "database.history.pulsar.service.url": '', // "pulsar://127.0.0.1:6650"
  "key.converter": '', // "org.apache.kafka.connect.json.JsonConverter"
  "value.converter": '', // "org.apache.kafka.connect.json.JsonConverter",
  "offset.storage.reader.config": {},
}