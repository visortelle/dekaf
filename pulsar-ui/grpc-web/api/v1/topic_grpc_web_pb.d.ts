import * as grpcWeb from 'grpc-web';

import * as api_v1_topic_pb from '../../api/v1/topic_pb';


export class TopicServiceClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: any; });

  readMessages(
    request: api_v1_topic_pb.ReadMessagesRequest,
    metadata?: grpcWeb.Metadata
  ): grpcWeb.ClientReadableStream<api_v1_topic_pb.ReadMessagesResponse>;

}

export class TopicServicePromiseClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: any; });

  readMessages(
    request: api_v1_topic_pb.ReadMessagesRequest,
    metadata?: grpcWeb.Metadata
  ): grpcWeb.ClientReadableStream<api_v1_topic_pb.ReadMessagesResponse>;

}

