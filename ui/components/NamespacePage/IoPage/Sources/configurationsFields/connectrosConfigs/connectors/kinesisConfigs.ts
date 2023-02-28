import { IoConfigField } from "../../../../IoConfigField/IoConfigField";

const INITIAL_POSITION_IN_STREAM = [ { value: 'AT_TIMESTAMP', label: 'At timestamp' }, { value: 'LATEST', label: 'Latest' }, { value: 'TRIM_HORIZON', label: 'Trim horizon' } ];
type InitialPositionInStream = 'atTimestamp' | 'latest' | 'trimHorizon';

export const kinesisFields: IoConfigField[] = [
  {
    name: 'awsKinesisStreamName',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Aws kinesis stream name',
  },
  {
    name: 'initialPositionInStream',
    type: 'enum',
    isRequired: false,
    help: 'help',
    label: 'Initial position in stream',
    enum: INITIAL_POSITION_IN_STREAM,
  },
  {
    name: 'startAtTime',
    type: 'date',
    isRequired: false,
    help: 'help',
    label: 'Start at time',
  },
  {
    name: 'applicationName',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Application name',
  },
  {
    name: 'checkpointInterval',
    type: 'duration',
    isRequired: false,
    help: 'help',
    label: 'Checkpoint interval',
  },
  {
    name: 'backoffTime',
    type: 'duration',
    isRequired: false,
    help: 'help',
    label: 'Backoff time',
  },
  {
    name: 'numRetries',
    type: 'int',
    isRequired: false,
    help: 'help',
    label: 'Num retries',
  },
  {
    name: 'receiveQueueSize',
    type: 'int',
    isRequired: false,
    help: 'help',
    label: 'Receive queue size',
  },
  {
    name: 'dynamoEndpoint',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Dynamo endpoint',
  },
  {
    name: 'cloudwatchEndpoint',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Cloudwatch endpoint',
  },
  {
    name: 'useEnhancedFanOut',
    type: 'boolean',
    isRequired: false,
    help: 'help',
    label: 'Use enhanced fan out',
  },
  {
    name: 'awsEndpoint',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Aws endpoint',
  },
  {
    name: 'awsRegion',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Aws region',
  },
];

export type KinesisConfigs = {
  [key: string]: string | number | boolean | Date,
  awsKinesisStreamName: string,
  initialPositionInStream: InitialPositionInStream,
  startAtTime: Date,
  applicationName: string,
  checkpointInterval: number,
  backoffTime: number,
  numRetries: number,
  receiveQueueSize: number,
  dynamoEndpoint: string,
  cloudwatchEndpoint: string,
  useEnhancedFanOut: boolean,
  awsEndpoint: string,
  awsRegion: string,
}

export const kinesisDefault: KinesisConfigs = {
  awsKinesisStreamName: '',
  initialPositionInStream: 'latest',
  startAtTime: new Date(),
  applicationName: '',
  checkpointInterval: 0,
  backoffTime: 0,
  numRetries: 0,
  receiveQueueSize: 0,
  dynamoEndpoint: '',
  cloudwatchEndpoint: '',
  useEnhancedFanOut: false,
  awsEndpoint: '',
  awsRegion: '',
}