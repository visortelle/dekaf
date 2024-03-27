import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';

export type AccessMode = 'shared' | 'exclusive' | 'wait-for-exclusive' | 'exclusive-with-fencing';

export function accessModeFromPb(accessMode: pb.AccessMode): AccessMode {
  switch (accessMode) {
    case pb.AccessMode.ACCESS_MODE_SHARED: return 'shared';
    case pb.AccessMode.ACCESS_MODE_EXCLUSIVE: return 'exclusive';
    case pb.AccessMode.ACCESS_MODE_WAIT_FOR_EXCLUSIVE: return 'wait-for-exclusive';
    case pb.AccessMode.ACCESS_MODE_EXCLUSIVE_WITH_FENCING: return 'exclusive-with-fencing';
    default: throw new Error(`Unknown access mode: ${accessMode}`);
  }
}

export function accessModeToPb(accessMode: AccessMode): pb.AccessMode {
  switch (accessMode) {
    case 'shared': return pb.AccessMode.ACCESS_MODE_SHARED;
    case 'exclusive': return pb.AccessMode.ACCESS_MODE_EXCLUSIVE;
    case 'wait-for-exclusive': return pb.AccessMode.ACCESS_MODE_WAIT_FOR_EXCLUSIVE;
    case 'exclusive-with-fencing': return pb.AccessMode.ACCESS_MODE_EXCLUSIVE_WITH_FENCING;
  }
}
