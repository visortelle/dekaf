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
    name: 'className',
    type: 'string',
    isRequired: true,
    help: 'help',
  },
  {
    name: 'sourceSubscriptionName',
    type: 'string',
    isRequired: true,
    help: 'help',
  },
  {
    name: 'sourceSubscriptionPosition',
    type: 'enum',
    isRequired: true,
    help: 'help',
    enum: SUBSCRIPTION_INITIAL_POSITION,
  }, 
  {
    name: 'inputs',
    type: 'array',
    isRequired: true,
    help: 'help',
  },
  {
    name: 'topicToSerdeClassName',
    type: 'map',
    isRequired: true,
    help: 'help',
    mapType: 'string',
  }, 
  {
    name: 'topicsPattern',
    type: 'string',
    isRequired: true,
    help: 'help',
  },
  {
    name: 'topicToSchemaType',
    type: 'map',
    isRequired: true,
    help: 'help',
    mapType: 'string',
  }, 
  {
    name: 'topicToSchemaProperties',
    type: 'map',
    isRequired: true,
    help: 'help',
    mapType: 'string',
  }, 
  {
    name: 'inputsSpecs',
    type: 'map',
    isRequired: true,
    help: 'help',
    mapType: [
      {
        name: 'schemaType',
        type: 'string',
        isRequired: true,
        help: 'help',
      },
      {
        name: 'serdeClassName',
        type: 'string',
        isRequired: true,
        help: 'help',
      },
      {
        name: 'isRegexPattern',
        type: 'boolean',
        isRequired: true,
        help: 'help',
      },
      {
        name: 'schemaProperties',
        type: 'map',
        isRequired: true,
        help: 'help',
        mapType: 'string',
      },
      {
        name: 'consumerProperties',
        type: 'map',
        isRequired: true,
        help: 'help',
        mapType: 'string',
      },
      {
        name: 'receiverQueueSize',
        type: 'int',
        isRequired: true,
        help: 'help',
      },
      {
        name: 'cryptoConfig',
        type: 'attachments',
        isRequired: true,
        help: 'help',
        attachments: [
          {
            name: 'cryptoKeyReaderClassName',
            type: 'string',
            isRequired: true,
            help: 'help',
          },
          {
            name: 'cryptoKeyReaderConfig',
            type: 'json',
            isRequired: true,
            help: 'help',
          },
          {
            name: 'encryptionKeys',
            type: 'array',
            isRequired: true,
            help: 'help',
          },
          {
            name: 'producerCryptoFailureAction',
            type: 'enum',
            isRequired: true,
            help: 'help',
            enum: PRODUCER_CRYPTO_FAILURE_ACTION,
          },
          {
            name: 'consumerCryptoFailureAction',
            type: 'enum',
            isRequired: true,
            help: 'help',
            enum: CONSUMER_CRYPTO_FAILURE_ACTION,
          },
        ]
      },
      {
        name: 'poolMessages',
        type: 'boolean',
        isRequired: true,
        help: 'help',
      },
    ]
  },
  {
    name: 'maxMessageRetries',
    type: 'int',
    isRequired: true,
    help: 'help',
  },
  {
    name: 'deadLetterTopic',
    type: 'string',
    isRequired: true,
    help: 'help',
  },
  {
    name: 'configs',
    type: 'json',
    isRequired: true,
    help: 'help',
  },
  {
    name: 'secrets',
    type: 'json',
    isRequired: true,
    help: 'help',
  },
  {
    name: 'parallelism',
    type: 'int',
    isRequired: true,
    help: 'help',
  },
  {
    name: 'processingGuarantees',
    type: 'enum',
    isRequired: true,
    help: 'help',
    enum: PROCESSING_GUARANTEES,
  },
  {
    name: 'retainOrdering',
    type: 'boolean',
    isRequired: true,
    help: 'help',
  },
  {
    name: 'retainKeyOrdering',
    type: 'boolean',
    isRequired: true,
    help: 'help',
  },
  {
    name: 'resources',
    type: 'attachments',
    isRequired: true,
    help: 'help',
    attachments: [
      {
        name: 'cpu',
        type: 'int',
        isRequired: true,
        help: 'help',
      },
      {
        name: 'ram',
        type: 'bytes',
        isRequired: true,
        help: 'help',
      },
      {
        name: 'disk',
        type: 'bytes',
        isRequired: true,
        help: 'help',
      },
    ]
  },
  {
    name: 'autoAck',
    type: 'boolean',
    isRequired: true,
    help: 'help',
  },
  {
    name: 'timeoutMs',
    type: 'duration',
    isRequired: true,
    help: 'help',
  },
  {
    name: 'negativeAckRedeliveryDelayMs',
    type: 'duration',
    isRequired: true,
    help: 'help',
  },
  {
    name: 'archive',
    type: 'string',
    isRequired: true,
    help: 'help',
  },
  {
    name: 'cleanupSubscription',
    type: 'boolean',
    isRequired: true,
    help: 'help',
  },
  {
    name: 'runtimeFlags',
    type: 'string',
    isRequired: true,
    help: 'help',
  },
  {
    name: 'customRuntimeOptions',
    type: 'string',
    isRequired: true,
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

export type ConfigurationValue = string | string[] | number | StringMap | ConsumerConfigMap | boolean | Resources

export type Configurations = {
  [key: string]: ConfigurationValue,
  tenant: string,
  namespace: string,
  name: string,
  className: string,
  sourceSubscriptionName: string,
  sourceSubscriptionPosition: 'latest' | 'earliest',
  inputs: string[],
  topicToSerdeClassName: StringMap,
  topicsPattern: string,
  topicToSchemaType: StringMap,
  topicToSchemaProperties: StringMap,
  inputsSpecs: ConsumerConfigMap,
  maxMessageRetries: number,
  deadLetterTopic: string,
  configs: string,  // Serialized JSON in a form of Map<String, JsonValue>
  secrets: string,  // Serialized JSON in a form of Map<String, JsonValue>
  parallelism: number,
  processingGuarantees: 'atleast_once' | 'atmost_once' | 'effectively_once'
  retainOrdering: boolean,
  retainKeyOrdering: boolean,
  resources: Resources,
  autoAck: boolean,
  timeoutMs: number,
  negativeAckRedeliveryDelayMs: number,
  archive: string,
  cleanupSubscription: boolean,
  runtimeFlags: string,
  customRuntimeOptions: string,
}

export const configurations: Configurations = {
  tenant: '',
  namespace: '',
  name: '',
  className: '',
  sourceSubscriptionName: '',
  sourceSubscriptionPosition: 'latest',
  inputs: [],
  topicToSerdeClassName: {},
  topicsPattern: '',
  topicToSchemaType: {},
  topicToSchemaProperties: {},
  inputsSpecs: {
    'firstInput': {
      name: 'New',
      schemaType: '',
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
  configs: '',
  secrets: '',
  parallelism: 0,
  processingGuarantees: 'atleast_once',
  retainOrdering: false,
  retainKeyOrdering: false,
  resources: { cpu: 0, ram: 0, disk: 0 },
  autoAck: false,
  timeoutMs: 0,
  negativeAckRedeliveryDelayMs: 0,
  archive: '',
  cleanupSubscription: false,
  runtimeFlags: '',
  customRuntimeOptions: '',
}