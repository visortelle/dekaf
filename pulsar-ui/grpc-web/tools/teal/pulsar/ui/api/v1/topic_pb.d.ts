import * as jspb from 'google-protobuf'

import * as google_rpc_status_pb from '../../../../../../google/rpc/status_pb';


export class PartitionedTopicMetadata extends jspb.Message {
  getPartitions(): number;
  setPartitions(value: number): PartitionedTopicMetadata;
  hasPartitions(): boolean;
  clearPartitions(): PartitionedTopicMetadata;

  getPropertiesMap(): jspb.Map<string, string>;
  clearPropertiesMap(): PartitionedTopicMetadata;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PartitionedTopicMetadata.AsObject;
  static toObject(includeInstance: boolean, msg: PartitionedTopicMetadata): PartitionedTopicMetadata.AsObject;
  static serializeBinaryToWriter(message: PartitionedTopicMetadata, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PartitionedTopicMetadata;
  static deserializeBinaryFromReader(message: PartitionedTopicMetadata, reader: jspb.BinaryReader): PartitionedTopicMetadata;
}

export namespace PartitionedTopicMetadata {
  export type AsObject = {
    partitions?: number,
    propertiesMap: Array<[string, string]>,
  }

  export enum PartitionsCase { 
    _PARTITIONS_NOT_SET = 0,
    PARTITIONS = 1,
  }
}

export class PartitionedTopicInternalStats extends jspb.Message {
  getMetadata(): PartitionedTopicMetadata | undefined;
  setMetadata(value?: PartitionedTopicMetadata): PartitionedTopicInternalStats;
  hasMetadata(): boolean;
  clearMetadata(): PartitionedTopicInternalStats;

  getPartitionsMap(): jspb.Map<string, PersistentTopicInternalStats>;
  clearPartitionsMap(): PartitionedTopicInternalStats;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PartitionedTopicInternalStats.AsObject;
  static toObject(includeInstance: boolean, msg: PartitionedTopicInternalStats): PartitionedTopicInternalStats.AsObject;
  static serializeBinaryToWriter(message: PartitionedTopicInternalStats, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PartitionedTopicInternalStats;
  static deserializeBinaryFromReader(message: PartitionedTopicInternalStats, reader: jspb.BinaryReader): PartitionedTopicInternalStats;
}

export namespace PartitionedTopicInternalStats {
  export type AsObject = {
    metadata?: PartitionedTopicMetadata.AsObject,
    partitionsMap: Array<[string, PersistentTopicInternalStats.AsObject]>,
  }

  export enum MetadataCase { 
    _METADATA_NOT_SET = 0,
    METADATA = 1,
  }
}

export class PersistentTopicInternalStats extends jspb.Message {
  getManagedLedgerInternalStats(): ManagedLedgerInternalStats | undefined;
  setManagedLedgerInternalStats(value?: ManagedLedgerInternalStats): PersistentTopicInternalStats;
  hasManagedLedgerInternalStats(): boolean;
  clearManagedLedgerInternalStats(): PersistentTopicInternalStats;

  getSchemaLedgersList(): Array<LedgerInfo>;
  setSchemaLedgersList(value: Array<LedgerInfo>): PersistentTopicInternalStats;
  clearSchemaLedgersList(): PersistentTopicInternalStats;
  addSchemaLedgers(value?: LedgerInfo, index?: number): LedgerInfo;

  getCompactedLedger(): LedgerInfo | undefined;
  setCompactedLedger(value?: LedgerInfo): PersistentTopicInternalStats;
  hasCompactedLedger(): boolean;
  clearCompactedLedger(): PersistentTopicInternalStats;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PersistentTopicInternalStats.AsObject;
  static toObject(includeInstance: boolean, msg: PersistentTopicInternalStats): PersistentTopicInternalStats.AsObject;
  static serializeBinaryToWriter(message: PersistentTopicInternalStats, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PersistentTopicInternalStats;
  static deserializeBinaryFromReader(message: PersistentTopicInternalStats, reader: jspb.BinaryReader): PersistentTopicInternalStats;
}

export namespace PersistentTopicInternalStats {
  export type AsObject = {
    managedLedgerInternalStats?: ManagedLedgerInternalStats.AsObject,
    schemaLedgersList: Array<LedgerInfo.AsObject>,
    compactedLedger?: LedgerInfo.AsObject,
  }

  export enum CompactedLedgerCase { 
    _COMPACTED_LEDGER_NOT_SET = 0,
    COMPACTED_LEDGER = 3,
  }
}

export class ManagedLedgerInternalStats extends jspb.Message {
  getEntriesAddedCounter(): number;
  setEntriesAddedCounter(value: number): ManagedLedgerInternalStats;
  hasEntriesAddedCounter(): boolean;
  clearEntriesAddedCounter(): ManagedLedgerInternalStats;

  getNumberOfEntries(): number;
  setNumberOfEntries(value: number): ManagedLedgerInternalStats;
  hasNumberOfEntries(): boolean;
  clearNumberOfEntries(): ManagedLedgerInternalStats;

  getTotalSize(): number;
  setTotalSize(value: number): ManagedLedgerInternalStats;
  hasTotalSize(): boolean;
  clearTotalSize(): ManagedLedgerInternalStats;

  getCurrentLedgerEntries(): number;
  setCurrentLedgerEntries(value: number): ManagedLedgerInternalStats;
  hasCurrentLedgerEntries(): boolean;
  clearCurrentLedgerEntries(): ManagedLedgerInternalStats;

  getCurrentLedgerSize(): number;
  setCurrentLedgerSize(value: number): ManagedLedgerInternalStats;
  hasCurrentLedgerSize(): boolean;
  clearCurrentLedgerSize(): ManagedLedgerInternalStats;

  getLastLedgerCreatedTimestamp(): string;
  setLastLedgerCreatedTimestamp(value: string): ManagedLedgerInternalStats;
  hasLastLedgerCreatedTimestamp(): boolean;
  clearLastLedgerCreatedTimestamp(): ManagedLedgerInternalStats;

  getLastLedgerCreationFailureTimestamp(): string;
  setLastLedgerCreationFailureTimestamp(value: string): ManagedLedgerInternalStats;
  hasLastLedgerCreationFailureTimestamp(): boolean;
  clearLastLedgerCreationFailureTimestamp(): ManagedLedgerInternalStats;

  getWaitingCursorsCount(): number;
  setWaitingCursorsCount(value: number): ManagedLedgerInternalStats;
  hasWaitingCursorsCount(): boolean;
  clearWaitingCursorsCount(): ManagedLedgerInternalStats;

  getPendingEntriesCount(): number;
  setPendingEntriesCount(value: number): ManagedLedgerInternalStats;
  hasPendingEntriesCount(): boolean;
  clearPendingEntriesCount(): ManagedLedgerInternalStats;

  getLastConfirmedEntry(): string;
  setLastConfirmedEntry(value: string): ManagedLedgerInternalStats;
  hasLastConfirmedEntry(): boolean;
  clearLastConfirmedEntry(): ManagedLedgerInternalStats;

  getState(): string;
  setState(value: string): ManagedLedgerInternalStats;
  hasState(): boolean;
  clearState(): ManagedLedgerInternalStats;

  getLedgersList(): Array<LedgerInfo>;
  setLedgersList(value: Array<LedgerInfo>): ManagedLedgerInternalStats;
  clearLedgersList(): ManagedLedgerInternalStats;
  addLedgers(value?: LedgerInfo, index?: number): LedgerInfo;

  getCursorsMap(): jspb.Map<string, CursorStats>;
  clearCursorsMap(): ManagedLedgerInternalStats;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ManagedLedgerInternalStats.AsObject;
  static toObject(includeInstance: boolean, msg: ManagedLedgerInternalStats): ManagedLedgerInternalStats.AsObject;
  static serializeBinaryToWriter(message: ManagedLedgerInternalStats, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ManagedLedgerInternalStats;
  static deserializeBinaryFromReader(message: ManagedLedgerInternalStats, reader: jspb.BinaryReader): ManagedLedgerInternalStats;
}

export namespace ManagedLedgerInternalStats {
  export type AsObject = {
    entriesAddedCounter?: number,
    numberOfEntries?: number,
    totalSize?: number,
    currentLedgerEntries?: number,
    currentLedgerSize?: number,
    lastLedgerCreatedTimestamp?: string,
    lastLedgerCreationFailureTimestamp?: string,
    waitingCursorsCount?: number,
    pendingEntriesCount?: number,
    lastConfirmedEntry?: string,
    state?: string,
    ledgersList: Array<LedgerInfo.AsObject>,
    cursorsMap: Array<[string, CursorStats.AsObject]>,
  }

  export enum EntriesAddedCounterCase { 
    _ENTRIES_ADDED_COUNTER_NOT_SET = 0,
    ENTRIES_ADDED_COUNTER = 1,
  }

  export enum NumberOfEntriesCase { 
    _NUMBER_OF_ENTRIES_NOT_SET = 0,
    NUMBER_OF_ENTRIES = 2,
  }

  export enum TotalSizeCase { 
    _TOTAL_SIZE_NOT_SET = 0,
    TOTAL_SIZE = 3,
  }

  export enum CurrentLedgerEntriesCase { 
    _CURRENT_LEDGER_ENTRIES_NOT_SET = 0,
    CURRENT_LEDGER_ENTRIES = 4,
  }

  export enum CurrentLedgerSizeCase { 
    _CURRENT_LEDGER_SIZE_NOT_SET = 0,
    CURRENT_LEDGER_SIZE = 5,
  }

  export enum LastLedgerCreatedTimestampCase { 
    _LAST_LEDGER_CREATED_TIMESTAMP_NOT_SET = 0,
    LAST_LEDGER_CREATED_TIMESTAMP = 6,
  }

  export enum LastLedgerCreationFailureTimestampCase { 
    _LAST_LEDGER_CREATION_FAILURE_TIMESTAMP_NOT_SET = 0,
    LAST_LEDGER_CREATION_FAILURE_TIMESTAMP = 7,
  }

  export enum WaitingCursorsCountCase { 
    _WAITING_CURSORS_COUNT_NOT_SET = 0,
    WAITING_CURSORS_COUNT = 8,
  }

  export enum PendingEntriesCountCase { 
    _PENDING_ENTRIES_COUNT_NOT_SET = 0,
    PENDING_ENTRIES_COUNT = 9,
  }

  export enum LastConfirmedEntryCase { 
    _LAST_CONFIRMED_ENTRY_NOT_SET = 0,
    LAST_CONFIRMED_ENTRY = 10,
  }

  export enum StateCase { 
    _STATE_NOT_SET = 0,
    STATE = 11,
  }
}

export class LedgerInfo extends jspb.Message {
  getLedgerId(): number;
  setLedgerId(value: number): LedgerInfo;
  hasLedgerId(): boolean;
  clearLedgerId(): LedgerInfo;

  getEntries(): number;
  setEntries(value: number): LedgerInfo;
  hasEntries(): boolean;
  clearEntries(): LedgerInfo;

  getSize(): number;
  setSize(value: number): LedgerInfo;
  hasSize(): boolean;
  clearSize(): LedgerInfo;

  getOffloaded(): boolean;
  setOffloaded(value: boolean): LedgerInfo;
  hasOffloaded(): boolean;
  clearOffloaded(): LedgerInfo;

  getMetadata(): string;
  setMetadata(value: string): LedgerInfo;
  hasMetadata(): boolean;
  clearMetadata(): LedgerInfo;

  getUnderReplicated(): boolean;
  setUnderReplicated(value: boolean): LedgerInfo;
  hasUnderReplicated(): boolean;
  clearUnderReplicated(): LedgerInfo;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): LedgerInfo.AsObject;
  static toObject(includeInstance: boolean, msg: LedgerInfo): LedgerInfo.AsObject;
  static serializeBinaryToWriter(message: LedgerInfo, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): LedgerInfo;
  static deserializeBinaryFromReader(message: LedgerInfo, reader: jspb.BinaryReader): LedgerInfo;
}

export namespace LedgerInfo {
  export type AsObject = {
    ledgerId?: number,
    entries?: number,
    size?: number,
    offloaded?: boolean,
    metadata?: string,
    underReplicated?: boolean,
  }

  export enum LedgerIdCase { 
    _LEDGER_ID_NOT_SET = 0,
    LEDGER_ID = 1,
  }

  export enum EntriesCase { 
    _ENTRIES_NOT_SET = 0,
    ENTRIES = 2,
  }

  export enum SizeCase { 
    _SIZE_NOT_SET = 0,
    SIZE = 3,
  }

  export enum OffloadedCase { 
    _OFFLOADED_NOT_SET = 0,
    OFFLOADED = 4,
  }

  export enum MetadataCase { 
    _METADATA_NOT_SET = 0,
    METADATA = 5,
  }

  export enum UnderReplicatedCase { 
    _UNDER_REPLICATED_NOT_SET = 0,
    UNDER_REPLICATED = 6,
  }
}

export class CursorStats extends jspb.Message {
  getMarkDeletePosition(): string;
  setMarkDeletePosition(value: string): CursorStats;
  hasMarkDeletePosition(): boolean;
  clearMarkDeletePosition(): CursorStats;

  getReadPosition(): string;
  setReadPosition(value: string): CursorStats;
  hasReadPosition(): boolean;
  clearReadPosition(): CursorStats;

  getWaitingReadOp(): boolean;
  setWaitingReadOp(value: boolean): CursorStats;
  hasWaitingReadOp(): boolean;
  clearWaitingReadOp(): CursorStats;

  getPendingReadOps(): number;
  setPendingReadOps(value: number): CursorStats;
  hasPendingReadOps(): boolean;
  clearPendingReadOps(): CursorStats;

  getMessagesConsumedCounter(): number;
  setMessagesConsumedCounter(value: number): CursorStats;
  hasMessagesConsumedCounter(): boolean;
  clearMessagesConsumedCounter(): CursorStats;

  getCursorLedger(): number;
  setCursorLedger(value: number): CursorStats;
  hasCursorLedger(): boolean;
  clearCursorLedger(): CursorStats;

  getCursorLedgerLastEntry(): number;
  setCursorLedgerLastEntry(value: number): CursorStats;
  hasCursorLedgerLastEntry(): boolean;
  clearCursorLedgerLastEntry(): CursorStats;

  getIndividuallyDeletedMessages(): string;
  setIndividuallyDeletedMessages(value: string): CursorStats;
  hasIndividuallyDeletedMessages(): boolean;
  clearIndividuallyDeletedMessages(): CursorStats;

  getLastLedgerSwitchTimestamp(): string;
  setLastLedgerSwitchTimestamp(value: string): CursorStats;
  hasLastLedgerSwitchTimestamp(): boolean;
  clearLastLedgerSwitchTimestamp(): CursorStats;

  getState(): string;
  setState(value: string): CursorStats;
  hasState(): boolean;
  clearState(): CursorStats;

  getNumberOfEntriesSinceFirstNotAckedMessage(): number;
  setNumberOfEntriesSinceFirstNotAckedMessage(value: number): CursorStats;
  hasNumberOfEntriesSinceFirstNotAckedMessage(): boolean;
  clearNumberOfEntriesSinceFirstNotAckedMessage(): CursorStats;

  getTotalNonContiguousDeletedMessagesRange(): number;
  setTotalNonContiguousDeletedMessagesRange(value: number): CursorStats;
  hasTotalNonContiguousDeletedMessagesRange(): boolean;
  clearTotalNonContiguousDeletedMessagesRange(): CursorStats;

  getSubscriptionHavePendingRead(): boolean;
  setSubscriptionHavePendingRead(value: boolean): CursorStats;
  hasSubscriptionHavePendingRead(): boolean;
  clearSubscriptionHavePendingRead(): CursorStats;

  getSubscriptionHavePendingReplayRead(): boolean;
  setSubscriptionHavePendingReplayRead(value: boolean): CursorStats;
  hasSubscriptionHavePendingReplayRead(): boolean;
  clearSubscriptionHavePendingReplayRead(): CursorStats;

  getPropertiesMap(): jspb.Map<string, number>;
  clearPropertiesMap(): CursorStats;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CursorStats.AsObject;
  static toObject(includeInstance: boolean, msg: CursorStats): CursorStats.AsObject;
  static serializeBinaryToWriter(message: CursorStats, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CursorStats;
  static deserializeBinaryFromReader(message: CursorStats, reader: jspb.BinaryReader): CursorStats;
}

export namespace CursorStats {
  export type AsObject = {
    markDeletePosition?: string,
    readPosition?: string,
    waitingReadOp?: boolean,
    pendingReadOps?: number,
    messagesConsumedCounter?: number,
    cursorLedger?: number,
    cursorLedgerLastEntry?: number,
    individuallyDeletedMessages?: string,
    lastLedgerSwitchTimestamp?: string,
    state?: string,
    numberOfEntriesSinceFirstNotAckedMessage?: number,
    totalNonContiguousDeletedMessagesRange?: number,
    subscriptionHavePendingRead?: boolean,
    subscriptionHavePendingReplayRead?: boolean,
    propertiesMap: Array<[string, number]>,
  }

  export enum MarkDeletePositionCase { 
    _MARK_DELETE_POSITION_NOT_SET = 0,
    MARK_DELETE_POSITION = 1,
  }

  export enum ReadPositionCase { 
    _READ_POSITION_NOT_SET = 0,
    READ_POSITION = 2,
  }

  export enum WaitingReadOpCase { 
    _WAITING_READ_OP_NOT_SET = 0,
    WAITING_READ_OP = 3,
  }

  export enum PendingReadOpsCase { 
    _PENDING_READ_OPS_NOT_SET = 0,
    PENDING_READ_OPS = 4,
  }

  export enum MessagesConsumedCounterCase { 
    _MESSAGES_CONSUMED_COUNTER_NOT_SET = 0,
    MESSAGES_CONSUMED_COUNTER = 5,
  }

  export enum CursorLedgerCase { 
    _CURSOR_LEDGER_NOT_SET = 0,
    CURSOR_LEDGER = 6,
  }

  export enum CursorLedgerLastEntryCase { 
    _CURSOR_LEDGER_LAST_ENTRY_NOT_SET = 0,
    CURSOR_LEDGER_LAST_ENTRY = 7,
  }

  export enum IndividuallyDeletedMessagesCase { 
    _INDIVIDUALLY_DELETED_MESSAGES_NOT_SET = 0,
    INDIVIDUALLY_DELETED_MESSAGES = 8,
  }

  export enum LastLedgerSwitchTimestampCase { 
    _LAST_LEDGER_SWITCH_TIMESTAMP_NOT_SET = 0,
    LAST_LEDGER_SWITCH_TIMESTAMP = 9,
  }

  export enum StateCase { 
    _STATE_NOT_SET = 0,
    STATE = 10,
  }

  export enum NumberOfEntriesSinceFirstNotAckedMessageCase { 
    _NUMBER_OF_ENTRIES_SINCE_FIRST_NOT_ACKED_MESSAGE_NOT_SET = 0,
    NUMBER_OF_ENTRIES_SINCE_FIRST_NOT_ACKED_MESSAGE = 11,
  }

  export enum TotalNonContiguousDeletedMessagesRangeCase { 
    _TOTAL_NON_CONTIGUOUS_DELETED_MESSAGES_RANGE_NOT_SET = 0,
    TOTAL_NON_CONTIGUOUS_DELETED_MESSAGES_RANGE = 12,
  }

  export enum SubscriptionHavePendingReadCase { 
    _SUBSCRIPTION_HAVE_PENDING_READ_NOT_SET = 0,
    SUBSCRIPTION_HAVE_PENDING_READ = 13,
  }

  export enum SubscriptionHavePendingReplayReadCase { 
    _SUBSCRIPTION_HAVE_PENDING_REPLAY_READ_NOT_SET = 0,
    SUBSCRIPTION_HAVE_PENDING_REPLAY_READ = 14,
  }
}

export class GetTopicInternalStatsRequest extends jspb.Message {
  getTopic(): string;
  setTopic(value: string): GetTopicInternalStatsRequest;
  hasTopic(): boolean;
  clearTopic(): GetTopicInternalStatsRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetTopicInternalStatsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetTopicInternalStatsRequest): GetTopicInternalStatsRequest.AsObject;
  static serializeBinaryToWriter(message: GetTopicInternalStatsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetTopicInternalStatsRequest;
  static deserializeBinaryFromReader(message: GetTopicInternalStatsRequest, reader: jspb.BinaryReader): GetTopicInternalStatsRequest;
}

export namespace GetTopicInternalStatsRequest {
  export type AsObject = {
    topic?: string,
  }

  export enum TopicCase { 
    _TOPIC_NOT_SET = 0,
    TOPIC = 1,
  }
}

export class GetTopicInternalStatsResponse extends jspb.Message {
  getStatus(): google_rpc_status_pb.Status | undefined;
  setStatus(value?: google_rpc_status_pb.Status): GetTopicInternalStatsResponse;
  hasStatus(): boolean;
  clearStatus(): GetTopicInternalStatsResponse;

  getStats(): PartitionedTopicInternalStats | undefined;
  setStats(value?: PartitionedTopicInternalStats): GetTopicInternalStatsResponse;
  hasStats(): boolean;
  clearStats(): GetTopicInternalStatsResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetTopicInternalStatsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetTopicInternalStatsResponse): GetTopicInternalStatsResponse.AsObject;
  static serializeBinaryToWriter(message: GetTopicInternalStatsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetTopicInternalStatsResponse;
  static deserializeBinaryFromReader(message: GetTopicInternalStatsResponse, reader: jspb.BinaryReader): GetTopicInternalStatsResponse;
}

export namespace GetTopicInternalStatsResponse {
  export type AsObject = {
    status?: google_rpc_status_pb.Status.AsObject,
    stats?: PartitionedTopicInternalStats.AsObject,
  }

  export enum StatsCase { 
    _STATS_NOT_SET = 0,
    STATS = 2,
  }
}

export class GetPartitionedTopicInternalStatsRequest extends jspb.Message {
  getTopic(): string;
  setTopic(value: string): GetPartitionedTopicInternalStatsRequest;
  hasTopic(): boolean;
  clearTopic(): GetPartitionedTopicInternalStatsRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetPartitionedTopicInternalStatsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetPartitionedTopicInternalStatsRequest): GetPartitionedTopicInternalStatsRequest.AsObject;
  static serializeBinaryToWriter(message: GetPartitionedTopicInternalStatsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetPartitionedTopicInternalStatsRequest;
  static deserializeBinaryFromReader(message: GetPartitionedTopicInternalStatsRequest, reader: jspb.BinaryReader): GetPartitionedTopicInternalStatsRequest;
}

export namespace GetPartitionedTopicInternalStatsRequest {
  export type AsObject = {
    topic?: string,
  }

  export enum TopicCase { 
    _TOPIC_NOT_SET = 0,
    TOPIC = 1,
  }
}

export class GetPartitionedTopicInternalStatsResponse extends jspb.Message {
  getStatus(): google_rpc_status_pb.Status | undefined;
  setStatus(value?: google_rpc_status_pb.Status): GetPartitionedTopicInternalStatsResponse;
  hasStatus(): boolean;
  clearStatus(): GetPartitionedTopicInternalStatsResponse;

  getStats(): PartitionedTopicInternalStats | undefined;
  setStats(value?: PartitionedTopicInternalStats): GetPartitionedTopicInternalStatsResponse;
  hasStats(): boolean;
  clearStats(): GetPartitionedTopicInternalStatsResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetPartitionedTopicInternalStatsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetPartitionedTopicInternalStatsResponse): GetPartitionedTopicInternalStatsResponse.AsObject;
  static serializeBinaryToWriter(message: GetPartitionedTopicInternalStatsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetPartitionedTopicInternalStatsResponse;
  static deserializeBinaryFromReader(message: GetPartitionedTopicInternalStatsResponse, reader: jspb.BinaryReader): GetPartitionedTopicInternalStatsResponse;
}

export namespace GetPartitionedTopicInternalStatsResponse {
  export type AsObject = {
    status?: google_rpc_status_pb.Status.AsObject,
    stats?: PartitionedTopicInternalStats.AsObject,
  }

  export enum StatsCase { 
    _STATS_NOT_SET = 0,
    STATS = 2,
  }
}

