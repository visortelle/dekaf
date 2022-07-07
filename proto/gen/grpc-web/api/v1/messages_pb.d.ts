import * as jspb from 'google-protobuf'

import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb';


export class MessageId extends jspb.Message {
  getLedgerId(): number;
  setLedgerId(value: number): MessageId;

  getEntryId(): number;
  setEntryId(value: number): MessageId;

  getBatchId(): number;
  setBatchId(value: number): MessageId;

  getPartitionIdx(): number;
  setPartitionIdx(value: number): MessageId;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): MessageId.AsObject;
  static toObject(includeInstance: boolean, msg: MessageId): MessageId.AsObject;
  static serializeBinaryToWriter(message: MessageId, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): MessageId;
  static deserializeBinaryFromReader(message: MessageId, reader: jspb.BinaryReader): MessageId;
}

export namespace MessageId {
  export type AsObject = {
    ledgerId: number,
    entryId: number,
    batchId: number,
    partitionIdx: number,
  }
}

export class Message extends jspb.Message {
  getTopic(): string;
  setTopic(value: string): Message;

  getProducerName(): string;
  setProducerName(value: string): Message;

  getPropertiesMap(): jspb.Map<string, string>;
  clearPropertiesMap(): Message;

  getRawPayload(): Uint8Array | string;
  getRawPayload_asU8(): Uint8Array;
  getRawPayload_asB64(): string;
  setRawPayload(value: Uint8Array | string): Message;

  getSchemaValue(): string;
  setSchemaValue(value: string): Message;

  getId(): MessageId | undefined;
  setId(value?: MessageId): Message;
  hasId(): boolean;
  clearId(): Message;

  getPublishTime(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setPublishTime(value?: google_protobuf_timestamp_pb.Timestamp): Message;
  hasPublishTime(): boolean;
  clearPublishTime(): Message;

  getEventTime(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setEventTime(value?: google_protobuf_timestamp_pb.Timestamp): Message;
  hasEventTime(): boolean;
  clearEventTime(): Message;

  getKey(): string;
  setKey(value: string): Message;

  getOrderingKey(): string;
  setOrderingKey(value: string): Message;

  getRedeliveryCount(): number;
  setRedeliveryCount(value: number): Message;

  getIsReplicated(): boolean;
  setIsReplicated(value: boolean): Message;

  getReplicatedFrom(): string;
  setReplicatedFrom(value: string): Message;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Message.AsObject;
  static toObject(includeInstance: boolean, msg: Message): Message.AsObject;
  static serializeBinaryToWriter(message: Message, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Message;
  static deserializeBinaryFromReader(message: Message, reader: jspb.BinaryReader): Message;
}

export namespace Message {
  export type AsObject = {
    topic: string,
    producerName: string,
    propertiesMap: Array<[string, string]>,
    rawPayload: Uint8Array | string,
    schemaValue: string,
    id?: MessageId.AsObject,
    publishTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    eventTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    key: string,
    orderingKey: string,
    redeliveryCount: number,
    isReplicated: boolean,
    replicatedFrom: string,
  }
}

