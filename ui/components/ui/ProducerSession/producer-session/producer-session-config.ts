import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { ProducerSessionTask, producerSessionTaskFromPb, producerSessionTaskToPb } from './producer-session-task/producer-session-task';

export type ProducerSessionConfig = {
  type: 'producer-session-config',
  sessionId: string,
  tasks: ProducerSessionTask[]
};

export function producerSessionConfigFromPb(v: pb.ProducerSessionConfig): ProducerSessionConfig {
  return {
    type: 'producer-session-config',
    sessionId: v.getSessionId(),
    tasks: v.getTasksList().map(producerSessionTaskFromPb)
  };
}

export function producerSessionConfigToPb(v: ProducerSessionConfig): pb.ProducerSessionConfig {
  const configPb = new pb.ProducerSessionConfig();
  configPb.setSessionId(v.sessionId);
  configPb.setTasksList(v.tasks.map(producerSessionTaskToPb));

  return configPb;
}
