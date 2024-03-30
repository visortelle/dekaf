import React from 'react';
import Button from '../../../../Button/Button';
import * as GrpcClient from '../../../../../app/contexts/GrpcClient/GrpcClient';
import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { Code } from '../../../../../../grpc-web/google/rpc/code_pb';

export type TestButtonProps = {};

const TestButton: React.FC<TestButtonProps> = (props) => {
  const { producerServiceClient } = GrpcClient.useContext();

  const run = async () => {
    const req = new pb.CreateProducerSessionRequest();
    req.setSessionId('test-session-id');

    const conf = new pb.ProducerSessionConfig();

    const task = new pb.ProducerSessionTask();

    const producerTask = new pb.ProducerTask();
    producerTask.setTargetTopicFqn('persistent://public/default/abc');

    const messageGenerator = new pb.MessageGenerator();

    const valueGenerator = new pb.ValueGenerator();

    const jsonGenerator = new pb.JsonGenerator();
    const fixedJsonGenerator = new pb.FixedJsonGenerator();
    jsonGenerator.setGeneratorFixed(fixedJsonGenerator);

    valueGenerator.setGeneratorFromJson(jsonGenerator);

    messageGenerator.setValueGenerator(valueGenerator);

    producerTask.setMessageGenerator(messageGenerator);

    const producerConf = new pb.PulsarProducerConfig();
    producerConf.setAccessMode(pb.AccessMode.ACCESS_MODE_SHARED);

    producerTask.setProducerConfig(producerConf);

    task.setTaskProducer(producerTask);

    conf.setTasksList([task]);

    req.setSessionConfig(conf);

    const res = await producerServiceClient.createProducerSession(req, null).catch((err) => {
      console.error('Failed to create producer session', err);
    });

    if (res === undefined) {
      return;
    }

    if (res.getStatus()?.getCode() !== Code.OK) {
      console.error('Failed to create producer session', res);
      return;
    }

    const resumeReq = new pb.ResumeProducerSessionRequest();
    resumeReq.setSessionId('test-session-id');

    const resumeRes = await producerServiceClient.resumeProducerSession(resumeReq, null).catch((err) => {
      console.error('Failed to resume producer session', err);
    });

    if (resumeRes === undefined) {
      return;
    }

    if (resumeRes.getStatus()?.getCode() !== Code.OK) {
      console.error('Failed to resume producer session', resumeRes);
      return;
    }
  };

  return (
    <div>
      <Button
        type='primary'
        text='Test'
        onClick={() => {
          run();
        }}
      />
    </div>
  );
}

export default TestButton;
