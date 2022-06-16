import React from 'react';
import s from './DeleteTopic.module.css'
import { H1 } from '../../ui/H/H';
import { NamespaceIcon, TenantIcon, TopicIcon } from '../../ui/Icons/Icons';
import Button from '../../ui/Button/Button';
import * as Notifications from '../../app/contexts/Notifications';
import * as PulsarAdminClient from '../../app/contexts/PulsarAdminClient';
import { useNavigate } from 'react-router-dom';
import { useSWRConfig } from 'swr';
import { swrKeys } from '../../swrKeys';
import { routes } from '../../routes';

export type DeleteTenantProps = {
  tenant: string,
  namespace: string,
  topic: string,
  topicType: 'persistent' | 'non-persistent'
};

const DeleteTenant: React.FC<DeleteTenantProps> = (props) => {
  const navigate = useNavigate();
  const { mutate } = useSWRConfig()
  const notification = Notifications.useContext();
  const adminClient = PulsarAdminClient.useContext();
  const [forceDelete, setForceDelete] = React.useState(false);

  const deleteTopic = async () => {
    try {
      if (props.topicType === 'persistent') {
        await adminClient.client.persistentTopic.deleteTopic(props.tenant, props.namespace, props.topic, forceDelete);
      } else {
        await adminClient.client.nonPersistentTopic.deleteTopic(props.tenant, props.namespace, props.topic, forceDelete);
      }

      notification.notifySuccess(`${props.topicType === 'persistent' ? 'Persistent' : 'Non-persistent'} topic ${props.tenant}/${props.namespace}/${props.topic} has been successfully deleted.`);
      navigate(routes.tenants.tenant.namespaces.namespace._.get({ tenant: props.tenant, namespace: props.namespace }));

      await mutate(swrKeys.pulsar.tenants.tenant.namespaces.namespace.topics._({ tenant: props.tenant, namespace: props.namespace }));
    } catch (err) {
      notification.notifyError(`Failed to delete ${props.topicType === 'persistent' ? 'persistent' : 'non-persistent'} topic ${props.tenant}/${props.namespace}/${props.topic}. ${err}`)
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
            title={`Yes. I know what I'm doing.`}
            onClick={() => deleteTopic()}
          />
        </div>
      </div>
    </div>
  );
}

export default DeleteTenant;
