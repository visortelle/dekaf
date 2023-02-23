import { IoConfigField } from "../../../../IoConfigField/IoConfigField";

const SECURITY_LOGIN_USER = [ {value: 'simple', label: 'Simple' }, {value: 'custom', label: 'Custom' }, {value: 'unspecified', label: 'Unspecified' } ]; // SIMPLE CUSTOM UNSPECIFIED
type SecurityLoginUser = 'simple' | 'custom' | 'unspecified';

const WRITE_TYPE = [ {value: 'must_cache', label: 'Must cache' }, {value: 'cache_through', label: 'Cache through' }, {value: 'through', label: 'Through' } ]; // MUST_CACHE CACHE_THROUGH THROUGH
type WriteType = 'must_cache' | 'cache_through' | 'through';

export type AlluxioConfigs = {
  [key: string]: string | number | boolean,
  alluxioMasterHost: string,
  alluxioMasterPort: number,
  alluxioDir: string,
  securityLoginUser: SecurityLoginUser,
  filePrefix: string,
  fileExtension: string,
  lineSeparator: string,
  rotationRecords: number,
  rotationInterval: number,
  schemaEnable: boolean,
  writeType: WriteType,
}

export const alluxioFields: IoConfigField[] = [
  {
    name: 'alluxioMasterHost',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Alluxio master host',
  },
  {
    name: 'alluxioMasterPort',
    type: 'int',
    isRequired: true,
    help: 'help',
    label: 'Alluxio master port',
  },
  {
    name: 'alluxioDir',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Alluxio dir',
  },
  {
    name: 'securityLoginUser',
    type: 'enum',
    isRequired: false,
    help: 'help',
    label: 'Security login user',
    enum: SECURITY_LOGIN_USER,
  },
  {
    name: 'filePrefix',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'File prefix',
  },
  {
    name: 'fileExtension',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'File extension',
  },
  {
    name: 'lineSeparator',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Line separator',
  },
  {
    name: 'rotationRecords',
    type: 'int',
    isRequired: false,
    help: 'help',
    label: 'Rotation records',
  },
  {
    name: 'rotationInterval',
    type: 'duration',
    isRequired: false,
    help: 'help',
    label: 'Rotation interval',
  },
  {
    name: 'schemaEnable',
    type: 'boolean',
    isRequired: false,
    help: 'help',
    label: 'Schema enable',
  },
  {
    name: 'writeType',
    type: 'enum',
    isRequired: false,
    help: 'help',
    label: 'Write type',
    enum: WRITE_TYPE,
  },
]

export const alluxioDefault: AlluxioConfigs = {
  alluxioMasterHost: '',
  alluxioMasterPort: 19998,
  alluxioDir: '',
  securityLoginUser: 'unspecified',
  filePrefix: '',
  fileExtension: '',
  lineSeparator: '',
  rotationRecords: 10000,
  rotationInterval: -1,
  schemaEnable: false,
  writeType: 'must_cache',
}