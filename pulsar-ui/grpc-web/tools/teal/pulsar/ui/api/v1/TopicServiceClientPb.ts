/**
 * @fileoverview gRPC-Web generated client stub for tools.teal.pulsar.ui.api.v1
 * @enhanceable
 * @public
 */

// GENERATED CODE -- DO NOT EDIT!


/* eslint-disable */
// @ts-nocheck


import * as grpcWeb from 'grpc-web';

import * as tools_teal_pulsar_ui_api_v1_topic_pb from '../../../../../../tools/teal/pulsar/ui/api/v1/topic_pb';


export class TopicServiceClient {
  client_: grpcWeb.AbstractClientBase;
  hostname_: string;
  credentials_: null | { [index: string]: string; };
  options_: null | { [index: string]: any; };

  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: any; }) {
    if (!options) options = {};
    if (!credentials) credentials = {};
    options['format'] = 'text';

    this.client_ = new grpcWeb.GrpcWebClientBase(options);
    this.hostname_ = hostname;
    this.credentials_ = credentials;
    this.options_ = options;
  }

  methodDescriptorGetTopicInternalStats = new grpcWeb.MethodDescriptor(
    '/tools.teal.pulsar.ui.api.v1.TopicService/GetTopicInternalStats',
    grpcWeb.MethodType.UNARY,
    tools_teal_pulsar_ui_api_v1_topic_pb.GetTopicInternalStatsRequest,
    tools_teal_pulsar_ui_api_v1_topic_pb.GetTopicInternalStatsResponse,
    (request: tools_teal_pulsar_ui_api_v1_topic_pb.GetTopicInternalStatsRequest) => {
      return request.serializeBinary();
    },
    tools_teal_pulsar_ui_api_v1_topic_pb.GetTopicInternalStatsResponse.deserializeBinary
  );

  getTopicInternalStats(
    request: tools_teal_pulsar_ui_api_v1_topic_pb.GetTopicInternalStatsRequest,
    metadata: grpcWeb.Metadata | null): Promise<tools_teal_pulsar_ui_api_v1_topic_pb.GetTopicInternalStatsResponse>;

  getTopicInternalStats(
    request: tools_teal_pulsar_ui_api_v1_topic_pb.GetTopicInternalStatsRequest,
    metadata: grpcWeb.Metadata | null,
    callback: (err: grpcWeb.RpcError,
               response: tools_teal_pulsar_ui_api_v1_topic_pb.GetTopicInternalStatsResponse) => void): grpcWeb.ClientReadableStream<tools_teal_pulsar_ui_api_v1_topic_pb.GetTopicInternalStatsResponse>;

  getTopicInternalStats(
    request: tools_teal_pulsar_ui_api_v1_topic_pb.GetTopicInternalStatsRequest,
    metadata: grpcWeb.Metadata | null,
    callback?: (err: grpcWeb.RpcError,
               response: tools_teal_pulsar_ui_api_v1_topic_pb.GetTopicInternalStatsResponse) => void) {
    if (callback !== undefined) {
      return this.client_.rpcCall(
        this.hostname_ +
          '/tools.teal.pulsar.ui.api.v1.TopicService/GetTopicInternalStats',
        request,
        metadata || {},
        this.methodDescriptorGetTopicInternalStats,
        callback);
    }
    return this.client_.unaryCall(
    this.hostname_ +
      '/tools.teal.pulsar.ui.api.v1.TopicService/GetTopicInternalStats',
    request,
    metadata || {},
    this.methodDescriptorGetTopicInternalStats);
  }

  methodDescriptorGetPartitionedTopicInternalStats = new grpcWeb.MethodDescriptor(
    '/tools.teal.pulsar.ui.api.v1.TopicService/GetPartitionedTopicInternalStats',
    grpcWeb.MethodType.UNARY,
    tools_teal_pulsar_ui_api_v1_topic_pb.GetPartitionedTopicInternalStatsRequest,
    tools_teal_pulsar_ui_api_v1_topic_pb.GetPartitionedTopicInternalStatsResponse,
    (request: tools_teal_pulsar_ui_api_v1_topic_pb.GetPartitionedTopicInternalStatsRequest) => {
      return request.serializeBinary();
    },
    tools_teal_pulsar_ui_api_v1_topic_pb.GetPartitionedTopicInternalStatsResponse.deserializeBinary
  );

  getPartitionedTopicInternalStats(
    request: tools_teal_pulsar_ui_api_v1_topic_pb.GetPartitionedTopicInternalStatsRequest,
    metadata: grpcWeb.Metadata | null): Promise<tools_teal_pulsar_ui_api_v1_topic_pb.GetPartitionedTopicInternalStatsResponse>;

  getPartitionedTopicInternalStats(
    request: tools_teal_pulsar_ui_api_v1_topic_pb.GetPartitionedTopicInternalStatsRequest,
    metadata: grpcWeb.Metadata | null,
    callback: (err: grpcWeb.RpcError,
               response: tools_teal_pulsar_ui_api_v1_topic_pb.GetPartitionedTopicInternalStatsResponse) => void): grpcWeb.ClientReadableStream<tools_teal_pulsar_ui_api_v1_topic_pb.GetPartitionedTopicInternalStatsResponse>;

  getPartitionedTopicInternalStats(
    request: tools_teal_pulsar_ui_api_v1_topic_pb.GetPartitionedTopicInternalStatsRequest,
    metadata: grpcWeb.Metadata | null,
    callback?: (err: grpcWeb.RpcError,
               response: tools_teal_pulsar_ui_api_v1_topic_pb.GetPartitionedTopicInternalStatsResponse) => void) {
    if (callback !== undefined) {
      return this.client_.rpcCall(
        this.hostname_ +
          '/tools.teal.pulsar.ui.api.v1.TopicService/GetPartitionedTopicInternalStats',
        request,
        metadata || {},
        this.methodDescriptorGetPartitionedTopicInternalStats,
        callback);
    }
    return this.client_.unaryCall(
    this.hostname_ +
      '/tools.teal.pulsar.ui.api.v1.TopicService/GetPartitionedTopicInternalStats',
    request,
    metadata || {},
    this.methodDescriptorGetPartitionedTopicInternalStats);
  }

}

