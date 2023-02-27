// import { ConditionalAttachments } from "../../../IoConfigField/IoConfigField";

// import { AerospikeConfigs, aerospikeDefault, aerospikeFields } from "./connectors/aerospikeConfigs";
// import { AlluxioConfigs, alluxioDefault, alluxioFields } from "./connectors/alluxioConfigs";
// import { cassandraFields, cassandraDefault, CassandraConfigs } from "./connectors/cassandraConfigs";
// import { elasticSearchDefault, elasticSearchFields, ElasticSearchConfigs } from "./connectors/elasticsearchConfigs";
// import { FlumeConfigs, flumeDefault, flumeFields } from "./connectors/flumeConfigs";
// import { HBaseConfigs, hbaseDefault, hbaseFields } from "./connectors/hBaseConfigs";
// import { HDFS2Configs, hdfs2Default, hdfs2Fields } from "./connectors/HDFS2Configs";
// import { HDFS3Configs, hdfs3Default, hdfs3Fields } from "./connectors/HDFS3Configs";
// import { HTTPConfigs, httpDefault, httpFields } from "./connectors/HTTPConfigs";
// import { InfluxDBv1Configs, influxDBv1Default, influxDBv1Fields } from "./connectors/influxDBv1Configs";
// import { InfluxDBv2Configs, influxDBv2Default, influxDBv2Fields } from "./connectors/influxDBv2Configs";
// import { JDBCConfigs, jdbcDefault, jdbcFields } from "./connectors/JDBCConfigs";
// import { KafkaConfigs, kafkaDefault, kafkaFields } from "./connectors/kafkaConfigs";
// import { KinesisConfigs, kinesisDefault, kinesisFields } from "./connectors/kinesisConfigs";
// import { MongoDBConfigs, mongoDBDefault, mongodbFields } from "./connectors/mongoDBConfigs";
// import { RabbitMQConfigs, rabbitMQDefault, rabbitMQFields } from "./connectors/rabbitMQConfigs";
// import { RedisConfigs, redisDefault, redisFields } from "./connectors/redisConfigs";
// import { SolrConfigs, solrDefault, solrFields } from "./connectors/solrConfigs";

// export const configs: ConditionalAttachments = {
//   limitation: 'sinkType',
//   fields: {
//     aerospike: aerospikeFields,
//     alluxio: alluxioFields,
//     cassandra: cassandraFields,
//     elasticSearch: elasticSearchFields,
//     flume: flumeFields,
//     hbase: hbaseFields,
//     hdfs2: hdfs2Fields,
//     hdfs3: hdfs3Fields,
//     http: httpFields,
//     influxdbv1: influxDBv1Fields,
//     influxdbv2: influxDBv2Fields,
//     jdbcClickHouse: jdbcFields,
//     jdbcMariaDB: jdbcFields,
//     jdbcOpenMLDB: jdbcFields,
//     jdbcPostgres: jdbcFields,
//     jdbcSQLite: jdbcFields,
//     kafka: kafkaFields,
//     kinesis: kinesisFields,
//     mongodb: mongodbFields,
//     rabbitMQ: rabbitMQFields,
//     redis: redisFields,
//     solr: solrFields,
//   }
// }

// export type ConnectorsConfigsTypes = AerospikeConfigs | AlluxioConfigs | CassandraConfigs | ElasticSearchConfigs | FlumeConfigs | HBaseConfigs | HDFS2Configs | HDFS3Configs | HTTPConfigs | InfluxDBv1Configs | InfluxDBv2Configs | JDBCConfigs | KafkaConfigs | KinesisConfigs | MongoDBConfigs | RabbitMQConfigs | RedisConfigs | SolrConfigs;

// export type ConnectorsConfigs = {
//   [key: string]: ConnectorsConfigsTypes,
//   aerospike: AerospikeConfigs,
//   alluxio: AlluxioConfigs,
//   cassandra: CassandraConfigs,
//   elasticSearch: ElasticSearchConfigs,
//   flume: FlumeConfigs,
//   hbase: HBaseConfigs,
//   hdfs2: HDFS2Configs,
//   hdfs3: HDFS3Configs,
//   http: HTTPConfigs,
//   influxdbv1: InfluxDBv1Configs,
//   influxdbv2: InfluxDBv2Configs,
//   jdbcClickHouse: JDBCConfigs,
//   jdbcMariaDB: JDBCConfigs,
//   jdbcOpenMLDB: JDBCConfigs,
//   jdbcPostgres: JDBCConfigs,
//   jdbcSQLite: JDBCConfigs,
//   kafka: KafkaConfigs,
//   kinesis: KinesisConfigs,
//   mongodb: MongoDBConfigs,
//   rabbitMQ: RabbitMQConfigs,
//   redis: RedisConfigs,
//   solr: SolrConfigs,
// }

// export const defaultConnectorsConfigs: ConnectorsConfigs = {
//   aerospike: aerospikeDefault,
//   alluxio: alluxioDefault,
//   cassandra: cassandraDefault,
//   elasticSearch: elasticSearchDefault,
//   flume: flumeDefault,
//   hbase: hbaseDefault,
//   hdfs2: hdfs2Default,
//   hdfs3: hdfs3Default,
//   http: httpDefault,
//   influxdbv1: influxDBv1Default,
//   influxdbv2: influxDBv2Default,
//   jdbcClickHouse: jdbcDefault,
//   jdbcMariaDB: jdbcDefault,
//   jdbcOpenMLDB: jdbcDefault,
//   jdbcPostgres: jdbcDefault,
//   jdbcSQLite: jdbcDefault,
//   kafka: kafkaDefault,
//   kinesis: kinesisDefault,
//   mongodb: mongoDBDefault,
//   rabbitMQ: rabbitMQDefault,
//   redis: redisDefault,
//   solr: solrDefault,
// }

// export default configs;