import { StringMap } from "../../../../Sinks/configurationsFields/configurationsFields";

type MySqlConfigs = { 
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