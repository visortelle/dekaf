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
  hasData(): boolean;
  clearData(): Message;

  getSize(): number;
  setSize(value: number): Message;
  hasSize(): boolean;
  clearSize(): Message;

  getValue(): string;
  setValue(value: string): Message;
  hasValue(): boolean;
  clearValue(): Message;

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
  hasMessageId(): boolean;
  clearMessageId(): Message;

  getSequenceId(): number;
  setSequenceId(value: number): Message;
  hasSequenceId(): boolean;
  clearSequenceId(): Message;

  getProducerName(): string;
  setProducerName(value: string): Message;
  hasProducerName(): boolean;
  clearProducerName(): Message;

  getKey(): string;
  setKey(value: string): Message;
  hasKey(): boolean;
  clearKey(): Message;

  getOrderingKey(): Uint8Array | string;
  getOrderingKey_asU8(): Uint8Array;
  getOrderingKey_asB64(): string;
  setOrderingKey(value: Uint8Array | string): Message;
  hasOrderingKey(): boolean;
  clearOrderingKey(): Message;

  getTopic(): string;
  setTopic(value: string): Message;
  hasTopic(): boolean;
  clearTopic(): Message;

  getRedeliveryCount(): number;
  setRedeliveryCount(value: number): Message;
  hasRedeliveryCount(): boolean;
  clearRedeliveryCount(): Message;

  getSchemaVersion(): Uint8Array | string;
  getSchemaVersion_asU8(): Uint8Array;
  getSchemaVersion_asB64(): string;
  setSchemaVersion(value: Uint8Array | string): Message;
  hasSchemaVersion(): boolean;
  clearSchemaVersion(): Message;

  getIsReplicated(): boolean;
  setIsReplicated(value: boolean): Message;
  hasIsReplicated(): boolean;
  clearIsReplicated(): Message;

  getReplicatedFrom(): string;
  setReplicatedFrom(value: string): Message;
  hasReplicatedFrom(): boolean;
  clearReplicatedFrom(): Message;

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
    data?: Uint8Array | string,
    size?: number,
    value?: string,
    eventTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    publishTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    brokerPublishTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    messageId?: Uint8Array | string,
    sequenceId?: number,
    producerName?: string,
    key?: string,
    orderingKey?: Uint8Array | string,
    topic?: string,
    redeliveryCount?: number,
    schemaVersion?: Uint8Array | string,
    isReplicated?: boolean,
    replicatedFrom?: string,
  }

  export enum DataCase { 
    _DATA_NOT_SET = 0,
    DATA = 2,
  }

  export enum SizeCase { 
    _SIZE_NOT_SET = 0,
    SIZE = 3,
  }

  export enum ValueCase { 
    _VALUE_NOT_SET = 0,
    VALUE = 4,
  }

  export enum EventTimeCase { 
    _EVENT_TIME_NOT_SET = 0,
    EVENT_TIME = 7,
  }

  export enum PublishTimeCase { 
    _PUBLISH_TIME_NOT_SET = 0,
    PUBLISH_TIME = 6,
  }

  export enum BrokerPublishTimeCase { 
    _BROKER_PUBLISH_TIME_NOT_SET = 0,
    BROKER_PUBLISH_TIME = 22,
  }

  export enum MessageIdCase { 
    _MESSAGE_ID_NOT_SET = 0,
    MESSAGE_ID = 30,
  }

  export enum SequenceIdCase { 
    _SEQUENCE_ID_NOT_SET = 0,
    SEQUENCE_ID = 8,
  }

  export enum ProducerNameCase { 
    _PRODUCER_NAME_NOT_SET = 0,
    PRODUCER_NAME = 9,
  }

  export enum KeyCase { 
    _KEY_NOT_SET = 0,
    KEY = 10,
  }

  export enum OrderingKeyCase { 
    _ORDERING_KEY_NOT_SET = 0,
    ORDERING_KEY = 11,
  }

  export enum TopicCase { 
    _TOPIC_NOT_SET = 0,
    TOPIC = 12,
  }

  export enum RedeliveryCountCase { 
    _REDELIVERY_COUNT_NOT_SET = 0,
    REDELIVERY_COUNT = 13,
  }

  export enum SchemaVersionCase { 
    _SCHEMA_VERSION_NOT_SET = 0,
    SCHEMA_VERSION = 14,
  }

  export enum IsReplicatedCase { 
    _IS_REPLICATED_NOT_SET = 0,
    IS_REPLICATED = 20,
  }

  export enum ReplicatedFromCase { 
    _REPLICATED_FROM_NOT_SET = 0,
    REPLICATED_FROM = 21,
  }
}

export class TopicsSelectorByName extends jspb.Message {
  getTopicsList(): Array<string>;
  setTopicsList(value: Array<string>): TopicsSelectorByName;
  clearTopicsList(): TopicsSelectorByName;
  addTopics(value: string, index?: number): TopicsSelectorByName;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TopicsSelectorByName.AsObject;
  static toObject(includeInstance: boolean, msg: TopicsSelectorByName): TopicsSelectorByName.AsObject;
  static serializeBinaryToWriter(message: TopicsSelectorByName, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TopicsSelectorByName;
  static deserializeBinaryFromReader(message: TopicsSelectorByName, reader: jspb.BinaryReader): TopicsSelectorByName;
}

export namespace TopicsSelectorByName {
  export type AsObject = {
    topicsList: Array<string>,
  }
}

export class TopicsSelectorByRegex extends jspb.Message {
  getPattern(): string;
  setPattern(value: string): TopicsSelectorByRegex;
  hasPattern(): boolean;
  clearPattern(): TopicsSelectorByRegex;

  getRegexSubscriptionMode(): RegexSubscriptionMode;
  setRegexSubscriptionMode(value: RegexSubscriptionMode): TopicsSelectorByRegex;
  hasRegexSubscriptionMode(): boolean;
  clearRegexSubscriptionMode(): TopicsSelectorByRegex;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TopicsSelectorByRegex.AsObject;
  static toObject(includeInstance: boolean, msg: TopicsSelectorByRegex): TopicsSelectorByRegex.AsObject;
  static serializeBinaryToWriter(message: TopicsSelectorByRegex, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TopicsSelectorByRegex;
  static deserializeBinaryFromReader(message: TopicsSelectorByRegex, reader: jspb.BinaryReader): TopicsSelectorByRegex;
}

export namespace TopicsSelectorByRegex {
  export type AsObject = {
    pattern?: string,
    regexSubscriptionMode?: RegexSubscriptionMode,
  }

  export enum PatternCase { 
    _PATTERN_NOT_SET = 0,
    PATTERN = 2,
  }

  export enum RegexSubscriptionModeCase { 
    _REGEX_SUBSCRIPTION_MODE_NOT_SET = 0,
    REGEX_SUBSCRIPTION_MODE = 3,
  }
}

export class TopicsSelector extends jspb.Message {
  getByName(): TopicsSelectorByName | undefined;
  setByName(value?: TopicsSelectorByName): TopicsSelector;
  hasByName(): boolean;
  clearByName(): TopicsSelector;

  getByRegex(): TopicsSelectorByRegex | undefined;
  setByRegex(value?: TopicsSelectorByRegex): TopicsSelector;
  hasByRegex(): boolean;
  clearByRegex(): TopicsSelector;

  getTopicsSelectorCase(): TopicsSelector.TopicsSelectorCase;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TopicsSelector.AsObject;
  static toObject(includeInstance: boolean, msg: TopicsSelector): TopicsSelector.AsObject;
  static serializeBinaryToWriter(message: TopicsSelector, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TopicsSelector;
  static deserializeBinaryFromReader(message: TopicsSelector, reader: jspb.BinaryReader): TopicsSelector;
}

export namespace TopicsSelector {
  export type AsObject = {
    byName?: TopicsSelectorByName.AsObject,
    byRegex?: TopicsSelectorByRegex.AsObject,
  }

  export enum TopicsSelectorCase { 
    TOPICS_SELECTOR_NOT_SET = 0,
    BY_NAME = 1,
    BY_REGEX = 2,
  }
}

export class CreateConsumerRequest extends jspb.Message {
  getTopicsSelector(): TopicsSelector | undefined;
  setTopicsSelector(value?: TopicsSelector): CreateConsumerRequest;
  hasTopicsSelector(): boolean;
  clearTopicsSelector(): CreateConsumerRequest;

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
    topicsSelector?: TopicsSelector.AsObject,
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

export class DeleteSubscription extends jspb.Message {
  getSubscriptionName(): string;
  setSubscriptionName(value: string): DeleteSubscription;

  getTopic(): string;
  setTopic(value: string): DeleteSubscription;

  getForce(): boolean;
  setForce(value: boolean): DeleteSubscription;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeleteSubscription.AsObject;
  static toObject(includeInstance: boolean, msg: DeleteSubscription): DeleteSubscription.AsObject;
  static serializeBinaryToWriter(message: DeleteSubscription, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeleteSubscription;
  static deserializeBinaryFromReader(message: DeleteSubscription, reader: jspb.BinaryReader): DeleteSubscription;
}

export namespace DeleteSubscription {
  export type AsObject = {
    subscriptionName: string,
    topic: string,
    force: boolean,
  }
}

export class DeleteSubscriptionsRequest extends jspb.Message {
  getSubscriptionsList(): Array<DeleteSubscription>;
  setSubscriptionsList(value: Array<DeleteSubscription>): DeleteSubscriptionsRequest;
  clearSubscriptionsList(): DeleteSubscriptionsRequest;
  addSubscriptions(value?: DeleteSubscription, index?: number): DeleteSubscription;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeleteSubscriptionsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: DeleteSubscriptionsRequest): DeleteSubscriptionsRequest.AsObject;
  static serializeBinaryToWriter(message: DeleteSubscriptionsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeleteSubscriptionsRequest;
  static deserializeBinaryFromReader(message: DeleteSubscriptionsRequest, reader: jspb.BinaryReader): DeleteSubscriptionsRequest;
}

export namespace DeleteSubscriptionsRequest {
  export type AsObject = {
    subscriptionsList: Array<DeleteSubscription.AsObject>,
  }
}

export class DeleteSubscriptionsResponse extends jspb.Message {
  getStatus(): google_rpc_status_pb.Status | undefined;
  setStatus(value?: google_rpc_status_pb.Status): DeleteSubscriptionsResponse;
  hasStatus(): boolean;
  clearStatus(): DeleteSubscriptionsResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeleteSubscriptionsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: DeleteSubscriptionsResponse): DeleteSubscriptionsResponse.AsObject;
  static serializeBinaryToWriter(message: DeleteSubscriptionsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeleteSubscriptionsResponse;
  static deserializeBinaryFromReader(message: DeleteSubscriptionsResponse, reader: jspb.BinaryReader): DeleteSubscriptionsResponse;
}

export namespace DeleteSubscriptionsResponse {
  export type AsObject = {
    status?: google_rpc_status_pb.Status.AsObject,
  }
}

export class SeekRequest extends jspb.Message {
  getConsumerName(): string;
  setConsumerName(value: string): SeekRequest;

  getTimestamp(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setTimestamp(value?: google_protobuf_timestamp_pb.Timestamp): SeekRequest;
  hasTimestamp(): boolean;
  clearTimestamp(): SeekRequest;

  getMessageId(): Uint8Array | string;
  getMessageId_asU8(): Uint8Array;
  getMessageId_asB64(): string;
  setMessageId(value: Uint8Array | string): SeekRequest;

  getSeekCase(): SeekRequest.SeekCase;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SeekRequest.AsObject;
  static toObject(includeInstance: boolean, msg: SeekRequest): SeekRequest.AsObject;
  static serializeBinaryToWriter(message: SeekRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SeekRequest;
  static deserializeBinaryFromReader(message: SeekRequest, reader: jspb.BinaryReader): SeekRequest;
}

export namespace SeekRequest {
  export type AsObject = {
    consumerName: string,
    timestamp?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    messageId: Uint8Array | string,
  }

  export enum SeekCase { 
    SEEK_NOT_SET = 0,
    TIMESTAMP = 2,
    MESSAGE_ID = 3,
  }
}

export class SeekResponse extends jspb.Message {
  getStatus(): google_rpc_status_pb.Status | undefined;
  setStatus(value?: google_rpc_status_pb.Status): SeekResponse;
  hasStatus(): boolean;
  clearStatus(): SeekResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SeekResponse.AsObject;
  static toObject(includeInstance: boolean, msg: SeekResponse): SeekResponse.AsObject;
  static serializeBinaryToWriter(message: SeekResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SeekResponse;
  static deserializeBinaryFromReader(message: SeekResponse, reader: jspb.BinaryReader): SeekResponse;
}

export namespace SeekResponse {
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
export enum RegexSubscriptionMode { 
  REGEX_SUBSCRIPTION_MODE_UNSPECIFIED = 0,
  REGEX_SUBSCRIPTION_MODE_PERSISTENT_ONLY = 1,
  REGEX_SUBSCRIPTION_MODE_NON_PERSISTENT_ONLY = 2,
  REGEX_SUBSCRIPTION_MODE_ALL_TOPICS = 3,
}
