import { IoConfigField } from "../../../../IoConfigField/IoConfigField";
import { StringMap } from "../../../../Sinks/configurationsFields/configurationsFields";
import { mongodbFields as sinkMongoDBFields, MongoDBConfigs as SinkMongoDBConfigs, mongoDBDefault as sinkMongoDBDefault } from '../../../../Sinks/configurationsFields/connectrosConfigs/connectors/mongoDBConfigs';

const SYNC_TYPE = [ { value: 'full_sync', label: 'Full sync' }, { value: 'incr_sync', label: 'Incr sync' } ];
type SyncType = 'full_sync' | 'incr_sync';

export const mongoDBFields: IoConfigField[] = [
  {
    name: 'syncType',
    type: 'enum',
    isRequired: false,
    help: 'help',
    label: 'Sync type',
    enum: SYNC_TYPE
  },
  ...sinkMongoDBFields
];

export type MongoDBConfigs = SinkMongoDBConfigs & {
  [key: string]: string | number | boolean | Date | StringMap,
  syncType: SyncType
}

export const mongoDBDefault: MongoDBConfigs = {
  syncType: 'full_sync',
  ...sinkMongoDBDefault,
}