import { StringValue, Int32Value, Int64Value, BoolValue } from 'google-protobuf/google/protobuf/wrappers_pb';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { mapToObject } from '../../../../proto-utils/proto-utils';

import { AccessMode, accessModeFromPb, accessModeToPb } from "./access-mode/access-mode";
import { BatcherBuilder, batcherBuilderFromPb, batcherBuilderToPb } from "./batcher-builder/batcher-builder";
import { CompressionType, compressionTypeFromPb, compressionTypeToPb } from "./compression-type/compression-type";
import { HashingScheme, hashingSchemeFromPb, hashingSchemeToPb } from './hashing-scheme/hashing-scheme';
import { MessageRoutingMode, messageRoutingModeFromPb, messageRoutingModeToPb } from './message-routing-mode/message-routing-mode';

export type PulsarProducerConfig = {
  batcherBuilder: BatcherBuilder | undefined;
  properties: Record<string, string>;
  producerName: string | undefined;
  accessMode: AccessMode | undefined;
  addEncryptionKey: string | undefined;
  autoUpdatePartitions: boolean | undefined;
  autoUpdatePartitionsIntervalNanos: number | undefined;
  batchingMaxBytes: number | undefined;
  batchingMaxMessages: number | undefined;
  batchingMaxPublishDelayNanos: number | undefined;
  blockIfQueueFull: boolean | undefined;
  chunkMaxMessageSize: number | undefined;
  compressionType: CompressionType | undefined;
  defaultCryptoKeyReader: Record<string, string>;
  enableBatching: boolean | undefined;
  enableChunking: boolean | undefined;
  enableLazyStartPartitioningProducers: boolean | undefined;
  hashingScheme: HashingScheme | undefined;
  initialSequenceId: number | undefined;
  maxPendingMessages: number | undefined;
  messageRoutingMode: MessageRoutingMode | undefined;
  roundRobinRouterBatchingPartitionSwitchFrequency: number | undefined;
  sendTimeoutNanos: number | undefined;
};

export function pulsarProducerConfigFromPb(v: pb.PulsarProducerConfig): PulsarProducerConfig {
  return {
    batcherBuilder: v.getBatcherBuilder() === undefined ? undefined : batcherBuilderFromPb(v.getBatcherBuilder()!),
    properties: mapToObject(v.getPropertiesMap()),
    producerName: v.getProducerName()?.getValue(),
    accessMode: v.getAccessMode() === undefined ? undefined : accessModeFromPb(v.getAccessMode()!),
    addEncryptionKey: v.getAddEncryptionKey()?.getValue(),
    autoUpdatePartitions: v.getAutoUpdatePartitions()?.getValue(),
    autoUpdatePartitionsIntervalNanos: v.getAutoUpdatePartitionsIntervalNanos()?.getValue(),
    batchingMaxBytes: v.getBatchingMaxBytes()?.getValue(),
    batchingMaxMessages: v.getBatchingMaxMessages()?.getValue(),
    batchingMaxPublishDelayNanos: v.getBatchingMaxPublishDelayNanos()?.getValue(),
    blockIfQueueFull: v.getBlockIfQueueFull()?.getValue(),
    chunkMaxMessageSize: v.getChunkMaxMessageSize()?.getValue(),
    compressionType: v.getCompressionType() === undefined ? undefined : compressionTypeFromPb(v.getCompressionType()!),
    defaultCryptoKeyReader: mapToObject(v.getDefaultCryptoKeyReaderMap()),
    enableBatching: v.getEnableBatching()?.getValue(),
    enableChunking: v.getEnableChunking()?.getValue(),
    enableLazyStartPartitioningProducers: v.getEnableLazyStartPartitioningProducers()?.getValue(),
    hashingScheme: v.getHashingScheme() === undefined ? undefined : hashingSchemeFromPb(v.getHashingScheme()!),
    initialSequenceId: v.getInitialSequenceId()?.getValue(),
    maxPendingMessages: v.getMaxPendingMessages()?.getValue(),
    messageRoutingMode: v.getMessageRoutingMode() === undefined ? undefined : messageRoutingModeFromPb(v.getMessageRoutingMode()!),
    roundRobinRouterBatchingPartitionSwitchFrequency: v.getRoundRobinRouterBatchingPartitionSwitchFrequency()?.getValue(),
    sendTimeoutNanos: v.getSendTimeoutNanos()?.getValue()
  };
}

export function pulsarProducerConfigToPb(v: PulsarProducerConfig): pb.PulsarProducerConfig {
  const configPb = new pb.PulsarProducerConfig();

  if (v.batcherBuilder !== undefined) {
    configPb.setBatcherBuilder(batcherBuilderToPb(v.batcherBuilder));
  }

  const propertiesMap = configPb.getPropertiesMap();
  Object.entries(v.properties).forEach(([key, value]) => {
    propertiesMap.set(key, value);
  });

  if (v.producerName !== undefined) {
    configPb.setProducerName(new StringValue().setValue(v.producerName));
  }

  if (v.accessMode !== undefined) {
    configPb.setAccessMode(accessModeToPb(v.accessMode));
  }

  if (v.addEncryptionKey !== undefined) {
    configPb.setAddEncryptionKey(new StringValue().setValue(v.addEncryptionKey));
  }

  if (v.autoUpdatePartitions !== undefined) {
    configPb.setAutoUpdatePartitions(new BoolValue().setValue(v.autoUpdatePartitions));
  }

  if (v.autoUpdatePartitionsIntervalNanos !== undefined) {
    configPb.setAutoUpdatePartitionsIntervalNanos(new Int64Value().setValue(v.autoUpdatePartitionsIntervalNanos));
  }

  if (v.batchingMaxBytes !== undefined) {
    configPb.setBatchingMaxBytes(new Int32Value().setValue(v.batchingMaxBytes));
  }

  if (v.batchingMaxMessages !== undefined) {
    configPb.setBatchingMaxMessages(new Int32Value().setValue(v.batchingMaxMessages));
  }

  if (v.batchingMaxPublishDelayNanos !== undefined) {
    configPb.setBatchingMaxPublishDelayNanos(new Int64Value().setValue(v.batchingMaxPublishDelayNanos));
  }

  if (v.blockIfQueueFull !== undefined) {
    configPb.setBlockIfQueueFull(new BoolValue().setValue(v.blockIfQueueFull));
  }

  if (v.chunkMaxMessageSize !== undefined) {
    configPb.setChunkMaxMessageSize(new Int32Value().setValue(v.chunkMaxMessageSize));
  }

  if (v.compressionType !== undefined) {
    configPb.setCompressionType(compressionTypeToPb(v.compressionType));
  }

  const defaultCryptoKeyReaderMap = configPb.getDefaultCryptoKeyReaderMap();
  Object.entries(v.defaultCryptoKeyReader).forEach(([key, value]) => {
    defaultCryptoKeyReaderMap.set(key, value);
  });

  if (v.enableBatching !== undefined) {
    configPb.setEnableBatching(new BoolValue().setValue(v.enableBatching));
  }

  if (v.enableChunking !== undefined) {
    configPb.setEnableChunking(new BoolValue().setValue(v.enableChunking));
  }

  if (v.enableLazyStartPartitioningProducers !== undefined) {
    configPb.setEnableLazyStartPartitioningProducers(new BoolValue().setValue(v.enableLazyStartPartitioningProducers));
  }

  if (v.hashingScheme !== undefined) {
    configPb.setHashingScheme(hashingSchemeToPb(v.hashingScheme));
  }

  if (v.initialSequenceId !== undefined) {
    configPb.setInitialSequenceId(new Int64Value().setValue(v.initialSequenceId));
  }

  if (v.maxPendingMessages !== undefined) {
    configPb.setMaxPendingMessages(new Int32Value().setValue(v.maxPendingMessages));
  }

  if (v.messageRoutingMode !== undefined) {
    configPb.setMessageRoutingMode(messageRoutingModeToPb(v.messageRoutingMode));
  }

  if (v.roundRobinRouterBatchingPartitionSwitchFrequency !== undefined) {
    configPb.setRoundRobinRouterBatchingPartitionSwitchFrequency(new Int32Value().setValue(v.roundRobinRouterBatchingPartitionSwitchFrequency));
  }

  if (v.sendTimeoutNanos !== undefined) {
    configPb.setSendTimeoutNanos(new Int64Value().setValue(v.sendTimeoutNanos));
  }

  return configPb;
}
