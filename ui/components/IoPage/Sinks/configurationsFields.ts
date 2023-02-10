import { IoConfigField } from "../IoConfigField/IoConfigField";

const SUBSCRIPTION_INITIAL_POSITION = ['latest', 'earliest'];
export type SubscriptionInitialPosition = 'latest' | 'earliest';

const PRODUCER_CRYPTO_FAILURE_ACTION = ['fail', 'send'];
export type ProducerCryptoFailureAction = 'fail' | 'send';

const CONSUMER_CRYPTO_FAILURE_ACTION = ['fail', 'discard', 'consume'];
export type ConsumerCryptoFailureAction = 'fail' | 'discard' | 'consume';

const PROCESSING_GUARANTEES = ['atleast_once', 'atmost_once', 'effectively_once'];
export type ProcessingGuarantees = 'atleast_once' | 'atmost_once' | 'effectively_once';

export const configurationsFields: IoConfigField[] = [
  {
    name: 'tenant',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Tenant',
  },
  {
    name: 'namespace',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Namespace',
  },
  {
    name: 'name',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Sink name',
  },
  {
    name: 'inputs',
    type: 'array',
    isRequired: true,
    help: 'list topics',
    label: 'Topics',
  },
  {
    name: 'pathToConnector',
    type: 'pathToConnector',
    isRequired: true,
    help: 'help',
    label: 'Path to connector',
  },
  {
    name: 'sourceSubscriptionName',
    type: 'string',
    isRequired: false,
    help: 'help',
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
    help: 'help',
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
    help: 'help',
    label: 'Inputs specs',
    mapType: [
      {
        name: 'schemaType',
        type: 'string',
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
      {
        name: 'poolMessages',
        type: 'boolean',
        isRequired: false,
        help: 'help',
        label: 'Pool messages',
      },
    ]
  },
  {
    name: 'sinkType',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Sink type',
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
    help: 'help',
    label: 'Parallelism',
  },
  {
    name: 'processingGuarantees',
    type: 'enum',
    isRequired: false,
    help: 'help',
    label: 'Processing guarantees',
    enum: PROCESSING_GUARANTEES,
  },
  {
    name: 'retainOrdering',
    type: 'boolean',
    isRequired: false,
    help: 'help',
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
    help: 'help',
    label: 'Auto ack',
  },
  {
    name: 'timeoutMs',
    type: 'duration',
    isRequired: false,
    help: 'help',
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
    help: 'help',
    label: 'Cleanup subscription',
  },
  {
    name: 'className',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Class name',
  },
  {
    name: 'topicToSerdeClassName',
    type: 'map',
    isRequired: false,
    help: 'help',
    mapType: 'string',
    label: 'Topic to serde class name',
  }, 
  {
    name: 'topicToSchemaType',
    type: 'map',
    isRequired: false,
    help: 'help',
    mapType: 'string',
    label: 'Topic to schema type',
  }, 
  {
    name: 'configs',
    type: 'json',
    isRequired: false,
    help: 'help',
    label: 'Configs',
  },
  {
    name: 'secrets',
    type: 'json',
    isRequired: false,
    help: 'help',
    label: 'Secrets',
  },
  {
    name: 'resources',
    type: 'attachments',
    isRequired: false,
    help: 'help',
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
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Archive',
  },
  {
    name: 'runtimeFlags',
    type: 'string',
    isRequired: false,
    help: 'help',
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

type CryptoConfig = {
  [key: string]: string | string[],
  cryptoKeyReaderClassName: string,
  cryptoKeyReaderConfig: string, // Serialized JSON in a form of Map<String, JsonValue>
  encryptionKeys: string[],
  producerCryptoFailureAction: 'fail' | 'send',
  consumerCryptoFailureAction: 'fail' | 'discard' | 'consume',
}

export type ConsumerConfig = {
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

export type ConsumerConfigMap = {
  [key: string]: ConsumerConfig
}

export type Resources = {
  [key: string]: number,
  cpu: number,
  ram: number,
  disk: number,
}

export type ConfigurationValue = string | string[] | number | StringMap | ConsumerConfigMap | boolean | Resources | PathToConnector

export type PathToConnectorType = 'url' | 'folder';

export type PathToConnector = {
  [key: string]: string,
  type: PathToConnectorType,
  path: string,
}

export type Configurations = {
  [key: string]: ConfigurationValue,
  tenant: string,
  namespace: string,
  name: string,
  pathToConnector: PathToConnector,
  inputs: string[],
  sourceSubscriptionName: string,
  sourceSubscriptionPosition: 'latest' | 'earliest',
  topicsPattern: string,
  topicToSchemaProperties: StringMap,
  inputsSpecs: ConsumerConfigMap,
  maxMessageRetries: number,
  deadLetterTopic: string,
  parallelism: number,
  processingGuarantees: 'atleast_once' | 'atmost_once' | 'effectively_once'
  retainOrdering: boolean,
  retainKeyOrdering: boolean,
  autoAck: boolean,
  timeoutMs: number,
  negativeAckRedeliveryDelayMs: number,
  cleanupSubscription: boolean,
  sinkType: string,
  className: string,
  topicToSerdeClassName: StringMap,
  topicToSchemaType: StringMap,
  configs: string,  // Serialized JSON in a form of Map<String, JsonValue>
  secrets: string,  // Serialized JSON in a form of Map<String, JsonValue>
  resources: Resources,
  archive: string,
  runtimeFlags: string,
  customRuntimeOptions: string,
}

export const configurations: Configurations = {
  tenant: 'public',
  namespace: 'default',
  name: 'users',
  pathToConnector: {
    type: 'url',
    path: 'jdbc-postgres'
  },
  inputs: [
    'users-topic'
  ],
  sourceSubscriptionName: '',
  sourceSubscriptionPosition: 'latest',
  topicsPattern: '',
  topicToSchemaProperties: {},
  inputsSpecs: {
    'ExampleSchema': {
      name: 'New',
      schemaType: 'AVRO',
      serdeClassName: '',
      schemaProperties: {},
      consumerProperties: {},
      receiverQueueSize: 0,
      poolMessages: false,
      isRegexPattern: false,
      cryptoConfig: {
        cryptoKeyReaderClassName: '',
        cryptoKeyReaderConfig: '',
        encryptionKeys: [],
        producerCryptoFailureAction: 'fail',
        consumerCryptoFailureAction: 'fail'
      },
    },
  },
  sinkType: '',
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
  className: '',
  topicToSerdeClassName: {},
  topicToSchemaType: {},
  configs: '{ \"userName\": \"postgres\", \"password\": \"postgres\", \"jdbcUrl\": \"jdbc:postgresql://postgresql:5432/postgres\", \"tableName\": \"users\"}',
  secrets: '',
  resources: { cpu: 0, ram: 0, disk: 0 },
  archive: '',
  runtimeFlags: '',
  customRuntimeOptions: '',
}