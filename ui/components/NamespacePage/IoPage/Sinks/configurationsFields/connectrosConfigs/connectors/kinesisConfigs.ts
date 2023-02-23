import { IoConfigField } from "../../../../IoConfigField/IoConfigField";

const MESSAGE_FORMAT = [ { value: 'only_raw_payload', label: 'Only raw payload' }, { value: 'full_message_in_json', label: 'Full message in json' }, { value: 'full_message_in_fb', label: 'Full message in fb' }, { value: 'full_message_in_json_expand_value', label: 'Full message in json expand value' } ]; //  ONLY_RAW_PAYLOAD FULL_MESSAGE_IN_JSON FULL_MESSAGE_IN_FB FULL_MESSAGE_IN_JSON_EXPAND_VALUE
type MessageFormat = 'only_raw_payload' | 'full_message_in_json' | 'full_message_in_fb' | 'full_message_in_json_expand_value';

export type KinesisConfigs = {
  [key: string]: string | boolean,
  messageFormat: MessageFormat,
  jsonIncludeNonNulls: boolean,
  jsonFlatten: boolean,
  retainOrdering: boolean,
  awsEndpoint: string,
  awsRegion: string
  awsKinesisStreamName: string,
  awsCredentialPluginName: string,
  awsCredentialPluginParam: string,
}

export const kinesisFields: IoConfigField[] = [
  {
    name: 'messageFormat',
    type: 'enum',
    isRequired: true,
    help: 'help',
    label: 'Message format',
    enum: MESSAGE_FORMAT,
  },
  {
    name: 'jsonIncludeNonNulls',
    type: 'boolean',
    isRequired: false,
    help: 'help',
    label: 'JSON include non nulls',
  },
  {
    name: 'jsonFlatten',
    type: 'boolean',
    isRequired: false,
    help: 'help',
    label: 'JSON flatten',
  },
  {
    name: 'retainOrdering',
    type: 'boolean',
    isRequired: false,
    help: 'help',
    label: 'Retain ordering',
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
  {
    name: 'awsKinesisStreamName',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Aws kinesis stream name',
  },
  {
    name: 'awsCredentialPluginName',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Aws credential plugin name',
  },
  {
    name: 'awsCredentialPluginParam',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Aws credential plugin param',
  },
];

export const kinesisDefault: KinesisConfigs = {
  messageFormat: 'only_raw_payload',
  jsonIncludeNonNulls: true,
  jsonFlatten: false,
  retainOrdering: false,
  awsEndpoint: '',
  awsRegion: '',
  awsKinesisStreamName: '',
  awsCredentialPluginName: '',
  awsCredentialPluginParam: '',
}