import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';

export type MessageRoutingMode = 'round-robin-partition' | 'single-partition' | 'custom-partition';

export function messageRoutingModeFromPb(messageRoutingMode: pb.MessageRoutingMode): MessageRoutingMode {
  switch (messageRoutingMode) {
    case pb.MessageRoutingMode.MESSAGE_ROUTING_MODE_ROUND_ROBIN_PARTITION: return 'round-robin-partition';
    case pb.MessageRoutingMode.MESSAGE_ROUTING_MODE_SINGLE_PARTITION: return 'single-partition';
    case pb.MessageRoutingMode.MESSAGE_ROUTING_MODE_CUSTOM_PARTITION: return 'custom-partition';
    default: throw new Error(`Unknown message routing mode: ${messageRoutingMode}`);
  }
}

export function messageRoutingModeToPb(messageRoutingMode: MessageRoutingMode): pb.MessageRoutingMode {
  switch (messageRoutingMode) {
    case 'round-robin-partition': return pb.MessageRoutingMode.MESSAGE_ROUTING_MODE_ROUND_ROBIN_PARTITION;
    case 'single-partition': return pb.MessageRoutingMode.MESSAGE_ROUTING_MODE_SINGLE_PARTITION;
    case 'custom-partition': return pb.MessageRoutingMode.MESSAGE_ROUTING_MODE_CUSTOM_PARTITION;
  }
}
