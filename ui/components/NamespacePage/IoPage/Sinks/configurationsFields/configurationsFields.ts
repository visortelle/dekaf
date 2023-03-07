import { IoConfigField } from "../../IoConfigField/IoConfigField";
import { defaultConnectorsConfigs, SinkConnectorsConfigs, sinksConfigs } from './connectrosConfigs/configs';

const SUBSCRIPTION_INITIAL_POSITION = [ { value: 'latest', label: 'Latest' }, { value: 'earliest', label: 'Earliest' } ];
export type SubscriptionInitialPosition = 'latest' | 'earliest';

export const PRODUCER_CRYPTO_FAILURE_ACTION = [ { value: 'fail', label: 'Fail' }, { value: 'send', label: 'Send' } ];
export type ProducerCryptoFailureAction = 'fail' | 'send';

export const CONSUMER_CRYPTO_FAILURE_ACTION = [ { value: 'fail', label: 'Fail' }, { value: 'discard', label: 'Discard' }, { value: 'consume', label: 'Consume' } ];
export type ConsumerCryptoFailureAction = 'fail' | 'discard' | 'consume';

export const PROCESSING_GUARANTEES = [ { value: 'atleast_once', label: 'Atleast once' }, { value: 'atmost_once', label: 'Atmost once' }, { value: 'effectively_once', label: 'Effectively once' } ];
export type ProcessingGuarantees = 'atleast_once' | 'atmost_once' | 'effectively_once';

export const SINK_TYPE = [ { value: 'aerospike', label: 'Aerospike' }, { value: 'alluxio', label: 'Alluxio' }, { value: 'cassandra', label: 'Cassandra' }, { value: 'elasticSearch', label: 'Elastic search' }, { value: 'flume', label: 'Flume' }, { value: 'hbase', label: 'Hbase' }, { value: 'hdfs2', label: 'HDFS2' }, { value: 'hdfs3', label: 'HDFS3' }, { value: 'http', label: 'HTTP' }, { value: 'influxdbv1', label: 'InfluxDB v1' }, { value: 'influxdbv2', label: 'InfluxDB v2' }, { value: 'jdbcClickHouse', label: 'JDBC Click house' }, { value: 'jdbcMariaDB', label: 'JDBC Maria DB' }, { value: 'jdbcOpenMLDB', label: 'JDBC Open MLDB' }, { value: 'jdbcPostgres', label: 'JDBC Postgres' }, { value: 'jdbcSQLite', label: 'JDBC SQLite' }, { value: 'kafka', label: 'Kafka' }, { value: 'kinesis', label: 'Kinesis' }, { value: 'mongodb', label: 'Mongo DB' }, { value: 'rabbitMQ', label: 'Rabbit MQ' }, { value: 'redis', label: 'Redis' }, { value: 'solr', label: 'Solr' } ];
export type SinkType = 'aerospike' | 'alluxio' | 'cassandra' | 'elasticSearch' | 'flume' | 'hbase' | 'hdfs2' | 'hdfs3' | 'http' | 'influxdbv1' | 'influxdbv2' | 'jdbcClickHouse' | 'jdbcMariaDB' | 'jdbcOpenMLDB' | 'jdbcPostgres' | 'jdbcSQLite' | 'kafka' | 'kinesis' | 'mongodb' | 'rabbitMQ' | 'redis' | 'solr';

const CLASS_NAME = [ { value: 'AerospikeStringSink', label: 'Aerospike' }, { value: 'AlluxioSink', label: 'Alluxio' }, { value: 'CassandraStringSink', label: 'Cassandra' }, { value: 'ElasticSearchSink', label: 'Elastic' }, { value: 'StringSink', label: 'flume' }, { value: 'HbaseAbstractConfig', label: 'HBase' }, { value: 'AbstractHdfs2Connector', label: 'HDFS2' }, { value: 'AbstractHdfs3Connector', label: 'HDFS3' }, { value: 'HttpSink', label: 'Http' }, { value: 'InfluxDBGenericRecordSink', label: 'InfluxDB' }, { value: 'ClickHouseJdbcAutoSchemaSink', label: 'JDBC click house' }, { value: 'MariadbJdbcAutoSchemaSink', label: 'Maria JDBC' }, { value: 'OpenMLDBJdbcAutoSchemaSink', label: 'OpenMLDB JDBC' }, { value: 'PostgresJdbcAutoSchemaSink', label: 'Postgres JDBC' }, { value: 'SqliteJdbcAutoSchemaSink', label: 'Sqlite JDBC' }, { value: 'KafkaAbstractSink', label: 'Kafka' }, { value: 'KinesisSink', label: 'Kinesis' }, { value: 'MongoSink', label: 'Mongo' }, { value: 'RabbitMQSink', label: 'Rabbit MQ' }, { value: 'RedisAbstractConfig', label: 'Redis' }, { value: 'SolrSinkConfig', label: 'Solr' }];
export type ClassName = 'AerospikeStringSink' | 'AlluxioSink' | 'CassandraStringSink' | 'ElasticSearchSink' | 'StringSink' | 'HbaseAbstractConfig' | 'AbstractHdfs2Connector' | 'AbstractHdfs3Connector' | 'HttpSink' | 'ClickHouseJdbcAutoSchemaSink' | 'InfluxDBGenericRecordSink' | 'MariadbJdbcAutoSchemaSink' | 'OpenMLDBJdbcAutoSchemaSink' | 'PostgresJdbcAutoSchemaSink' | 'SqliteJdbcAutoSchemaSink' | 'KafkaAbstractSink' | 'KinesisSink' | 'MongoSink' | 'RabbitMQSink' | 'RedisAbstractConfig' | 'SolrSinkConfig';

export const sinkConfigurationsFields: IoConfigField[] = [
  {
    name: 'name',
    type: 'string',
    isRequired: true,
    help: 'Must be unique',
    label: 'Sink name',
  },
  {
    name: 'inputs',
    type: 'array',
    isRequired: true,
    help: 'List of consumed topics',
    label: 'Topics',
  },
  {
    name: 'className',
    type: 'enum',
    isRequired: true,
    help: 'The class name of a Pulsar Sink if archive is file url path',
    label: 'Class name',
    enum: CLASS_NAME,
  },
  {
    name: 'sinkType',
    type: 'enum',
    isRequired: true,
    help: 'help', // TODO write description
    label: 'Sink type',
    enum: SINK_TYPE,
  },
  {
    name: 'configs',
    type: 'conditionalAttachments',
    isRequired: true,
    help: 'Data to connect to the database',
    label: 'Configs',
    conditionalAttachments: sinksConfigs,
  },
  {
    name: 'sourceSubscriptionName',
    type: 'string',
    isRequired: false,
    help: 'Pulsar source subscription name if user wants a specific subscription-name for input-topic consumer',
    label: 'Source subscription name',
  },
  {
    name: 'sourceSubscriptionPosition',
    type: 'enum',
    isRequired: false,
    help: 'help',
    label: 'Source subscription position',
    enum: SUBSCRIPTION_INITIAL_POSITION,
  }, 
  {
    name: 'topicsPattern',
    type: 'string',
    isRequired: false,
    help: 'TopicsPattern to consume from list of topics under a namespace that  match the pattern. [input] and [topicsPattern] are mutually exclusive. Add SerDe class name for a pattern in customSerdeInputs (supported for java fun only)',
    label: 'Topics pattern',
  },
  {
    name: 'topicToSchemaProperties',
    type: 'map',
    isRequired: false,
    help: 'help',
    label: 'Topics to schema properties',
    mapType: 'string',
  }, 
  {
    name: 'inputsSpecs',
    type: 'map',
    isRequired: false,
    help: 'The map of input topics to its consumer configuration',
    label: 'Inputs specs',
    mapType: [
      {
        name: 'schemaType',
        type: 'schemaType',
        isRequired: false,
        help: 'help',
        label: 'Schema type',
      },
      {
        name: 'serdeClassName',
        type: 'string',
        isRequired: false,
        help: 'help',
        label: 'Serde class name',
      },
      {
        name: 'isRegexPattern',
        type: 'boolean',
        isRequired: false,
        help: 'help',
        label: 'Is regex pattern',
      },
      {
        name: 'schemaProperties',
        type: 'map',
        isRequired: false,
        help: 'help',
        mapType: 'string',
        label: 'Schema properties',
      },
      {
        name: 'consumerProperties',
        type: 'map',
        isRequired: false,
        help: 'help',
        mapType: 'string',
        label: 'Consumer properties',
      },
      {
        name: 'receiverQueueSize',
        type: 'int',
        isRequired: false,
        help: 'help',
        label: 'Receiver queue size',
      },
      {
        name: 'poolMessages',
        type: 'boolean',
        isRequired: false,
        help: 'help',
        label: 'Pool messages',
      },
      {
        name: 'cryptoConfig',
        type: 'attachments',
        isRequired: false,
        help: 'help',
        label: 'Crypto config',
        attachments: [
          {
            name: 'cryptoKeyReaderClassName',
            type: 'string',
            isRequired: false,
            help: 'help',
            label: 'Crypto key reader class name',
          },
          {
            name: 'cryptoKeyReaderConfig',
            type: 'json',
            isRequired: false,
            help: 'help',
            label: 'Crypto key reader config',
          },
          {
            name: 'encryptionKeys',
            type: 'array',
            isRequired: false,
            help: 'help',
            label: 'Encryption keys',
          },
          {
            name: 'producerCryptoFailureAction',
            type: 'enum',
            isRequired: false,
            help: 'help',
            label: 'Producer crypto failure action',
            enum: PRODUCER_CRYPTO_FAILURE_ACTION,
          },
          {
            name: 'consumerCryptoFailureAction',
            type: 'enum',
            isRequired: false,
            help: 'help',
            label: 'Consumer crypto failure action',
            enum: CONSUMER_CRYPTO_FAILURE_ACTION,
          },
        ]
      },
    ]
  },
  {
    name: 'maxMessageRetries',
    type: 'int',
    isRequired: false,
    help: 'help',
    label: 'Max message retries',
  },
  {
    name: 'deadLetterTopic',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Dead letter topic',
  },
  {
    name: 'parallelism',
    type: 'int',
    isRequired: false,
    help: 'The number of a Pulsar Sink instances to run',
    label: 'Parallelism',
  },
  {
    name: 'processingGuarantees',
    type: 'enum',
    isRequired: false,
    help: 'The processing guarantees (aka delivery semantics) applied to the Pulsar Sink',
    label: 'Processing guarantees',
    enum: PROCESSING_GUARANTEES,
  },
  {
    name: 'retainOrdering',
    type: 'boolean',
    isRequired: false,
    help: 'Boolean denotes whether the Pulsar Sink consumes and processes messages in order',
    label: 'Retain ordering',
  },
  {
    name: 'retainKeyOrdering',
    type: 'boolean',
    isRequired: false,
    help: 'help',
    label: 'Retain key ordering',
  },
  {
    name: 'autoAck',
    type: 'boolean',
    isRequired: false,
    help: 'Boolean denotes whether or not the framework will automatically acknowledge messages',
    label: 'Auto ack',
  },
  {
    name: 'timeoutMs',
    type: 'duration',
    isRequired: false,
    help: 'Long denotes the message timeout in milliseconds',
    label: 'Timeout',
  },
  {
    name: 'negativeAckRedeliveryDelayMs',
    type: 'duration',
    isRequired: false,
    help: 'help',
    label: 'Negative ack redelivery delay'
  },
  {
    name: 'cleanupSubscription',
    type: 'boolean',
    isRequired: false,
    help: 'Boolean denotes whether the subscriptions the functions created/used should be deleted when the functions is deleted',
    label: 'Cleanup subscription',
  },
  {
    name: 'topicToSerdeClassName',
    type: 'map',
    isRequired: false,
    help: 'The map of input topics to SerDe class names',
    mapType: 'string',
    label: 'Topic to serde class name',
  }, 
  {
    name: 'topicToSchemaType',
    type: 'map',
    isRequired: false,
    help: 'The map of input topics to Schema types or class names',
    mapType: 'string',
    label: 'Topic to schema type',
  }, 
  {
    name: 'secrets',
    type: 'json',
    isRequired: false,
    help: 'A map of secretName(aka how the secret is going to be accessed in the function via context) to an object that encapsulates how the secret is fetched by the underlying secrets provider',
    label: 'Secrets',
  },
  {
    name: 'resources',
    type: 'attachments',
    isRequired: false,
    help: 'The CPU (in cores), RAM (in bytes) and disk (in bytes) that needs to be allocated per Pulsar Sink instance (applicable only to Docker runtime)',
    label: 'Resources',
    attachments: [
      {
        name: 'cpu',
        type: 'int',
        isRequired: false,
        help: 'help',
        label: 'CPU',
      },
      {
        name: 'ram',
        type: 'bytes',
        isRequired: false,
        help: 'help',
        label: 'RAM',
      },
      {
        name: 'disk',
        type: 'bytes',
        isRequired: false,
        help: 'help',
        label: 'Disk',
      },
    ]
  },
  {
    name: 'archive',
    type: 'archive',
    isRequired: false,
    help: 'help',
    label: 'Archive',
  },
  {
    name: 'runtimeFlags',
    type: 'string',
    isRequired: false,
    help: 'Any flags that you want to pass to the runtime as a single string',
    label: 'Runtime flags',
  },
  {
    name: 'customRuntimeOptions',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Custom runtime options',
  },
]

export type StringMap = {
  [key: string]: string,
}

export type CryptoConfig = {
  [key: string]: string | string[],
  cryptoKeyReaderClassName: string,
  cryptoKeyReaderConfig: string, // Serialized JSON in a form of Map<String, JsonValue>
  encryptionKeys: string[],
  producerCryptoFailureAction: ProducerCryptoFailureAction,
  consumerCryptoFailureAction: ConsumerCryptoFailureAction,
}

export type InputSpecs = {
  [key: string]: string | number | boolean | StringMap | CryptoConfig,
  name: string,
  schemaType: string,
  serdeClassName: string,
  isRegexPattern: boolean,
  schemaProperties: StringMap,
  consumerProperties: StringMap,
  receiverQueueSize: number,
  poolMessages: boolean,
  cryptoConfig: CryptoConfig,
}

export type InputsSpecs = {
  [key: string]: InputSpecs
}

export type Resources = {
  [key: string]: number,
  cpu: number,
  ram: number,
  disk: number,
}

export type ArchiveType = 'url' | 'folder';

export type Archive = {
  [key: string]: string,
  type: ArchiveType,
  path: string,
}

export type SinkConfigurationValue = string | string[] | number | StringMap | InputsSpecs | boolean | Resources | SinkConnectorsConfigs

export type SinkConfigurations = {
  [key: string]: SinkConfigurationValue,
  name: string,
  inputs: string[],
  sourceSubscriptionName: string,
  sourceSubscriptionPosition: SubscriptionInitialPosition,
  topicsPattern: string,
  topicToSchemaProperties: StringMap,
  inputsSpecs: InputsSpecs,
  maxMessageRetries: number,
  deadLetterTopic: string,
  parallelism: number,
  processingGuarantees: ProcessingGuarantees
  retainOrdering: boolean,
  retainKeyOrdering: boolean,
  autoAck: boolean,
  timeoutMs: number,
  negativeAckRedeliveryDelayMs: number,
  cleanupSubscription: boolean,
  sinkType: SinkType,
  className: ClassName,
  topicToSerdeClassName: StringMap,
  topicToSchemaType: StringMap,
  configs: SinkConnectorsConfigs,  // Serialized JSON in a form of Map<String, JsonValue>
  secrets: string,  // Serialized JSON in a form of Map<String, JsonValue>
  resources: Resources,
  archive: Archive,
  runtimeFlags: string,
  customRuntimeOptions: string,
}

export const sinkConfigurations: SinkConfigurations = {
  name: 'users',
  inputs: ['users-topic'],
  sourceSubscriptionName: '',
  sourceSubscriptionPosition: 'latest',
  topicsPattern: '',
  topicToSchemaProperties: {},
  inputsSpecs: {
    default: {
      name: '',
      schemaType: '',
      serdeClassName: '',
      isRegexPattern: false,
      schemaProperties: {},
      consumerProperties: {},
      receiverQueueSize: 0,
      poolMessages: false,
      cryptoConfig: {
        cryptoKeyReaderClassName: '',
        cryptoKeyReaderConfig: '',
        encryptionKeys: [],
        producerCryptoFailureAction: 'fail',
        consumerCryptoFailureAction: 'fail',
      },
    }
  },
  sinkType: 'jdbcPostgres',
  maxMessageRetries: 0,
  deadLetterTopic: '',
  parallelism: 0,
  processingGuarantees: 'atmost_once',
  retainOrdering: false,
  retainKeyOrdering: false,
  autoAck: true,
  timeoutMs: 0,
  negativeAckRedeliveryDelayMs: 0,
  cleanupSubscription: true,
  className: 'PostgresJdbcAutoSchemaSink',
  topicToSerdeClassName: {},
  topicToSchemaType: {},
  configs: defaultConnectorsConfigs,
  secrets: '',
  resources: { cpu: 0, ram: 0, disk: 0 },
  archive: {
    type: 'url',
    path: 'jdbc-postgres'
  },
  runtimeFlags: '',
  customRuntimeOptions: '',
}

export const sinkConnectors = ['aerospike', 'cassandra', 'elastic-search', 'flume', 'hbase', 'hdfs2', 'hdfs3', 'http', 'influxdb', 'jdbc-clickhouse', 'jdbc-mariadb', 'jdbc-openmldb', 'jdbc-postgres', 'jdbc-sqlite', 'kafka', 'mongo', 'rabbitmq', 'redis', 'solr'];
