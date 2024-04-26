import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { ProducerSessionTask, producerSessionTaskFromPb, producerSessionTaskToPb } from './producer-session-task/producer-session-task';

export type ProducerSessionConfig = {
  type: 'producer-session-config',
  tasks: ProducerSessionTask[]
};

export function producerSessionConfigFromPb(v: pb.ProducerSessionConfig): ProducerSessionConfig {
  return {
    type: 'producer-session-config',
    tasks: v.getTasksList().map(producerSessionTaskFromPb)
  };
}

export function producerSessionConfigToPb(v: ProducerSessionConfig): pb.ProducerSessionConfig {
  const configPb = new pb.ProducerSessionConfig();
  configPb.setTasksList(v.tasks.map(producerSessionTaskToPb));

  return configPb;
}
