import { IoConfigField } from "../../../../IoConfigField/IoConfigField"

export const debeziumFields: IoConfigField[] = [
  {
    name: 'task.class',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Task class',
  },
]

type OracleConfigs = {
  "database.hostname": string,
  "database.port": number,
  "database.user": string,
  "database.password": string,
  "database.dbname": string,
  "database.server.name": string,
  "schema.exclude.list": string,
  "snapshot.mode": string,
  "topic.namespace": string, // "public/default",
  "task.class": string, //"io.debezium.connector.oracle.OracleConnectorTask",
  "value.converter": string, //"org.apache.kafka.connect.json.JsonConverter",
  "key.converter": string, //"org.apache.kafka.connect.json.JsonConverter",
  "typeClassName": string, //"org.apache.pulsar.common.schema.KeyValue",
  "database.history": string, //"org.apache.pulsar.io.debezium.PulsarDatabaseHistory",
  "database.tcpKeepAlive": boolean,
  "decimal.handling.mode": string,
  "database.history.pulsar.topic": string,
  "database.history.pulsar.service.url": string,
}

export const OracleDefault = {
  "database.hostname": '',
  "database.port": 1111,
  "database.user": '',
  "database.password": '',
  "database.dbname": '',
  "database.server.name": '',
  "schema.exclude.list": '',
  "snapshot.mode": '',
  "topic.namespace": '', // "public/default",
  "task.class": '', //"io.debezium.connector.oracle.OracleConnectorTask",
  "value.converter": '', //"org.apache.kafka.connect.json.JsonConverter",
  "key.converter": '', //"org.apache.kafka.connect.json.JsonConverter",
  "typeClassName": '', //"org.apache.pulsar.common.schema.KeyValue",
  "database.history": '', //"org.apache.pulsar.io.debezium.PulsarDatabaseHistory",
  "database.tcpKeepAlive": false,
  "decimal.handling.mode": '',
  "database.history.pulsar.topic": '',
  "database.history.pulsar.service.url": '',
}