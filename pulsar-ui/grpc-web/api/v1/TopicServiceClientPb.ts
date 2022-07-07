/**
 * @fileoverview gRPC-Web generated client stub for api.v1
 * @enhanceable
 * @public
 */

// GENERATED CODE -- DO NOT EDIT!


/* eslint-disable */
// @ts-nocheck


import * as grpcWeb from 'grpc-web';

import * as api_v1_topic_pb from '../../api/v1/topic_pb';


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

  methodDescriptorReadMessages = new grpcWeb.MethodDescriptor(
    '/api.v1.TopicService/ReadMessages',
    grpcWeb.MethodType.SERVER_STREAMING,
    api_v1_topic_pb.ReadMessagesRequest,
    api_v1_topic_pb.ReadMessagesResponse,
    (request: api_v1_topic_pb.ReadMessagesRequest) => {
      return request.serializeBinary();
    },
    api_v1_topic_pb.ReadMessagesResponse.deserializeBinary
  );

  readMessages(
    request: api_v1_topic_pb.ReadMessagesRequest,
    metadata?: grpcWeb.Metadata): grpcWeb.ClientReadableStream<api_v1_topic_pb.ReadMessagesResponse> {
    return this.client_.serverStreaming(
      this.hostname_ +
        '/api.v1.TopicService/ReadMessages',
      request,
      metadata || {},
      this.methodDescriptorReadMessages);
  }

}

