import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { ProducerSessionTask, producerSessionTaskFromPb, producerSessionTaskToPb } from './producer-session-task/producer-session-task';

export type ProducerSession = {
  type: 'producer-session',
  sessionId: string,
  tasks: ProducerSessionTask[]
};

export function producerSessionFromPb(v: pb.ProducerSession): ProducerSession {
  return {
    type: 'producer-session',
    sessionId: v.getSessionId(),
    tasks: v.getTasksList().map(producerSessionTaskFromPb)
  };
}

export function producerSessionToPb(v: ProducerSession): pb.ProducerSession {
  const producerSessionPb = new pb.ProducerSession();
  producerSessionPb.setSessionId(v.sessionId);
  producerSessionPb.setTasksList(v.tasks.map(producerSessionTaskToPb));

  return producerSessionPb;
}
