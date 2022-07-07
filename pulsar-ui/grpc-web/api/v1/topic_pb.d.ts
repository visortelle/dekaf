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
  getPropertiesMap(): jspb.Map<string, string>;
  clearPropertiesMap(): Message;

  getData(): Uint8Array | string;
  getData_asU8(): Uint8Array;
  getData_asB64(): string;
  setData(value: Uint8Array | string): Message;

  getSize(): number;
  setSize(value: number): Message;

  getValue(): string;
  setValue(value: string): Message;

  getPublishTime(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setPublishTime(value?: google_protobuf_timestamp_pb.Timestamp): Message;
  hasPublishTime(): boolean;
  clearPublishTime(): Message;

  getEventTime(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setEventTime(value?: google_protobuf_timestamp_pb.Timestamp): Message;
  hasEventTime(): boolean;
  clearEventTime(): Message;

  getBrokerPublishTime(): number;
  setBrokerPublishTime(value: number): Message;
  hasBrokerPublishTime(): boolean;
  clearBrokerPublishTime(): Message;

  getSequenceId(): number;
  setSequenceId(value: number): Message;

  getProducerName(): string;
  setProducerName(value: string): Message;

  getKey(): string;
  setKey(value: string): Message;

  getOrderingKey(): string;
  setOrderingKey(value: string): Message;

  getTopic(): string;
  setTopic(value: string): Message;

  getRedeliveryCount(): number;
  setRedeliveryCount(value: number): Message;

  getSchemaVersion(): Uint8Array | string;
  getSchemaVersion_asU8(): Uint8Array;
  getSchemaVersion_asB64(): string;
  setSchemaVersion(value: Uint8Array | string): Message;

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
    propertiesMap: Array<[string, string]>,
    data: Uint8Array | string,
    size: number,
    value: string,
    publishTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    eventTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    brokerPublishTime?: number,
    sequenceId: number,
    producerName: string,
    key: string,
    orderingKey: string,
    topic: string,
    redeliveryCount: number,
    schemaVersion: Uint8Array | string,
    isReplicated: boolean,
    replicatedFrom: string,
  }

  export enum BrokerPublishTimeCase { 
    _BROKER_PUBLISH_TIME_NOT_SET = 0,
    BROKER_PUBLISH_TIME = 22,
  }
}

export class ReadMessagesRequest extends jspb.Message {
  getTopic(): string;
  setTopic(value: string): ReadMessagesRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ReadMessagesRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ReadMessagesRequest): ReadMessagesRequest.AsObject;
  static serializeBinaryToWriter(message: ReadMessagesRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ReadMessagesRequest;
  static deserializeBinaryFromReader(message: ReadMessagesRequest, reader: jspb.BinaryReader): ReadMessagesRequest;
}

export namespace ReadMessagesRequest {
  export type AsObject = {
    topic: string,
  }
}

export class ReadMessagesResponse extends jspb.Message {
  getMessagesList(): Array<Message>;
  setMessagesList(value: Array<Message>): ReadMessagesResponse;
  clearMessagesList(): ReadMessagesResponse;
  addMessages(value?: Message, index?: number): Message;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ReadMessagesResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ReadMessagesResponse): ReadMessagesResponse.AsObject;
  static serializeBinaryToWriter(message: ReadMessagesResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ReadMessagesResponse;
  static deserializeBinaryFromReader(message: ReadMessagesResponse, reader: jspb.BinaryReader): ReadMessagesResponse;
}

export namespace ReadMessagesResponse {
  export type AsObject = {
    messagesList: Array<Message.AsObject>,
  }
}

