import { IoConfigField } from "../../../../IoConfigField/IoConfigField";

const COMPRESSION = [ { value: 'bzip2', label: 'Bzip 2' }, { value: 'deflate', label: 'Deflate' }, { value: 'gzip', label: 'Gzip' }, { value: 'lz4', label: 'Lz4' }, { value: 'snappy', label: 'Snappy' }, { value: 'zstandard', label: 'Z standard' }, { value: 'none', label: 'None' } ]; // BZIP2 DEFLATE GZIP LZ4 SNAPPY ZSTANDARD NONE
type Compression = 'bzip2' | 'deflate' | 'gzip' | 'lz4' | 'snappy' | 'zstandard' | 'none';

export type HDFS3Configs = {
  [key: string]: string | number
  hdfsConfigResources: string,
  directory: string,
  encoding: string,
  compression: Compression,
  kerberosUserPrincipal: string,
  keytab: string,
  filenamePrefix: string,
  fileExtension: string,
  separator: string,
  syncInterval: number,
  maxPendingRecords: number,
}

export const hdfs3Fields: IoConfigField[] = [
  {
    name: 'hdfsConfigResources',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Hdfs config resources',
  },
  {
    name: 'directory',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Directory',
  },
  {
    name: 'encoding',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Encoding',
  },
  {
    name: 'compression',
    type: 'enum',
    isRequired: false,
    help: 'help',
    label: 'Compression',
    enum: COMPRESSION
  },
  {
    name: 'kerberosUserPrincipal',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Kerberos user principal',
  },
  {
    name: 'keytab',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Keytab',
  },
  {
    name: 'filenamePrefix',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Filename prefix',
  },
  {
    name: 'fileExtension',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'File extension',
  },
  {
    name: 'separator',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Separator',
  },
  {
    name: 'syncInterval',
    type: 'duration',
    isRequired: false,
    help: 'help',
    label: 'Sync interval',
  },
  {
    name: 'maxPendingRecords',
    type: 'int',
    isRequired: false,
    help: 'help',
    label: 'Max pending records',
  },
];

export const hdfs3Default: HDFS3Configs = {
  hdfsConfigResources: '',
  directory: '',
  encoding: '',
  compression: 'none',
  kerberosUserPrincipal: '',
  keytab: '',
  filenamePrefix: '',
  fileExtension: '',
  separator: '',
  syncInterval: 0,
  maxPendingRecords: 10000,
}