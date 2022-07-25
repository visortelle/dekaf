import * as jspb from 'google-protobuf'

import * as google_rpc_status_pb from '../../../../../../google/rpc/status_pb';


export class CreateProducerRequest extends jspb.Message {
  getProducerName(): string;
  setProducerName(value: string): CreateProducerRequest;

  getTopic(): string;
  setTopic(value: string): CreateProducerRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CreateProducerRequest.AsObject;
  static toObject(includeInstance: boolean, msg: CreateProducerRequest): CreateProducerRequest.AsObject;
  static serializeBinaryToWriter(message: CreateProducerRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CreateProducerRequest;
  static deserializeBinaryFromReader(message: CreateProducerRequest, reader: jspb.BinaryReader): CreateProducerRequest;
}

export namespace CreateProducerRequest {
  export type AsObject = {
    producerName: string,
    topic: string,
  }
}

export class CreateProducerResponse extends jspb.Message {
  getStatus(): google_rpc_status_pb.Status | undefined;
  setStatus(value?: google_rpc_status_pb.Status): CreateProducerResponse;
  hasStatus(): boolean;
  clearStatus(): CreateProducerResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CreateProducerResponse.AsObject;
  static toObject(includeInstance: boolean, msg: CreateProducerResponse): CreateProducerResponse.AsObject;
  static serializeBinaryToWriter(message: CreateProducerResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CreateProducerResponse;
  static deserializeBinaryFromReader(message: CreateProducerResponse, reader: jspb.BinaryReader): CreateProducerResponse;
}

export namespace CreateProducerResponse {
  export type AsObject = {
    status?: google_rpc_status_pb.Status.AsObject,
  }
}

export class DeleteProducerRequest extends jspb.Message {
  getProducerName(): string;
  setProducerName(value: string): DeleteProducerRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeleteProducerRequest.AsObject;
  static toObject(includeInstance: boolean, msg: DeleteProducerRequest): DeleteProducerRequest.AsObject;
  static serializeBinaryToWriter(message: DeleteProducerRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeleteProducerRequest;
  static deserializeBinaryFromReader(message: DeleteProducerRequest, reader: jspb.BinaryReader): DeleteProducerRequest;
}

export namespace DeleteProducerRequest {
  export type AsObject = {
    producerName: string,
  }
}

export class DeleteProducerResponse extends jspb.Message {
  getStatus(): google_rpc_status_pb.Status | undefined;
  setStatus(value?: google_rpc_status_pb.Status): DeleteProducerResponse;
  hasStatus(): boolean;
  clearStatus(): DeleteProducerResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeleteProducerResponse.AsObject;
  static toObject(includeInstance: boolean, msg: DeleteProducerResponse): DeleteProducerResponse.AsObject;
  static serializeBinaryToWriter(message: DeleteProducerResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeleteProducerResponse;
  static deserializeBinaryFromReader(message: DeleteProducerResponse, reader: jspb.BinaryReader): DeleteProducerResponse;
}

export namespace DeleteProducerResponse {
  export type AsObject = {
    status?: google_rpc_status_pb.Status.AsObject,
  }
}

export class SendRequest extends jspb.Message {
  getProducerName(): string;
  setProducerName(value: string): SendRequest;

  getMessagesList(): Array<Uint8Array | string>;
  setMessagesList(value: Array<Uint8Array | string>): SendRequest;
  clearMessagesList(): SendRequest;
  addMessages(value: Uint8Array | string, index?: number): SendRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SendRequest.AsObject;
  static toObject(includeInstance: boolean, msg: SendRequest): SendRequest.AsObject;
  static serializeBinaryToWriter(message: SendRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SendRequest;
  static deserializeBinaryFromReader(message: SendRequest, reader: jspb.BinaryReader): SendRequest;
}

export namespace SendRequest {
  export type AsObject = {
    producerName: string,
    messagesList: Array<Uint8Array | string>,
  }
}

export class SendResponse extends jspb.Message {
  getStatus(): google_rpc_status_pb.Status | undefined;
  setStatus(value?: google_rpc_status_pb.Status): SendResponse;
  hasStatus(): boolean;
  clearStatus(): SendResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SendResponse.AsObject;
  static toObject(includeInstance: boolean, msg: SendResponse): SendResponse.AsObject;
  static serializeBinaryToWriter(message: SendResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SendResponse;
  static deserializeBinaryFromReader(message: SendResponse, reader: jspb.BinaryReader): SendResponse;
}

export namespace SendResponse {
  export type AsObject = {
    status?: google_rpc_status_pb.Status.AsObject,
  }
}

export class GetStatsRequest extends jspb.Message {
  getProducerName(): string;
  setProducerName(value: string): GetStatsRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetStatsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetStatsRequest): GetStatsRequest.AsObject;
  static serializeBinaryToWriter(message: GetStatsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetStatsRequest;
  static deserializeBinaryFromReader(message: GetStatsRequest, reader: jspb.BinaryReader): GetStatsRequest;
}

export namespace GetStatsRequest {
  export type AsObject = {
    producerName: string,
  }
}

export class Stats extends jspb.Message {
  getNumMessagesSent(): number;
  setNumMessagesSent(value: number): Stats;

  getNumBytesSent(): number;
  setNumBytesSent(value: number): Stats;

  getNumSendFailed(): number;
  setNumSendFailed(value: number): Stats;

  getNumAcksReceived(): number;
  setNumAcksReceived(value: number): Stats;

  getSendMessagesRate(): number;
  setSendMessagesRate(value: number): Stats;

  getSendBytesRate(): number;
  setSendBytesRate(value: number): Stats;

  getTotalMessagesSent(): number;
  setTotalMessagesSent(value: number): Stats;

  getTotalBytesSent(): number;
  setTotalBytesSent(value: number): Stats;

  getTotalSendFailed(): number;
  setTotalSendFailed(value: number): Stats;

  getTotalAcksReceived(): number;
  setTotalAcksReceived(value: number): Stats;

  getPendingQueueSize(): number;
  setPendingQueueSize(value: number): Stats;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Stats.AsObject;
  static toObject(includeInstance: boolean, msg: Stats): Stats.AsObject;
  static serializeBinaryToWriter(message: Stats, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Stats;
  static deserializeBinaryFromReader(message: Stats, reader: jspb.BinaryReader): Stats;
}

export namespace Stats {
  export type AsObject = {
    numMessagesSent: number,
    numBytesSent: number,
    numSendFailed: number,
    numAcksReceived: number,
    sendMessagesRate: number,
    sendBytesRate: number,
    totalMessagesSent: number,
    totalBytesSent: number,
    totalSendFailed: number,
    totalAcksReceived: number,
    pendingQueueSize: number,
  }
}

export class GetStatsResponse extends jspb.Message {
  getStatus(): google_rpc_status_pb.Status | undefined;
  setStatus(value?: google_rpc_status_pb.Status): GetStatsResponse;
  hasStatus(): boolean;
  clearStatus(): GetStatsResponse;

  getStats(): Stats | undefined;
  setStats(value?: Stats): GetStatsResponse;
  hasStats(): boolean;
  clearStats(): GetStatsResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetStatsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetStatsResponse): GetStatsResponse.AsObject;
  static serializeBinaryToWriter(message: GetStatsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetStatsResponse;
  static deserializeBinaryFromReader(message: GetStatsResponse, reader: jspb.BinaryReader): GetStatsResponse;
}

export namespace GetStatsResponse {
  export type AsObject = {
    status?: google_rpc_status_pb.Status.AsObject,
    stats?: Stats.AsObject,
  }
}

