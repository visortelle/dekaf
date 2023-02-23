import { IoConfigField } from "../../../../IoConfigField/IoConfigField"

export type FlumeConfigs = {
  [key: string]: string | boolean,
  name: string,
  confFile: string,
  noReloadConf: boolean,
  zkConnString: string,
  zkBasePath: string,
}

export const flumeFields: IoConfigField[] = [
  {
    name: 'name',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Name',
  },
  {
    name: 'confFile',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Conf file',
  },
  {
    name: 'noReloadConf',
    type: 'boolean',
    isRequired: false,
    help: 'help',
    label: 'No reload conf',
  },
  {
    name: 'zkConnString',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Zk conn string',
  },
  {
    name: 'zkBasePath',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Zk base path',
  },
]

export const flumeDefault: FlumeConfigs = {
  name: '',
  confFile: '',
  noReloadConf: false,
  zkConnString: '',
  zkBasePath: '',
}