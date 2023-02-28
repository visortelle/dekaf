import { IoConfigField } from "../../../../IoConfigField/IoConfigField";

export const nsqFields: IoConfigField[] = [
  {
    name: 'lookupds',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Lookupds',
  },
  {
    name: 'topic',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Topic',
  },
  {
    name: 'channel',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Channel',
  },
];

export type NsqConfigs = {
  [key: string]: string,
  lookupds: string,
  topic: string,
  channel: string
}

export const nsqDefault: NsqConfigs = {
  lookupds: '',
  topic: '',
  channel: '',
}