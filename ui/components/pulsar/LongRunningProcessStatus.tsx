import * as pb from '../../grpc-web/tools/teal/pulsar/ui/api/v1/long_running_process_status_pb';

type LongRunningProcessStatus = {
  status: 'error' | 'not running' | 'running' | 'success' | 'unspecified',
  lastError: string | undefined
}

export function longRunningProcessStatusFromPb(v: pb.LongRunningProcessStatus): LongRunningProcessStatus {
  let status: LongRunningProcessStatus['status'] = 'unspecified';

  switch (v.getStatus()) {
    case pb.Status.STATUS_ERROR: status = 'error'; break;
    case pb.Status.STATUS_NOT_RUN: status = 'not running'; break;
    case pb.Status.STATUS_RUNNING: status = 'running'; break;
    case pb.Status.STATUS_SUCCESS: status = 'success'; break;
  }

  return {
    status,
    lastError: v.getLastError()?.getValue()
  }
}
