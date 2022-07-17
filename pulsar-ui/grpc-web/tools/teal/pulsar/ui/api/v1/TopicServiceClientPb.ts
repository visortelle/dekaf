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

  methodDescriptorGetTopicsInternalStats = new grpcWeb.MethodDescriptor(
    '/tools.teal.pulsar.ui.api.v1.TopicService/GetTopicsInternalStats',
    grpcWeb.MethodType.UNARY,
    tools_teal_pulsar_ui_api_v1_topic_pb.GetTopicsInternalStatsRequest,
    tools_teal_pulsar_ui_api_v1_topic_pb.GetTopicsInternalStatsResponse,
    (request: tools_teal_pulsar_ui_api_v1_topic_pb.GetTopicsInternalStatsRequest) => {
      return request.serializeBinary();
    },
    tools_teal_pulsar_ui_api_v1_topic_pb.GetTopicsInternalStatsResponse.deserializeBinary
  );

  getTopicsInternalStats(
    request: tools_teal_pulsar_ui_api_v1_topic_pb.GetTopicsInternalStatsRequest,
    metadata: grpcWeb.Metadata | null): Promise<tools_teal_pulsar_ui_api_v1_topic_pb.GetTopicsInternalStatsResponse>;

  getTopicsInternalStats(
    request: tools_teal_pulsar_ui_api_v1_topic_pb.GetTopicsInternalStatsRequest,
    metadata: grpcWeb.Metadata | null,
    callback: (err: grpcWeb.RpcError,
               response: tools_teal_pulsar_ui_api_v1_topic_pb.GetTopicsInternalStatsResponse) => void): grpcWeb.ClientReadableStream<tools_teal_pulsar_ui_api_v1_topic_pb.GetTopicsInternalStatsResponse>;

  getTopicsInternalStats(
    request: tools_teal_pulsar_ui_api_v1_topic_pb.GetTopicsInternalStatsRequest,
    metadata: grpcWeb.Metadata | null,
    callback?: (err: grpcWeb.RpcError,
               response: tools_teal_pulsar_ui_api_v1_topic_pb.GetTopicsInternalStatsResponse) => void) {
    if (callback !== undefined) {
      return this.client_.rpcCall(
        this.hostname_ +
          '/tools.teal.pulsar.ui.api.v1.TopicService/GetTopicsInternalStats',
        request,
        metadata || {},
        this.methodDescriptorGetTopicsInternalStats,
        callback);
    }
    return this.client_.unaryCall(
    this.hostname_ +
      '/tools.teal.pulsar.ui.api.v1.TopicService/GetTopicsInternalStats',
    request,
    metadata || {},
    this.methodDescriptorGetTopicsInternalStats);
  }

}

