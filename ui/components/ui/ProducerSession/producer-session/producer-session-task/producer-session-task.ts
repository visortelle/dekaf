import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { ProducerTask, producerTaskFromPb, producerTaskToPb } from '../../producer-task/producer-task';

export type ProducerSessionTask = {
  type: 'producer-session-task',
  task: { type: 'producer-task', task: ProducerTask }
};

export function producerSessionTaskFromPb(v: pb.ProducerSessionTask): ProducerSessionTask {
  let task: ProducerSessionTask['task'];

  switch (v.getTaskCase()) {
    case pb.ProducerSessionTask.TaskCase.TASK_PRODUCER:
      task = { type: 'producer-task', task: producerTaskFromPb(v.getTaskProducer()!) };
      break;
    default:
      throw new Error(`Unknown task case: ${v.getTaskCase()}`);
  }

  return {
    type: 'producer-session-task',
    task
  };
}

export function producerSessionTaskToPb(v: ProducerSessionTask): pb.ProducerSessionTask {
  const producerSessionTaskPb = new pb.ProducerSessionTask();

  switch (v.task.type) {
    case 'producer-task':
      producerSessionTaskPb.setTaskProducer(producerTaskToPb(v.task.task));
      break;
    default:
      throw new Error(`Unknown task type: ${v.task.type}`);
  }

  return producerSessionTaskPb;
}
