import { IoConfigField } from "../../../../IoConfigField/IoConfigField";

const INSERT_MODE = [ { value: 'insert', label: 'Insert' }, { value: 'upsert', label: 'Upsert' }, { value: 'update', label: 'Update' } ]; // INSERT,UPSERT,UPDATE
type InsertMode = 'insert' | 'upsert' | 'update';

const NULL_VALUE_ACTION = [ { value: 'ignore', label: 'Ignore' }, { value: 'delete', label: 'Delete' }, { value: 'fail', label: 'Fail' } ]; // IGNORE DELETE FAIL
type NullValueAction = 'ignore' | 'delete' | 'fail';

export type JDBCConfigs = {
  [key: string]: string | boolean | number,
  userName: string,
  password: string,
  jdbcUrl: string,
  tableName: string,
  nonKey: string,
  key: string,
  timeoutMs: number,
  batchSize: number,
  insertMode: InsertMode,
  nullValueAction: NullValueAction,
  useTransactions: boolean,
  excludeNonDeclaredFields: boolean,
  useJdbcBatch: boolean,
}

export const jdbcFields: IoConfigField[] = [
  {
    name: 'userName',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'User name',
  },
  {
    name: 'password',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Password',
  },
  {
    name: 'jdbcUrl',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Jdbc url',
  },
  {
    name: 'tableName',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Table name',
  },
  {
    name: 'nonKey',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Non key',
  },
  {
    name: 'key',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Key',
  },
  {
    name: 'timeoutMs',
    type: 'duration',
    isRequired: false,
    help: 'help',
    label: 'Timeout',
  },
  {
    name: 'batchSize',
    type: 'int',
    isRequired: false,
    help: 'help',
    label: 'Batch size',
  },
  {
    name: 'insertMode',
    type: 'enum',
    isRequired: false,
    help: 'help',
    label: 'Insert mode',
    enum: INSERT_MODE,
  },
  {
    name: 'nullValueAction',
    type: 'enum',
    isRequired: false,
    help: 'help',
    label: 'Null value action',
    enum: NULL_VALUE_ACTION
  },
  {
    name: 'useTransactions',
    type: 'boolean',
    isRequired: false,
    help: 'help',
    label: 'Use transactions',
  },
  {
    name: 'excludeNonDeclaredFields',
    type: 'boolean',
    isRequired: false,
    help: 'help',
    label: 'Exclude non declared fields',
  },
  {
    name: 'useJdbcBatch',
    type: 'boolean',
    isRequired: false,
    help: 'help',
    label: 'Use jdbc batch',
  },
];

export const jdbcDefault: JDBCConfigs = {
  userName: '',
  password: '',
  jdbcUrl: '',
  tableName: '',
  nonKey: '',
  key: '',
  timeoutMs: 500,
  batchSize: 200,
  insertMode: 'insert',
  nullValueAction: 'fail',
  useTransactions: true,
  excludeNonDeclaredFields: false,
  useJdbcBatch: false,
}