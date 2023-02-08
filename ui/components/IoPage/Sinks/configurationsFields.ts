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
  },
  {
    name: 'namespace',
    type: 'string',
    isRequired: true,
    help: 'help',
  },
  {
    name: 'name',
    type: 'string',
    isRequired: true,
    help: 'help',
  },
  {
    name: 'inputs',
    type: 'array',
    isRequired: true,
    help: 'help',
  },
  {
    name: 'pathToConnector',
    type: 'pathToConnector',
    isRequired: true,
    help: 'help',
  },
  {
    name: 'sourceSubscriptionName',
    type: 'string',
    isRequired: false,
    help: 'help',
  },
  {
    name: 'sourceSubscriptionPosition',
    type: 'enum',
    isRequired: false,
    help: 'help',
    enum: SUBSCRIPTION_INITIAL_POSITION,
  }, 
  {
    name: 'topicsPattern',
    type: 'string',
    isRequired: false,
    help: 'help',
  },
  {
    name: 'topicToSchemaProperties',
    type: 'map',
    isRequired: false,
    help: 'help',
    mapType: 'string',
  }, 
  {
    name: 'inputsSpecs',
    type: 'map',
    isRequired: false,
    help: 'help',
    mapType: [
      {
        name: 'schemaType',
        type: 'string',
        isRequired: false,
        help: 'help',
      },
      {
        name: 'serdeClassName',
        type: 'string',
        isRequired: false,
        help: 'help',
      },
      {
        name: 'isRegexPattern',
        type: 'boolean',
        isRequired: false,
        help: 'help',
      },
      {
        name: 'schemaProperties',
        type: 'map',
        isRequired: false,
        help: 'help',
        mapType: 'string',
      },
      {
        name: 'consumerProperties',
        type: 'map',
        isRequired: false,
        help: 'help',
        mapType: 'string',
      },
      {
        name: 'receiverQueueSize',
        type: 'int',
        isRequired: false,
        help: 'help',
      },
      {
        name: 'cryptoConfig',
        type: 'attachments',
        isRequired: false,
        help: 'help',
        attachments: [
          {
            name: 'cryptoKeyReaderClassName',
            type: 'string',
            isRequired: false,
            help: 'help',
          },
          {
            name: 'cryptoKeyReaderConfig',
            type: 'json',
            isRequired: false,
            help: 'help',
          },
          {
            name: 'encryptionKeys',
            type: 'array',
            isRequired: false,
            help: 'help',
          },
          {
            name: 'producerCryptoFailureAction',
            type: 'enum',
            isRequired: false,
            help: 'help',
            enum: PRODUCER_CRYPTO_FAILURE_ACTION,
          },
          {
            name: 'consumerCryptoFailureAction',
            type: 'enum',
            isRequired: false,
            help: 'help',
            enum: CONSUMER_CRYPTO_FAILURE_ACTION,
          },
        ]
      },
      {
        name: 'poolMessages',
        type: 'boolean',
        isRequired: false,
        help: 'help',
      },
    ]
  },
  {
    name: 'maxMessageRetries',
    type: 'int',
    isRequired: false,
    help: 'help',
  },
  {
    name: 'deadLetterTopic',
    type: 'string',
    isRequired: false,
    help: 'help',
  },
  {
    name: 'parallelism',
    type: 'int',
    isRequired: false,
    help: 'help',
  },
  {
    name: 'processingGuarantees',
    type: 'enum',
    isRequired: false,
    help: 'help',
    enum: PROCESSING_GUARANTEES,
  },
  {
    name: 'retainOrdering',
    type: 'boolean',
    isRequired: false,
    help: 'help',
  },
  {
    name: 'retainKeyOrdering',
    type: 'boolean',
    isRequired: false,
    help: 'help',
  },
  {
    name: 'autoAck',
    type: 'boolean',
    isRequired: false,
    help: 'help',
  },
  {
    name: 'timeoutMs',
    type: 'duration',
    isRequired: false,
    help: 'help',
  },
  {
    name: 'negativeAckRedeliveryDelayMs',
    type: 'duration',
    isRequired: false,
    help: 'help',
  },
  {
    name: 'cleanupSubscription',
    type: 'boolean',
    isRequired: false,
    help: 'help',
  },
  {
    name: 'className',
    type: 'string',
    isRequired: false,
    help: 'help',
  },
  {
    name: 'topicToSerdeClassName',
    type: 'map',
    isRequired: false,
    help: 'help',
    mapType: 'string',
  }, 
  {
    name: 'topicToSchemaType',
    type: 'map',
    isRequired: false,
    help: 'help',
    mapType: 'string',
  }, 
  {
    name: 'configs',
    type: 'json',
    isRequired: false,
    help: 'help',
  },
  {
    name: 'secrets',
    type: 'json',
    isRequired: false,
    help: 'help',
  },
  {
    name: 'resources',
    type: 'attachments',
    isRequired: false,
    help: 'help',
    attachments: [
      {
        name: 'cpu',
        type: 'int',
        isRequired: false,
        help: 'help',
      },
      {
        name: 'ram',
        type: 'bytes',
        isRequired: false,
        help: 'help',
      },
      {
        name: 'disk',
        type: 'bytes',
        isRequired: false,
        help: 'help',
      },
    ]
  },
  {
    name: 'archive',
    type: 'string',
    isRequired: false,
    help: 'help',
  },
  {
    name: 'runtimeFlags',
    type: 'string',
    isRequired: false,
    help: 'help',
  },
  {
    name: 'customRuntimeOptions',
    type: 'string',
    isRequired: false,
    help: 'help',
  },
]

export type StringMapItem = {
  [key: string]: string,
  name: string,
  value: string,
}
export type StringMap = {
  [key: string]: StringMapItem,
}

type CryptoConfig = {
  [key: string]: string | string[],
  cryptoKeyReaderClassName: string,
  cryptoKeyReaderConfig: string, // Serialized JSON in a form of Map<String, JsonValue>
  encryptionKeys: string[],
  producerCryptoFailureAction: 'fail' | 'send',
  consumerCryptoFailureAction: 'fail' | 'discard' | 'consume',
}

type ConsumerConfig = {
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

type ConsumerConfigMap = {
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

  //unrequired

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
  
  //advanced

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
    path: 'https://archive.apache.org/dist/pulsar/pulsar-2.11.0/connectors/pulsar-io-jdbc-postgres-2.11.0.nar'
  },
  inputs: [
    'persistent://public/default/users'
  ],

  //unrequired

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
      cryptoConfig: {  // make me
        cryptoKeyReaderClassName: '',
        cryptoKeyReaderConfig: '',
        encryptionKeys: [],
        producerCryptoFailureAction: 'fail',
        consumerCryptoFailureAction: 'fail'
      },
    },
  },
  maxMessageRetries: 0,
  deadLetterTopic: '',
  parallelism: 0,
  processingGuarantees: 'atleast_once',
  retainOrdering: false,
  retainKeyOrdering: false,
  autoAck: false,
  timeoutMs: 0,
  negativeAckRedeliveryDelayMs: 0,
  cleanupSubscription: false,

  //advanced

  className: '',
  topicToSerdeClassName: {},
  topicToSchemaType: {},
  // configs: '',
  configs: '{ \"userName\": \"postgres\", \"password\": \"postgres\", \"jdbcUrl\": \"jdbc:postgresql://localhost:5432/postgres\", \"tableName\": \"users\"}',
  secrets: '',
  resources: { cpu: 0, ram: 0, disk: 0 },
  archive: '',
  runtimeFlags: '',
  customRuntimeOptions: '',
}