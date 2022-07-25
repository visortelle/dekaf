/**
 * @fileoverview gRPC-Web generated client stub for tools.teal.pulsar.ui.api.v1
 * @enhanceable
 * @public
 */

// GENERATED CODE -- DO NOT EDIT!


/* eslint-disable */
// @ts-nocheck


import * as grpcWeb from 'grpc-web';

import * as tools_teal_pulsar_ui_api_v1_producer_pb from '../../../../../../tools/teal/pulsar/ui/api/v1/producer_pb';


export class ProducerServiceClient {
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

  methodDescriptorCreateProducer = new grpcWeb.MethodDescriptor(
    '/tools.teal.pulsar.ui.api.v1.ProducerService/CreateProducer',
    grpcWeb.MethodType.UNARY,
    tools_teal_pulsar_ui_api_v1_producer_pb.CreateProducerRequest,
    tools_teal_pulsar_ui_api_v1_producer_pb.CreateProducerResponse,
    (request: tools_teal_pulsar_ui_api_v1_producer_pb.CreateProducerRequest) => {
      return request.serializeBinary();
    },
    tools_teal_pulsar_ui_api_v1_producer_pb.CreateProducerResponse.deserializeBinary
  );

  createProducer(
    request: tools_teal_pulsar_ui_api_v1_producer_pb.CreateProducerRequest,
    metadata: grpcWeb.Metadata | null): Promise<tools_teal_pulsar_ui_api_v1_producer_pb.CreateProducerResponse>;

  createProducer(
    request: tools_teal_pulsar_ui_api_v1_producer_pb.CreateProducerRequest,
    metadata: grpcWeb.Metadata | null,
    callback: (err: grpcWeb.RpcError,
               response: tools_teal_pulsar_ui_api_v1_producer_pb.CreateProducerResponse) => void): grpcWeb.ClientReadableStream<tools_teal_pulsar_ui_api_v1_producer_pb.CreateProducerResponse>;

  createProducer(
    request: tools_teal_pulsar_ui_api_v1_producer_pb.CreateProducerRequest,
    metadata: grpcWeb.Metadata | null,
    callback?: (err: grpcWeb.RpcError,
               response: tools_teal_pulsar_ui_api_v1_producer_pb.CreateProducerResponse) => void) {
    if (callback !== undefined) {
      return this.client_.rpcCall(
        this.hostname_ +
          '/tools.teal.pulsar.ui.api.v1.ProducerService/CreateProducer',
        request,
        metadata || {},
        this.methodDescriptorCreateProducer,
        callback);
    }
    return this.client_.unaryCall(
    this.hostname_ +
      '/tools.teal.pulsar.ui.api.v1.ProducerService/CreateProducer',
    request,
    metadata || {},
    this.methodDescriptorCreateProducer);
  }

  methodDescriptorDeleteProducer = new grpcWeb.MethodDescriptor(
    '/tools.teal.pulsar.ui.api.v1.ProducerService/DeleteProducer',
    grpcWeb.MethodType.UNARY,
    tools_teal_pulsar_ui_api_v1_producer_pb.DeleteProducerRequest,
    tools_teal_pulsar_ui_api_v1_producer_pb.DeleteProducerResponse,
    (request: tools_teal_pulsar_ui_api_v1_producer_pb.DeleteProducerRequest) => {
      return request.serializeBinary();
    },
    tools_teal_pulsar_ui_api_v1_producer_pb.DeleteProducerResponse.deserializeBinary
  );

  deleteProducer(
    request: tools_teal_pulsar_ui_api_v1_producer_pb.DeleteProducerRequest,
    metadata: grpcWeb.Metadata | null): Promise<tools_teal_pulsar_ui_api_v1_producer_pb.DeleteProducerResponse>;

  deleteProducer(
    request: tools_teal_pulsar_ui_api_v1_producer_pb.DeleteProducerRequest,
    metadata: grpcWeb.Metadata | null,
    callback: (err: grpcWeb.RpcError,
               response: tools_teal_pulsar_ui_api_v1_producer_pb.DeleteProducerResponse) => void): grpcWeb.ClientReadableStream<tools_teal_pulsar_ui_api_v1_producer_pb.DeleteProducerResponse>;

  deleteProducer(
    request: tools_teal_pulsar_ui_api_v1_producer_pb.DeleteProducerRequest,
    metadata: grpcWeb.Metadata | null,
    callback?: (err: grpcWeb.RpcError,
               response: tools_teal_pulsar_ui_api_v1_producer_pb.DeleteProducerResponse) => void) {
    if (callback !== undefined) {
      return this.client_.rpcCall(
        this.hostname_ +
          '/tools.teal.pulsar.ui.api.v1.ProducerService/DeleteProducer',
        request,
        metadata || {},
        this.methodDescriptorDeleteProducer,
        callback);
    }
    return this.client_.unaryCall(
    this.hostname_ +
      '/tools.teal.pulsar.ui.api.v1.ProducerService/DeleteProducer',
    request,
    metadata || {},
    this.methodDescriptorDeleteProducer);
  }

  methodDescriptorSend = new grpcWeb.MethodDescriptor(
    '/tools.teal.pulsar.ui.api.v1.ProducerService/Send',
    grpcWeb.MethodType.UNARY,
    tools_teal_pulsar_ui_api_v1_producer_pb.SendRequest,
    tools_teal_pulsar_ui_api_v1_producer_pb.SendResponse,
    (request: tools_teal_pulsar_ui_api_v1_producer_pb.SendRequest) => {
      return request.serializeBinary();
    },
    tools_teal_pulsar_ui_api_v1_producer_pb.SendResponse.deserializeBinary
  );

  send(
    request: tools_teal_pulsar_ui_api_v1_producer_pb.SendRequest,
    metadata: grpcWeb.Metadata | null): Promise<tools_teal_pulsar_ui_api_v1_producer_pb.SendResponse>;

  send(
    request: tools_teal_pulsar_ui_api_v1_producer_pb.SendRequest,
    metadata: grpcWeb.Metadata | null,
    callback: (err: grpcWeb.RpcError,
               response: tools_teal_pulsar_ui_api_v1_producer_pb.SendResponse) => void): grpcWeb.ClientReadableStream<tools_teal_pulsar_ui_api_v1_producer_pb.SendResponse>;

  send(
    request: tools_teal_pulsar_ui_api_v1_producer_pb.SendRequest,
    metadata: grpcWeb.Metadata | null,
    callback?: (err: grpcWeb.RpcError,
               response: tools_teal_pulsar_ui_api_v1_producer_pb.SendResponse) => void) {
    if (callback !== undefined) {
      return this.client_.rpcCall(
        this.hostname_ +
          '/tools.teal.pulsar.ui.api.v1.ProducerService/Send',
        request,
        metadata || {},
        this.methodDescriptorSend,
        callback);
    }
    return this.client_.unaryCall(
    this.hostname_ +
      '/tools.teal.pulsar.ui.api.v1.ProducerService/Send',
    request,
    metadata || {},
    this.methodDescriptorSend);
  }

  methodDescriptorGetStats = new grpcWeb.MethodDescriptor(
    '/tools.teal.pulsar.ui.api.v1.ProducerService/GetStats',
    grpcWeb.MethodType.UNARY,
    tools_teal_pulsar_ui_api_v1_producer_pb.GetStatsRequest,
    tools_teal_pulsar_ui_api_v1_producer_pb.GetStatsResponse,
    (request: tools_teal_pulsar_ui_api_v1_producer_pb.GetStatsRequest) => {
      return request.serializeBinary();
    },
    tools_teal_pulsar_ui_api_v1_producer_pb.GetStatsResponse.deserializeBinary
  );

  getStats(
    request: tools_teal_pulsar_ui_api_v1_producer_pb.GetStatsRequest,
    metadata: grpcWeb.Metadata | null): Promise<tools_teal_pulsar_ui_api_v1_producer_pb.GetStatsResponse>;

  getStats(
    request: tools_teal_pulsar_ui_api_v1_producer_pb.GetStatsRequest,
    metadata: grpcWeb.Metadata | null,
    callback: (err: grpcWeb.RpcError,
               response: tools_teal_pulsar_ui_api_v1_producer_pb.GetStatsResponse) => void): grpcWeb.ClientReadableStream<tools_teal_pulsar_ui_api_v1_producer_pb.GetStatsResponse>;

  getStats(
    request: tools_teal_pulsar_ui_api_v1_producer_pb.GetStatsRequest,
    metadata: grpcWeb.Metadata | null,
    callback?: (err: grpcWeb.RpcError,
               response: tools_teal_pulsar_ui_api_v1_producer_pb.GetStatsResponse) => void) {
    if (callback !== undefined) {
      return this.client_.rpcCall(
        this.hostname_ +
          '/tools.teal.pulsar.ui.api.v1.ProducerService/GetStats',
        request,
        metadata || {},
        this.methodDescriptorGetStats,
        callback);
    }
    return this.client_.unaryCall(
    this.hostname_ +
      '/tools.teal.pulsar.ui.api.v1.ProducerService/GetStats',
    request,
    metadata || {},
    this.methodDescriptorGetStats);
  }

}

