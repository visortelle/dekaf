import React from 'react';
import s from './DeleteTopic.module.css'
import { H1 } from '../../ui/H/H';
import { NamespaceIcon, TenantIcon, TopicIcon } from '../../ui/Icons/Icons';
import Button from '../../ui/Button/Button';
import * as Notifications from '../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { useNavigate } from 'react-router-dom';
import { useSWRConfig } from 'swr';
import { swrKeys } from '../../swrKeys';
import { routes } from '../../routes';
import { DeleteTopicRequest } from '../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import { Code } from '../../../grpc-web/google/rpc/code_pb';

export type DeleteTopicProps = {
  tenant: string,
  namespace: string,
  topic: string,
  topicType: 'persistent' | 'non-persistent'
};

const DeleteTopic: React.FC<DeleteTopicProps> = (props) => {
  const navigate = useNavigate();
  const { mutate } = useSWRConfig()
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { topicServiceClient } = PulsarGrpcClient.useContext();
  const [forceDelete, setForceDelete] = React.useState(false);

  const deleteTopic = async () => {
    try {
      const req = new DeleteTopicRequest();
      req.setTopicName(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setForce(forceDelete);

      const res = await topicServiceClient.deleteTopic(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to delete topic: ${res.getStatus()?.getMessage()}`);
        return;
      }

      notifySuccess(`${props.topicType === 'persistent' ? 'Persistent' : 'Non-persistent'} topic ${props.tenant}/${props.namespace}/${props.topic} has been successfully deleted.`);
      navigate(routes.tenants.tenant.namespaces.namespace.topics._.get({ tenant: props.tenant, namespace: props.namespace }));

      await mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics._({ tenant: props.tenant, namespace: props.namespace }));
      await mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics._({ tenant: props.tenant, namespace: props.namespace }));
      await mutate(swrKeys.pulsar.batch.getTreeNodesChildrenCount._());
    } catch (err) {
      notifyError(`Unable to delete topic: ${props.topicType === 'persistent' ? 'persistent' : 'non-persistent'}://${props.tenant}/${props.namespace}/${props.topic}. ${err}`)
    }
  };

  return (
    <div className={s.View}>
      <div className={s.Header}><H1>Delete topic</H1></div>
      <div
        className={s.Message}>
        The&nbsp;<strong>{props.topicType === 'persistent' ? 'persistent' : 'non-persistent'}</strong>&nbsp;topic&nbsp;
        <div>
          <div className={s.SubjectName}>
            <div className={s.SubjectIcon}>
              <TenantIcon />
            </div>
            {props.tenant}
          </div>
          <div className={s.SubjectName}>
            <div className={s.SubjectIcon}>
              <NamespaceIcon />
            </div>
            {props.namespace}
          </div>
          <div className={s.SubjectName}>
            <div className={s.SubjectIcon}>
              <TopicIcon topicType={props.topicType} />
            </div>
            {props.topic}
          </div>
        </div>
        &nbsp;will be&nbsp;<strong style={{ color: 'var(--accent-color-red)' }}>permanently deleted!</strong>
      </div>
      <div className={s.Message}>Do you really want to proceed?</div>

      <div className={s.Actions}>
        <div className={s.ActionCheckbox}>
          <input type="checkbox" id="forceDelete" checked={forceDelete} onChange={() => setForceDelete(!forceDelete)} />
          &nbsp;
          <label htmlFor="forceDelete">Close all producers, consumers, replicators, and delete topic forcefully.</label>
        </div>

        <div className={s.ActionButton}>
          <Button
            type="danger"
            text={`Yes. I know what I'm doing.`}
            onClick={deleteTopic}
          />
        </div>
      </div>
    </div>
  );
}

export default DeleteTopic;
