import * as jspb from 'google-protobuf'

import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb';
import * as google_rpc_status_pb from '../../../../../../google/rpc/status_pb';
import * as google_rpc_code_pb from '../../../../../../google/rpc/code_pb';


export class Google extends jspb.Message {
  getTimestamp(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setTimestamp(value?: google_protobuf_timestamp_pb.Timestamp): Google;
  hasTimestamp(): boolean;
  clearTimestamp(): Google;

  getRpcStatus(): google_rpc_status_pb.Status | undefined;
  setRpcStatus(value?: google_rpc_status_pb.Status): Google;
  hasRpcStatus(): boolean;
  clearRpcStatus(): Google;

  getRpcCode(): google_rpc_code_pb.Code;
  setRpcCode(value: google_rpc_code_pb.Code): Google;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Google.AsObject;
  static toObject(includeInstance: boolean, msg: Google): Google.AsObject;
  static serializeBinaryToWriter(message: Google, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Google;
  static deserializeBinaryFromReader(message: Google, reader: jspb.BinaryReader): Google;
}

export namespace Google {
  export type AsObject = {
    timestamp?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    rpcStatus?: google_rpc_status_pb.Status.AsObject,
    rpcCode: google_rpc_code_pb.Code,
  }
}

