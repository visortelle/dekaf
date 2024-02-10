import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';

export type RegularConsumptionMode = {
  type: 'regular-consumption-mode'
};

export function regularConsumptionModeFromPb(v: pb.ConsumerSessionTargetConsumptionMode.Regular): RegularConsumptionMode {
  return { type: 'regular-consumption-mode' };
}

export function regularConsumptionModeToPb(v: RegularConsumptionMode): pb.ConsumerSessionTargetConsumptionMode.Regular {
  return new pb.ConsumerSessionTargetConsumptionMode.Regular();
}

export type ReadCompactedConsumptionMode = {
  type: 'read-compacted-consumption-mode'
};

export function readCompactedConsumptionModeFromPb(v: pb.ConsumerSessionTargetConsumptionMode.ReadCompacted): ReadCompactedConsumptionMode {
  return { type: 'read-compacted-consumption-mode' };
}

export function readCompactedConsumptionModeToPb(v: ReadCompactedConsumptionMode): pb.ConsumerSessionTargetConsumptionMode.ReadCompacted {
  return new pb.ConsumerSessionTargetConsumptionMode.ReadCompacted();
}

export type ConsumerSessionTargetConsumptionMode = {
  type: 'consumer-session-target-consumption-mode',
  mode: RegularConsumptionMode | ReadCompactedConsumptionMode
}

export function consumerSessionTargetConsumptionModeFromPb(v: pb.ConsumerSessionTargetConsumptionMode): ConsumerSessionTargetConsumptionMode {
  let mode: ConsumerSessionTargetConsumptionMode['mode'];
  switch (v.getModeCase()) {
    case pb.ConsumerSessionTargetConsumptionMode.ModeCase.MODE_REGULAR: {
      mode = { type: 'regular-consumption-mode' };
      break;
    }
    case pb.ConsumerSessionTargetConsumptionMode.ModeCase.MODE_READ_COMPACTED: {
      mode = { type: 'read-compacted-consumption-mode' };
      break;
    }
    default: throw new Error(`Unknown ConsumerSessionTargetConsumptionMode`)
  }

  return { type: 'consumer-session-target-consumption-mode', mode }
}

export function consumerSessionTargetConsumptionModeToPb(v: ConsumerSessionTargetConsumptionMode): pb.ConsumerSessionTargetConsumptionMode {
  const resultPb = new pb.ConsumerSessionTargetConsumptionMode();

  switch (v.mode.type) {
    case "regular-consumption-mode": {
      resultPb.setModeRegular(new pb.ConsumerSessionTargetConsumptionMode.Regular());
      break;
    }
    case "read-compacted-consumption-mode": {
      resultPb.setModeReadCompacted(new pb.ConsumerSessionTargetConsumptionMode.ReadCompacted());
      break;
    }
  }

  return resultPb;
}
