import React from 'react';
import s from './DeleteNamespace.module.css'
import { H1 } from '../../ui/H/H';
import { NamespaceIcon, TenantIcon } from '../../ui/Icons/Icons';
import Button from '../../ui/Button/Button';
import * as Notifications from '../../app/contexts/Notifications';
import * as PulsarAdminClient from '../../app/contexts/PulsarAdminClient';
import { useNavigate } from 'react-router-dom';
import { useSWRConfig } from 'swr';
import { swrKeys } from '../../swrKeys';
import { routes } from '../../routes';

export type DeleteTopicProps = {
  tenant: string,
  namespace: string,
};

const DeleteTopic: React.FC<DeleteTopicProps> = (props) => {
  const navigate = useNavigate();
  const { mutate } = useSWRConfig()
  const notification = Notifications.useContext();
  const adminClient = PulsarAdminClient.useContext();
  const [forceDelete, setForceDelete] = React.useState(false);

  const deleteNamespace = async () => {
    try {
      await adminClient.client.namespaces.deleteNamespace(props.tenant, props.namespace, forceDelete);

      notification.notifySuccess(`Namespace ${props.tenant}/${props.namespace} has been successfully deleted.`);
      navigate(routes.tenants.tenant._.get({ tenant: props.tenant }));

      await mutate(swrKeys.pulsar.tenants.tenant.namespaces._({ tenant: props.tenant }));
    } catch (err) {
      notification.notifyError(`Failed to delete namespace ${props.tenant}/${props.namespace}. ${err}`)
    }
  };

  return (
    <div className={s.View}>
      <div className={s.Header}><H1>Delete namespace</H1></div>
      <div
        className={s.Message}>
        The namespace&nbsp;
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
        </div>
        &nbsp;will be&nbsp;<strong style={{ color: 'var(--accent-color-red)' }}>permanently deleted!</strong>
      </div>
      <div className={s.Message}>Do you really want to proceed?</div>

      <div className={s.Actions}>
        <div className={s.ActionCheckbox}>
          <input type="checkbox" id="forceDelete" checked={forceDelete} onChange={() => setForceDelete(!forceDelete)} />
          &nbsp;
          <label htmlFor="forceDelete">Delete namespace forcefully by force deleting all topics under it.</label>
        </div>

        <div className={s.ActionButton}>
          <Button
            type="danger"
            title={`Yes. I know what I'm doing.`}
            onClick={() => deleteNamespace()}
          />
        </div>
      </div>
    </div>
  );
}

export default DeleteTopic;
