import { ConditionalAttachments } from "../../../IoConfigField/IoConfigField";
import { FlumeConfigs, flumeDefault, flumeFields } from "../../../Sinks/configurationsFields/connectrosConfigs/connectors/flumeConfigs";

import { CanalConfigs, canalDefault, canalFields } from "./connectors/canalConfigs";
import { debeziumMicrosoftSqlFields, MicrosoftSqlConfigs, microsoftSqlDefault } from "./connectors/debeziumMicrosoftSqlServerConfigs";
import { DebeziumMongoDbConfigs, debeziumMongoDbDefault, debeziumMongoDbFields } from "./connectors/debeziumMongoDbConfigs";
import { debeziumMySqlFields, MySqlConfigs, mySqlDefault } from "./connectors/debeziumMySqlConfigs";
import { debeziumOracleFields, OracleConfigs, oracleDefault } from "./connectors/debeziumOracleConfigs";
import { debeziumPostgreSqlFields, PostgreSqlConfigs, postgreSqlDefault } from "./connectors/debeziumPostgreSqlConfigs";
import { dynamoDbFields, DynamoDbConfigs, dynamoDbDefault } from "./connectors/dynamoDbConfigs";
import { FileConfigs, fileDefault, fileFields } from "./connectors/fileConfigs";
import { KafkaConfigs, kafkaDefault, kafkaFields } from "./connectors/kafkaConfigs";
import { KinesisConfigs, kinesisDefault, kinesisFields } from "./connectors/kinesisConfigs";
import { MongoDBConfigs, mongoDBDefault, mongoDBFields } from "./connectors/mongodbConfigs";
import { NettyConfigs, nettyDefault, nettyFields } from "./connectors/nettyConfigs";
import { NsqConfigs, nsqDefault, nsqFields } from "./connectors/nsqConfigs";
import { RabbitMQConfigs, rabbitMQDefault, rabbitMQFields } from "./connectors/rabbitMQConfigs";
import { TwitterFirehoseConfigs, twitterFirehoseDefault, twitterFirehoseFields } from "./connectors/twitterFirehoseConfigs";

export const sourceConfigs: ConditionalAttachments = {
  limitation: 'className',
  fields: {
    canal: canalFields,
    debeziumMicrosoftSql: debeziumMicrosoftSqlFields,
    debeziumMongoDb: debeziumMongoDbFields,
    debeziumMySql: debeziumMySqlFields,
    debeziumOracle: debeziumOracleFields,
    debeziumPostgreSql: debeziumPostgreSqlFields,
    dynamoDb: dynamoDbFields,
    file: fileFields,
    flume: flumeFields,
    twitterFirehose: twitterFirehoseFields,
    kafka: kafkaFields,
    kinesis: kinesisFields,
    mongoDB: mongoDBFields,
    netty: nettyFields,
    nsq: nsqFields,
    rappitMQ: rabbitMQFields,
  }
}

export type SourceConnectorsConfigsTypes = CanalConfigs | MicrosoftSqlConfigs | DebeziumMongoDbConfigs | MongoDBConfigs | MySqlConfigs | OracleConfigs | PostgreSqlConfigs | DynamoDbConfigs | FlumeConfigs | FileConfigs | KafkaConfigs | KinesisConfigs | NettyConfigs | NsqConfigs | RabbitMQConfigs | TwitterFirehoseConfigs;

export type SourceConnectorsConfigs = {
  [key: string]: SourceConnectorsConfigsTypes,
  canal: CanalConfigs,
  debeziumMicrosoftSql: MicrosoftSqlConfigs,
  debeziumMongoDb: DebeziumMongoDbConfigs,
  debeziumMySql: MySqlConfigs,
  debeziumOracle: OracleConfigs,
  debeziumPostgreSql: PostgreSqlConfigs,
  dynamoDb: DynamoDbConfigs,
  file: FileConfigs,
  flume: FlumeConfigs,
  twitterFirehose: TwitterFirehoseConfigs,
  kafka: KafkaConfigs,
  kinesis: KinesisConfigs,
  mongoDB: MongoDBConfigs,
  netty: NettyConfigs,
  nsq: NsqConfigs,
  rappitMQ: RabbitMQConfigs,
}

export const defaultConnectorsConfigs: SourceConnectorsConfigs = {
  canal: canalDefault,
  debeziumMicrosoftSql: microsoftSqlDefault,
  debeziumMongoDb: debeziumMongoDbDefault,
  debeziumMySql: mySqlDefault,
  debeziumOracle: oracleDefault,
  debeziumPostgreSql: postgreSqlDefault,
  dynamoDb: dynamoDbDefault,
  file: fileDefault,
  flume: flumeDefault,
  twitterFirehose: twitterFirehoseDefault,
  kafka: kafkaDefault,
  kinesis: kinesisDefault,
  mongoDB: mongoDBDefault,
  netty: nettyDefault,
  nsq: nsqDefault,
  rappitMQ: rabbitMQDefault,
}