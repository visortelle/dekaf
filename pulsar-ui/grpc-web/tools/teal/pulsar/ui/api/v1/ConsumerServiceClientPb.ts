/**
 * @fileoverview gRPC-Web generated client stub for tools.teal.pulsar.ui.api.v1
 * @enhanceable
 * @public
 */

// GENERATED CODE -- DO NOT EDIT!


/* eslint-disable */
// @ts-nocheck


import * as grpcWeb from 'grpc-web';

import * as tools_teal_pulsar_ui_api_v1_consumer_pb from '../../../../../../tools/teal/pulsar/ui/api/v1/consumer_pb';


export class ConsumerServiceClient {
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

  methodDescriptorCreateConsumer = new grpcWeb.MethodDescriptor(
    '/tools.teal.pulsar.ui.api.v1.ConsumerService/CreateConsumer',
    grpcWeb.MethodType.UNARY,
    tools_teal_pulsar_ui_api_v1_consumer_pb.CreateConsumerRequest,
    tools_teal_pulsar_ui_api_v1_consumer_pb.CreateConsumerResponse,
    (request: tools_teal_pulsar_ui_api_v1_consumer_pb.CreateConsumerRequest) => {
      return request.serializeBinary();
    },
    tools_teal_pulsar_ui_api_v1_consumer_pb.CreateConsumerResponse.deserializeBinary
  );

  createConsumer(
    request: tools_teal_pulsar_ui_api_v1_consumer_pb.CreateConsumerRequest,
    metadata: grpcWeb.Metadata | null): Promise<tools_teal_pulsar_ui_api_v1_consumer_pb.CreateConsumerResponse>;

  createConsumer(
    request: tools_teal_pulsar_ui_api_v1_consumer_pb.CreateConsumerRequest,
    metadata: grpcWeb.Metadata | null,
    callback: (err: grpcWeb.RpcError,
               response: tools_teal_pulsar_ui_api_v1_consumer_pb.CreateConsumerResponse) => void): grpcWeb.ClientReadableStream<tools_teal_pulsar_ui_api_v1_consumer_pb.CreateConsumerResponse>;

  createConsumer(
    request: tools_teal_pulsar_ui_api_v1_consumer_pb.CreateConsumerRequest,
    metadata: grpcWeb.Metadata | null,
    callback?: (err: grpcWeb.RpcError,
               response: tools_teal_pulsar_ui_api_v1_consumer_pb.CreateConsumerResponse) => void) {
    if (callback !== undefined) {
      return this.client_.rpcCall(
        this.hostname_ +
          '/tools.teal.pulsar.ui.api.v1.ConsumerService/CreateConsumer',
        request,
        metadata || {},
        this.methodDescriptorCreateConsumer,
        callback);
    }
    return this.client_.unaryCall(
    this.hostname_ +
      '/tools.teal.pulsar.ui.api.v1.ConsumerService/CreateConsumer',
    request,
    metadata || {},
    this.methodDescriptorCreateConsumer);
  }

  methodDescriptorDeleteConsumer = new grpcWeb.MethodDescriptor(
    '/tools.teal.pulsar.ui.api.v1.ConsumerService/DeleteConsumer',
    grpcWeb.MethodType.UNARY,
    tools_teal_pulsar_ui_api_v1_consumer_pb.DeleteConsumerRequest,
    tools_teal_pulsar_ui_api_v1_consumer_pb.DeleteConsumerResponse,
    (request: tools_teal_pulsar_ui_api_v1_consumer_pb.DeleteConsumerRequest) => {
      return request.serializeBinary();
    },
    tools_teal_pulsar_ui_api_v1_consumer_pb.DeleteConsumerResponse.deserializeBinary
  );

  deleteConsumer(
    request: tools_teal_pulsar_ui_api_v1_consumer_pb.DeleteConsumerRequest,
    metadata: grpcWeb.Metadata | null): Promise<tools_teal_pulsar_ui_api_v1_consumer_pb.DeleteConsumerResponse>;

  deleteConsumer(
    request: tools_teal_pulsar_ui_api_v1_consumer_pb.DeleteConsumerRequest,
    metadata: grpcWeb.Metadata | null,
    callback: (err: grpcWeb.RpcError,
               response: tools_teal_pulsar_ui_api_v1_consumer_pb.DeleteConsumerResponse) => void): grpcWeb.ClientReadableStream<tools_teal_pulsar_ui_api_v1_consumer_pb.DeleteConsumerResponse>;

  deleteConsumer(
    request: tools_teal_pulsar_ui_api_v1_consumer_pb.DeleteConsumerRequest,
    metadata: grpcWeb.Metadata | null,
    callback?: (err: grpcWeb.RpcError,
               response: tools_teal_pulsar_ui_api_v1_consumer_pb.DeleteConsumerResponse) => void) {
    if (callback !== undefined) {
      return this.client_.rpcCall(
        this.hostname_ +
          '/tools.teal.pulsar.ui.api.v1.ConsumerService/DeleteConsumer',
        request,
        metadata || {},
        this.methodDescriptorDeleteConsumer,
        callback);
    }
    return this.client_.unaryCall(
    this.hostname_ +
      '/tools.teal.pulsar.ui.api.v1.ConsumerService/DeleteConsumer',
    request,
    metadata || {},
    this.methodDescriptorDeleteConsumer);
  }

  methodDescriptorResume = new grpcWeb.MethodDescriptor(
    '/tools.teal.pulsar.ui.api.v1.ConsumerService/Resume',
    grpcWeb.MethodType.SERVER_STREAMING,
    tools_teal_pulsar_ui_api_v1_consumer_pb.ResumeRequest,
    tools_teal_pulsar_ui_api_v1_consumer_pb.ResumeResponse,
    (request: tools_teal_pulsar_ui_api_v1_consumer_pb.ResumeRequest) => {
      return request.serializeBinary();
    },
    tools_teal_pulsar_ui_api_v1_consumer_pb.ResumeResponse.deserializeBinary
  );

  resume(
    request: tools_teal_pulsar_ui_api_v1_consumer_pb.ResumeRequest,
    metadata?: grpcWeb.Metadata): grpcWeb.ClientReadableStream<tools_teal_pulsar_ui_api_v1_consumer_pb.ResumeResponse> {
    return this.client_.serverStreaming(
      this.hostname_ +
        '/tools.teal.pulsar.ui.api.v1.ConsumerService/Resume',
      request,
      metadata || {},
      this.methodDescriptorResume);
  }

  methodDescriptorPause = new grpcWeb.MethodDescriptor(
    '/tools.teal.pulsar.ui.api.v1.ConsumerService/Pause',
    grpcWeb.MethodType.UNARY,
    tools_teal_pulsar_ui_api_v1_consumer_pb.PauseRequest,
    tools_teal_pulsar_ui_api_v1_consumer_pb.PauseResponse,
    (request: tools_teal_pulsar_ui_api_v1_consumer_pb.PauseRequest) => {
      return request.serializeBinary();
    },
    tools_teal_pulsar_ui_api_v1_consumer_pb.PauseResponse.deserializeBinary
  );

  pause(
    request: tools_teal_pulsar_ui_api_v1_consumer_pb.PauseRequest,
    metadata: grpcWeb.Metadata | null): Promise<tools_teal_pulsar_ui_api_v1_consumer_pb.PauseResponse>;

  pause(
    request: tools_teal_pulsar_ui_api_v1_consumer_pb.PauseRequest,
    metadata: grpcWeb.Metadata | null,
    callback: (err: grpcWeb.RpcError,
               response: tools_teal_pulsar_ui_api_v1_consumer_pb.PauseResponse) => void): grpcWeb.ClientReadableStream<tools_teal_pulsar_ui_api_v1_consumer_pb.PauseResponse>;

  pause(
    request: tools_teal_pulsar_ui_api_v1_consumer_pb.PauseRequest,
    metadata: grpcWeb.Metadata | null,
    callback?: (err: grpcWeb.RpcError,
               response: tools_teal_pulsar_ui_api_v1_consumer_pb.PauseResponse) => void) {
    if (callback !== undefined) {
      return this.client_.rpcCall(
        this.hostname_ +
          '/tools.teal.pulsar.ui.api.v1.ConsumerService/Pause',
        request,
        metadata || {},
        this.methodDescriptorPause,
        callback);
    }
    return this.client_.unaryCall(
    this.hostname_ +
      '/tools.teal.pulsar.ui.api.v1.ConsumerService/Pause',
    request,
    metadata || {},
    this.methodDescriptorPause);
  }

}

