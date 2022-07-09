import * as jspb from 'google-protobuf'

import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb';
import * as google_rpc_status_pb from '../../../../../../google/rpc/status_pb';


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

  getEventTime(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setEventTime(value?: google_protobuf_timestamp_pb.Timestamp): Message;
  hasEventTime(): boolean;
  clearEventTime(): Message;

  getPublishTime(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setPublishTime(value?: google_protobuf_timestamp_pb.Timestamp): Message;
  hasPublishTime(): boolean;
  clearPublishTime(): Message;

  getBrokerPublishTime(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setBrokerPublishTime(value?: google_protobuf_timestamp_pb.Timestamp): Message;
  hasBrokerPublishTime(): boolean;
  clearBrokerPublishTime(): Message;

  getMessageId(): Uint8Array | string;
  getMessageId_asU8(): Uint8Array;
  getMessageId_asB64(): string;
  setMessageId(value: Uint8Array | string): Message;

  getSequenceId(): number;
  setSequenceId(value: number): Message;

  getProducerName(): string;
  setProducerName(value: string): Message;

  getKey(): string;
  setKey(value: string): Message;

  getOrderingKey(): Uint8Array | string;
  getOrderingKey_asU8(): Uint8Array;
  getOrderingKey_asB64(): string;
  setOrderingKey(value: Uint8Array | string): Message;

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
    eventTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    publishTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    brokerPublishTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    messageId: Uint8Array | string,
    sequenceId: number,
    producerName: string,
    key: string,
    orderingKey: Uint8Array | string,
    topic: string,
    redeliveryCount: number,
    schemaVersion: Uint8Array | string,
    isReplicated: boolean,
    replicatedFrom: string,
  }
}

export class TopicSelector extends jspb.Message {
  getTopic(): string;
  setTopic(value: string): TopicSelector;

  getSelectorCase(): TopicSelector.SelectorCase;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TopicSelector.AsObject;
  static toObject(includeInstance: boolean, msg: TopicSelector): TopicSelector.AsObject;
  static serializeBinaryToWriter(message: TopicSelector, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TopicSelector;
  static deserializeBinaryFromReader(message: TopicSelector, reader: jspb.BinaryReader): TopicSelector;
}

export namespace TopicSelector {
  export type AsObject = {
    topic: string,
  }

  export enum SelectorCase { 
    SELECTOR_NOT_SET = 0,
    TOPIC = 1,
  }
}

export class CreateConsumerRequest extends jspb.Message {
  getTopicSelector(): TopicSelector | undefined;
  setTopicSelector(value?: TopicSelector): CreateConsumerRequest;
  hasTopicSelector(): boolean;
  clearTopicSelector(): CreateConsumerRequest;

  getConsumerName(): string;
  setConsumerName(value: string): CreateConsumerRequest;
  hasConsumerName(): boolean;
  clearConsumerName(): CreateConsumerRequest;

  getSubscriptionName(): string;
  setSubscriptionName(value: string): CreateConsumerRequest;
  hasSubscriptionName(): boolean;
  clearSubscriptionName(): CreateConsumerRequest;

  getPriorityLevel(): number;
  setPriorityLevel(value: number): CreateConsumerRequest;
  hasPriorityLevel(): boolean;
  clearPriorityLevel(): CreateConsumerRequest;

  getStartPaused(): boolean;
  setStartPaused(value: boolean): CreateConsumerRequest;
  hasStartPaused(): boolean;
  clearStartPaused(): CreateConsumerRequest;

  getSubscriptionMode(): SubscriptionMode;
  setSubscriptionMode(value: SubscriptionMode): CreateConsumerRequest;
  hasSubscriptionMode(): boolean;
  clearSubscriptionMode(): CreateConsumerRequest;

  getSubscriptionType(): SubscriptionType;
  setSubscriptionType(value: SubscriptionType): CreateConsumerRequest;
  hasSubscriptionType(): boolean;
  clearSubscriptionType(): CreateConsumerRequest;

  getSubscriptionInitialPosition(): SubscriptionInitialPosition;
  setSubscriptionInitialPosition(value: SubscriptionInitialPosition): CreateConsumerRequest;
  hasSubscriptionInitialPosition(): boolean;
  clearSubscriptionInitialPosition(): CreateConsumerRequest;

  getAckTimeoutMs(): number;
  setAckTimeoutMs(value: number): CreateConsumerRequest;
  hasAckTimeoutMs(): boolean;
  clearAckTimeoutMs(): CreateConsumerRequest;

  getAckTimeoutTickTimeMs(): number;
  setAckTimeoutTickTimeMs(value: number): CreateConsumerRequest;
  hasAckTimeoutTickTimeMs(): boolean;
  clearAckTimeoutTickTimeMs(): CreateConsumerRequest;

  getExpireTimeOfIncompleteChunkedMessageMs(): number;
  setExpireTimeOfIncompleteChunkedMessageMs(value: number): CreateConsumerRequest;
  hasExpireTimeOfIncompleteChunkedMessageMs(): boolean;
  clearExpireTimeOfIncompleteChunkedMessageMs(): CreateConsumerRequest;

  getAcknowledgmentGroupTimeMs(): number;
  setAcknowledgmentGroupTimeMs(value: number): CreateConsumerRequest;
  hasAcknowledgmentGroupTimeMs(): boolean;
  clearAcknowledgmentGroupTimeMs(): CreateConsumerRequest;

  getNegativeAckRedeliveryDelayMs(): number;
  setNegativeAckRedeliveryDelayMs(value: number): CreateConsumerRequest;
  hasNegativeAckRedeliveryDelayMs(): boolean;
  clearNegativeAckRedeliveryDelayMs(): CreateConsumerRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CreateConsumerRequest.AsObject;
  static toObject(includeInstance: boolean, msg: CreateConsumerRequest): CreateConsumerRequest.AsObject;
  static serializeBinaryToWriter(message: CreateConsumerRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CreateConsumerRequest;
  static deserializeBinaryFromReader(message: CreateConsumerRequest, reader: jspb.BinaryReader): CreateConsumerRequest;
}

export namespace CreateConsumerRequest {
  export type AsObject = {
    topicSelector?: TopicSelector.AsObject,
    consumerName?: string,
    subscriptionName?: string,
    priorityLevel?: number,
    startPaused?: boolean,
    subscriptionMode?: SubscriptionMode,
    subscriptionType?: SubscriptionType,
    subscriptionInitialPosition?: SubscriptionInitialPosition,
    ackTimeoutMs?: number,
    ackTimeoutTickTimeMs?: number,
    expireTimeOfIncompleteChunkedMessageMs?: number,
    acknowledgmentGroupTimeMs?: number,
    negativeAckRedeliveryDelayMs?: number,
  }

  export enum ConsumerNameCase { 
    _CONSUMER_NAME_NOT_SET = 0,
    CONSUMER_NAME = 1,
  }

  export enum SubscriptionNameCase { 
    _SUBSCRIPTION_NAME_NOT_SET = 0,
    SUBSCRIPTION_NAME = 2,
  }

  export enum PriorityLevelCase { 
    _PRIORITY_LEVEL_NOT_SET = 0,
    PRIORITY_LEVEL = 3,
  }

  export enum StartPausedCase { 
    _START_PAUSED_NOT_SET = 0,
    START_PAUSED = 4,
  }

  export enum SubscriptionModeCase { 
    _SUBSCRIPTION_MODE_NOT_SET = 0,
    SUBSCRIPTION_MODE = 5,
  }

  export enum SubscriptionTypeCase { 
    _SUBSCRIPTION_TYPE_NOT_SET = 0,
    SUBSCRIPTION_TYPE = 6,
  }

  export enum SubscriptionInitialPositionCase { 
    _SUBSCRIPTION_INITIAL_POSITION_NOT_SET = 0,
    SUBSCRIPTION_INITIAL_POSITION = 7,
  }

  export enum AckTimeoutMsCase { 
    _ACK_TIMEOUT_MS_NOT_SET = 0,
    ACK_TIMEOUT_MS = 8,
  }

  export enum AckTimeoutTickTimeMsCase { 
    _ACK_TIMEOUT_TICK_TIME_MS_NOT_SET = 0,
    ACK_TIMEOUT_TICK_TIME_MS = 9,
  }

  export enum ExpireTimeOfIncompleteChunkedMessageMsCase { 
    _EXPIRE_TIME_OF_INCOMPLETE_CHUNKED_MESSAGE_MS_NOT_SET = 0,
    EXPIRE_TIME_OF_INCOMPLETE_CHUNKED_MESSAGE_MS = 10,
  }

  export enum AcknowledgmentGroupTimeMsCase { 
    _ACKNOWLEDGMENT_GROUP_TIME_MS_NOT_SET = 0,
    ACKNOWLEDGMENT_GROUP_TIME_MS = 11,
  }

  export enum NegativeAckRedeliveryDelayMsCase { 
    _NEGATIVE_ACK_REDELIVERY_DELAY_MS_NOT_SET = 0,
    NEGATIVE_ACK_REDELIVERY_DELAY_MS = 12,
  }
}

export class CreateConsumerResponse extends jspb.Message {
  getStatus(): google_rpc_status_pb.Status | undefined;
  setStatus(value?: google_rpc_status_pb.Status): CreateConsumerResponse;
  hasStatus(): boolean;
  clearStatus(): CreateConsumerResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CreateConsumerResponse.AsObject;
  static toObject(includeInstance: boolean, msg: CreateConsumerResponse): CreateConsumerResponse.AsObject;
  static serializeBinaryToWriter(message: CreateConsumerResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CreateConsumerResponse;
  static deserializeBinaryFromReader(message: CreateConsumerResponse, reader: jspb.BinaryReader): CreateConsumerResponse;
}

export namespace CreateConsumerResponse {
  export type AsObject = {
    status?: google_rpc_status_pb.Status.AsObject,
  }
}

export class DeleteConsumerRequest extends jspb.Message {
  getConsumerName(): string;
  setConsumerName(value: string): DeleteConsumerRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeleteConsumerRequest.AsObject;
  static toObject(includeInstance: boolean, msg: DeleteConsumerRequest): DeleteConsumerRequest.AsObject;
  static serializeBinaryToWriter(message: DeleteConsumerRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeleteConsumerRequest;
  static deserializeBinaryFromReader(message: DeleteConsumerRequest, reader: jspb.BinaryReader): DeleteConsumerRequest;
}

export namespace DeleteConsumerRequest {
  export type AsObject = {
    consumerName: string,
  }
}

export class DeleteConsumerResponse extends jspb.Message {
  getStatus(): google_rpc_status_pb.Status | undefined;
  setStatus(value?: google_rpc_status_pb.Status): DeleteConsumerResponse;
  hasStatus(): boolean;
  clearStatus(): DeleteConsumerResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeleteConsumerResponse.AsObject;
  static toObject(includeInstance: boolean, msg: DeleteConsumerResponse): DeleteConsumerResponse.AsObject;
  static serializeBinaryToWriter(message: DeleteConsumerResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeleteConsumerResponse;
  static deserializeBinaryFromReader(message: DeleteConsumerResponse, reader: jspb.BinaryReader): DeleteConsumerResponse;
}

export namespace DeleteConsumerResponse {
  export type AsObject = {
    status?: google_rpc_status_pb.Status.AsObject,
  }
}

export class ResumeRequest extends jspb.Message {
  getConsumerName(): string;
  setConsumerName(value: string): ResumeRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ResumeRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ResumeRequest): ResumeRequest.AsObject;
  static serializeBinaryToWriter(message: ResumeRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ResumeRequest;
  static deserializeBinaryFromReader(message: ResumeRequest, reader: jspb.BinaryReader): ResumeRequest;
}

export namespace ResumeRequest {
  export type AsObject = {
    consumerName: string,
  }
}

export class ResumeResponse extends jspb.Message {
  getStatus(): google_rpc_status_pb.Status | undefined;
  setStatus(value?: google_rpc_status_pb.Status): ResumeResponse;
  hasStatus(): boolean;
  clearStatus(): ResumeResponse;

  getMessagesList(): Array<Message>;
  setMessagesList(value: Array<Message>): ResumeResponse;
  clearMessagesList(): ResumeResponse;
  addMessages(value?: Message, index?: number): Message;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ResumeResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ResumeResponse): ResumeResponse.AsObject;
  static serializeBinaryToWriter(message: ResumeResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ResumeResponse;
  static deserializeBinaryFromReader(message: ResumeResponse, reader: jspb.BinaryReader): ResumeResponse;
}

export namespace ResumeResponse {
  export type AsObject = {
    status?: google_rpc_status_pb.Status.AsObject,
    messagesList: Array<Message.AsObject>,
  }

  export enum StatusCase { 
    _STATUS_NOT_SET = 0,
    STATUS = 1,
  }
}

export class PauseRequest extends jspb.Message {
  getConsumerName(): string;
  setConsumerName(value: string): PauseRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PauseRequest.AsObject;
  static toObject(includeInstance: boolean, msg: PauseRequest): PauseRequest.AsObject;
  static serializeBinaryToWriter(message: PauseRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PauseRequest;
  static deserializeBinaryFromReader(message: PauseRequest, reader: jspb.BinaryReader): PauseRequest;
}

export namespace PauseRequest {
  export type AsObject = {
    consumerName: string,
  }
}

export class PauseResponse extends jspb.Message {
  getStatus(): google_rpc_status_pb.Status | undefined;
  setStatus(value?: google_rpc_status_pb.Status): PauseResponse;
  hasStatus(): boolean;
  clearStatus(): PauseResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PauseResponse.AsObject;
  static toObject(includeInstance: boolean, msg: PauseResponse): PauseResponse.AsObject;
  static serializeBinaryToWriter(message: PauseResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PauseResponse;
  static deserializeBinaryFromReader(message: PauseResponse, reader: jspb.BinaryReader): PauseResponse;
}

export namespace PauseResponse {
  export type AsObject = {
    status?: google_rpc_status_pb.Status.AsObject,
  }
}

export enum SubscriptionMode { 
  SUBSCRIPTION_MODE_UNSPECIFIED = 0,
  SUBSCRIPTION_MODE_DURABLE = 1,
  SUBSCRIPTION_MODE_NON_DURABLE = 2,
}
export enum SubscriptionType { 
  SUBSCRIPTION_TYPE_UNSPECIFIED = 0,
  SUBSCRIPTION_TYPE_EXCLUSIVE = 1,
  SUBSCRIPTION_TYPE_FAILOVER = 2,
  SUBSCRIPTION_TYPE_SHARED = 3,
  SUBSCRIPTION_TYPE_KEY_SHARED = 4,
}
export enum SubscriptionInitialPosition { 
  SUBSCRIPTION_INITIAL_POSITION_UNSPECIFIED = 0,
  SUBSCRIPTION_INITIAL_POSITION_EARLIEST = 1,
  SUBSCRIPTION_INITIAL_POSITION_LATEST = 2,
}
