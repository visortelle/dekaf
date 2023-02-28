import { IoConfigField } from "../../../../IoConfigField/IoConfigField";
import { StringMap } from "../../../../Sinks/configurationsFields/configurationsFields";

export const twitterFirehoseFields: IoConfigField[] = [
  {
    name: 'consumerKey',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Consumer key',
  },
  {
    name: 'consumerSecret',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Consumer secret',
  },
  {
    name: 'token',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Token',
  },
  {
    name: 'tokenSecret',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Token secret',
  },
  {
    name: 'guestimateTweetTime',
    type: 'boolean',
    isRequired: false,
    help: 'help',
    label: 'Guestimate tweet time',
  },
  {
    name: 'clientName',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Client name',
  },
  {
    name: 'clientHosts',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Client hosts',
  },
  {
    name: 'clientBufferSize',
    type: 'int',
    isRequired: false,
    help: 'help',
    label: 'Client buffer size',
  },
];

export type TwitterFirehoseConfigs = {
  [key: string]: string | number | boolean,
  consumerKey: string,
  consumerSecret: string,
  token: string,
  tokenSecret: string,
  guestimateTweetTime: boolean,
  clientName: string,
  clientHosts: string,
  clientBufferSize: number,
}

export const twitterFirehoseDefault: TwitterFirehoseConfigs = {
  consumerKey: '',
  consumerSecret: '',
  token: '',
  tokenSecret: '',
  guestimateTweetTime: false,
  clientName: '',
  clientHosts: '',
  clientBufferSize: 0,
}