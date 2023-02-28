import { IoConfigField } from "../../../../IoConfigField/IoConfigField";

export const canalFields: IoConfigField[] = [
  {
    name: 'username',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Username',
  },
  {
    name: 'password',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Password',
  },
  {
    name: 'zkServers',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'ZK servers',
  },
  {
    name: 'destination',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Destination',
  },
  {
    name: 'cluster',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Cluster',
  },
  {
    name: 'singleHostname',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Single hostname',
  },
  {
    name: 'singlePort',
    type: 'int',
    isRequired: true,
    help: 'help',
    label: 'Single port',
  },
  {
    name: 'batchSize',
    type: 'int',
    isRequired: false,
    help: 'help',
    label: 'Batch size',
  },
];

export type CanalConfigs = {
  [key: string]: string | number | boolean,
  username: string,
  password: string,
  zkServers: string,
  batchSize: number,
  destination: string,
  cluster: boolean,
  singleHostname: string,
  singlePort: number,
}

export const canalDefault: CanalConfigs = {
  username: "",
  password: "",
  zkServers: "",
  batchSize: 5120,
  destination: "",
  cluster: false,
  singleHostname: "",
  singlePort: 11111,
}