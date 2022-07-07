/**
 * @fileoverview gRPC-Web generated client stub for api.v1
 * @enhanceable
 * @public
 */

// GENERATED CODE -- DO NOT EDIT!


/* eslint-disable */
// @ts-nocheck



const grpc = {};
grpc.web = require('grpc-web');


var google_protobuf_timestamp_pb = require('google-protobuf/google/protobuf/timestamp_pb.js')
const proto = {};
proto.api = {};
proto.api.v1 = require('./topic_pb.js');

/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?grpc.web.ClientOptions} options
 * @constructor
 * @struct
 * @final
 */
proto.api.v1.TopicServiceClient =
    function(hostname, credentials, options) {
  if (!options) options = {};
  options.format = 'text';

  /**
   * @private @const {!grpc.web.GrpcWebClientBase} The client
   */
  this.client_ = new grpc.web.GrpcWebClientBase(options);

  /**
   * @private @const {string} The hostname
   */
  this.hostname_ = hostname;

};


/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?grpc.web.ClientOptions} options
 * @constructor
 * @struct
 * @final
 */
proto.api.v1.TopicServicePromiseClient =
    function(hostname, credentials, options) {
  if (!options) options = {};
  options.format = 'text';

  /**
   * @private @const {!grpc.web.GrpcWebClientBase} The client
   */
  this.client_ = new grpc.web.GrpcWebClientBase(options);

  /**
   * @private @const {string} The hostname
   */
  this.hostname_ = hostname;

};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.api.v1.ReadMessagesRequest,
 *   !proto.api.v1.ReadMessagesResponse>}
 */
const methodDescriptor_TopicService_ReadMessages = new grpc.web.MethodDescriptor(
  '/api.v1.TopicService/ReadMessages',
  grpc.web.MethodType.SERVER_STREAMING,
  proto.api.v1.ReadMessagesRequest,
  proto.api.v1.ReadMessagesResponse,
  /**
   * @param {!proto.api.v1.ReadMessagesRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.api.v1.ReadMessagesResponse.deserializeBinary
);


/**
 * @param {!proto.api.v1.ReadMessagesRequest} request The request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!grpc.web.ClientReadableStream<!proto.api.v1.ReadMessagesResponse>}
 *     The XHR Node Readable Stream
 */
proto.api.v1.TopicServiceClient.prototype.readMessages =
    function(request, metadata) {
  return this.client_.serverStreaming(this.hostname_ +
      '/api.v1.TopicService/ReadMessages',
      request,
      metadata || {},
      methodDescriptor_TopicService_ReadMessages);
};


/**
 * @param {!proto.api.v1.ReadMessagesRequest} request The request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!grpc.web.ClientReadableStream<!proto.api.v1.ReadMessagesResponse>}
 *     The XHR Node Readable Stream
 */
proto.api.v1.TopicServicePromiseClient.prototype.readMessages =
    function(request, metadata) {
  return this.client_.serverStreaming(this.hostname_ +
      '/api.v1.TopicService/ReadMessages',
      request,
      metadata || {},
      methodDescriptor_TopicService_ReadMessages);
};


module.exports = proto.api.v1;

