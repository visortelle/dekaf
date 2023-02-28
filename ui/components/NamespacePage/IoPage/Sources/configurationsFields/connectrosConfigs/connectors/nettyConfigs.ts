import { IoConfigField } from "../../../../IoConfigField/IoConfigField";
import { StringMap } from "../../../../Sinks/configurationsFields/configurationsFields";

const TYPE = [ { value: 'tcp', label: 'tcp' }, { value: 'http', label: 'http' }, { value: 'udp', label: 'udp' } ];
type Type = 'tcp' | 'http' | 'udp';

export const nettyFields: IoConfigField[] = [
  {
    name: 'type',
    type: 'enum',
    isRequired: true,
    help: 'help',
    label: 'Type',
    enum: TYPE,
  },
  {
    name: 'host',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Host',
  },
  {
    name: 'port',
    type: 'int',
    isRequired: true,
    help: 'help',
    label: 'Port',
  },
  {
    name: 'numberOfThreads',
    type: 'int',
    isRequired: true,
    help: 'help',
    label: 'Number of threads',
  },
];

export type NettyConfigs = {
  [key: string]: string | number | boolean | Date | StringMap,
  type: Type,
  host: string,
  port: number,
  numberOfThreads: number,
}

export const nettyDefault: NettyConfigs = {
  type: 'http',
  host: '',
  port: 1111,
  numberOfThreads: 0,
}