import { IoConfigField } from "../../IoConfigField/IoConfigField";
import { CONSUMER_CRYPTO_FAILURE_ACTION, PROCESSING_GUARANTEES, ProcessingGuarantees, PRODUCER_CRYPTO_FAILURE_ACTION, Resources, StringMap, ProducerCryptoFailureAction, ConsumerCryptoFailureAction, Archive } from "../../Sinks/configurationsFields/configurationsFields";
import { defaultConnectorsConfigs, sourceConfigs, SourceConnectorsConfigs } from "./connectrosConfigs/configs";

export type SourceClassName = 'canal' | 'debeziumMySql' | 'debeziumPostgres' | 'debeziumMongoDb' | 'debeziumOracle' | 'debeziumMsSql' | 'dynamoDb' | 'file' | 'flume' | 'twitterFireHouse' | 'kafkaAbstract' | 'kinesis' | 'mongo' | 'netty' | 'nsq' | 'rabbitMq';

const SOURCE_CLASS_NAME = [
  { value: 'canal', label: 'Canal' },
  { value: 'debeziumMySql', label: 'Debezium my sql' },
  { value: 'debeziumPostgres', label: 'Debezium postgres' },
  { value: 'debeziumMongoDb', label: 'Debezium mongo DB' },
  { value: 'debeziumOracle', label: 'Debezium oracle' },
  { value: 'debeziumMsSql', label: 'Debezium msq sql' },
  { value: 'dynamoDb', label: 'Dynamo DB' },
  { value: 'file', label: 'File' },
  { value: 'flume', label: 'Flume' },
  { value: 'twitterFireHouse', label: 'Twitter fire house' },
  { value: 'kafkaAbstract', label: 'Kafka abstract' },
  { value: 'kinesis', label: 'Kinesis' },
  { value: 'mongo', label: 'Mongo' },
  { value: 'netty', label: 'Netty' },
  { value: 'nsq', label: 'NSQ' },
  { value: 'rabbitMq', label: 'Rabbit MQ' },
];

export const sourceConfigurationsFields: IoConfigField[] = [
  {
    name: 'name',
    type: 'string',
    isRequired: true,
    help: 'Must be unique',
    label: 'Sink name',
  },
  {
    name: 'className',
    type: 'enum',
    isRequired: true,
    help: 'The class name of a Pulsar Sink if archive is file url path',
    label: 'Class name',
    enum: SOURCE_CLASS_NAME,
  },
  {
    name: 'topicName',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Topic name',
  },
  {
    name: 'producerConfig',
    type: 'attachments',
    isRequired: true,
    help: 'help',
    label: 'Producer config',
    attachments: [
      {
        name: 'maxPendingMessages',
        type: 'int',
        isRequired: true,
        help: 'help',
        label: 'Max pending messages',
      },
      {
        name: 'maxPendingMessagesAcrossPartitions',
        type: 'int',
        isRequired: true,
        help: 'help',
        label: 'Max pending messages across partitions',
      },
      {
        name: 'useThreadLocalProducers',
        type: 'boolean',
        isRequired: true,
        help: 'help',
        label: 'Use thread local producers',
      },
      {
        name: 'batchBuilder',
        type: 'string',
        isRequired: true,
        help: 'help',
        label: 'Batch builder',
      },
      {
        name: 'cryptoConfig',
        type: 'attachments',
        isRequired: true,
        help: 'help',
        label: 'Crypto config',
        attachments: [
          {
            name: 'cryptoKeyReaderClassName',
            type: 'string',
            isRequired: true,
            help: 'help',
            label: 'Crypto key reader class name',
          },
          {
            name: 'cryptoKeyReaderConfig',
            type: 'json',
            isRequired: true,
            help: 'help',
            label: 'Crypto key reader config',
          },
          {
            name: 'encryptionKeys',
            type: 'array',
            isRequired: true,
            help: 'help',
            label: 'Encryption keys',
          },
          {
            name: 'consumerCryptoFailureAction',
            type: 'enum',
            isRequired: true,
            help: 'help',
            label: 'Consumer crypto failure action',
            enum: CONSUMER_CRYPTO_FAILURE_ACTION,
          },
          {
            name: 'producerCryptoFailureAction',
            type: 'enum',
            isRequired: true,
            help: 'help',
            label: 'Producer crypto failure action',
            enum: PRODUCER_CRYPTO_FAILURE_ACTION,
          },
        ]
      },
    ]
  },
  {
    name: 'serdeClassName',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Serde class name',
  },
  {
    name: 'schemaType',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Schema type',
  },
  {
    name: 'configs',
    type: 'conditionalAttachments',
    isRequired: true,
    help: 'help',
    label: 'Configs',
    conditionalAttachments: sourceConfigs,
  },
  {
    name: 'secrets',
    type: 'json',
    isRequired: true,
    help: 'help',
    label: 'Secrets',
  },
  {
    name: 'parallelism',
    type: 'int',
    isRequired: true,
    help: 'help',
    label: 'Parallelism',
  },
  {
    name: 'processingGuarantees',
    type: 'enum',
    isRequired: true,
    help: 'help',
    label: 'Processing guarantees',
    enum: PROCESSING_GUARANTEES,
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
    isRequired: true,
    help: 'help',
    label: 'Archive',
  },
  {
    name: 'runtimeFlags',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Runtime flags',
  },
  {
    name: 'customRuntimeOptions',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Custom runtime options',
  },
  {
    name: 'batchSourceConfig',
    type: 'attachments',
    isRequired: true,
    help: 'help',
    label: 'Batch source config',
    attachments: [
      {
        name: 'discoveryTriggererClassName',
        type: 'string',
        isRequired: true,
        help: 'help',
        label: 'Discovery triggerer class name',
      },
      {
        name: 'discoveryTriggererConfig',
        type: 'json',
        isRequired: true,
        help: 'help',
        label: 'Discovery triggerer config',
      },
    ],
  },
  {
    name: 'batchBuilder',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Batch builder',
  },
];

export type CryptoConfig = {
  [key: string]: string | string[],
  cryptoKeyReaderClassName: string,
  cryptoKeyReaderConfig: string
  encryptionKeys: string[];
  producerCryptoFailureAction:  ProducerCryptoFailureAction;
  consumerCryptoFailureAction: ConsumerCryptoFailureAction;
}

export type ProducerConfig = {
  [key: string]: string | number | boolean | CryptoConfig,
  maxPendingMessages: number,
  maxPendingMessagesAcrossPartitions: number,
  useThreadLocalProducers: boolean,
  cryptoConfig: CryptoConfig,
  batchBuilder: string,
}

export type BatchSourceConfig = {
  [key: string]: string,
  discoveryTriggererClassName: string,
  discoveryTriggererConfig: string,
}

export type SourceConfigurationValue = string | string[] | number | boolean | StringMap| Resources | BatchSourceConfig | ProducerConfig | SourceConnectorsConfigs | Date;

export type SourceConfigurations = {
  [key: string]: SourceConfigurationValue,
  name: string,
  className: SourceClassName,
  topicName: string,
  producerConfig: ProducerConfig,
  serdeClassName: string,
  schemaType: string,
  configs: SourceConnectorsConfigs,
  secrets: string, // map<String, Json(Object)>
  parallelism: number,
  processingGuarantees: ProcessingGuarantees,
  resources: Resources,
  archive: Archive,
  runtimeFlags: string,
  customRuntimeOptions: string,
  batchSourceConfig: BatchSourceConfig,
  batchBuilder: string,
}

export const sourceConfigurations: SourceConfigurations = {
  name: '',
  className: 'debeziumPostgres',
  topicName: '',
  producerConfig: {
    maxPendingMessages: 0,
    maxPendingMessagesAcrossPartitions: 0,
    useThreadLocalProducers: true,
    cryptoConfig: {
      cryptoKeyReaderClassName: '',
      cryptoKeyReaderConfig: '',
      encryptionKeys: [],
      producerCryptoFailureAction: 'fail',
      consumerCryptoFailureAction: 'fail',
    },
    batchBuilder: '',
  },
  serdeClassName: '',
  schemaType: '',
  configs: defaultConnectorsConfigs,
  secrets: '', // map<String, Json(Object)>
  parallelism: 0,
  processingGuarantees: 'atleast_once',
  resources: {
    cpu: 0,
    ram: 0,
    disk: 0,
  },
  archive: {
    type: 'url',
    path: '', // TODO change on postgres
  },
  runtimeFlags: '',
  customRuntimeOptions: '',
  batchSourceConfig: {
    discoveryTriggererClassName: '',
    discoveryTriggererConfig: '',
  },
  batchBuilder: '',
}

export const sourceConnectors = ['canal', 'debezium-mongodb', 'debezium-mssql', 'debezium-mysql', 'debezium-oracle', 'debezium-postgres', 'dynamodb', 'file', 'flume', 'kafka', 'kinesis', 'mongo', 'netty', 'nsq', 'rabbitmq', 'twitter'];