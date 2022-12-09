import React from 'react';
import s from './DeleteNamespace.module.css'
import { H1 } from '../../ui/H/H';
import { NamespaceIcon, TenantIcon } from '../../ui/Icons/Icons';
import Button from '../../ui/Button/Button';
import * as Notifications from '../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { useNavigate } from 'react-router-dom';
import { useSWRConfig } from 'swr';
import { swrKeys } from '../../swrKeys';
import { routes } from '../../routes';
import { DeleteNamespaceRequest } from '../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { Code } from '../../../grpc-web/google/rpc/code_pb';

export type DeleteTopicProps = {
  tenant: string,
  namespace: string,
};

const DeleteNamespace: React.FC<DeleteTopicProps> = (props) => {
  const navigate = useNavigate();
  const { mutate } = useSWRConfig()
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { namespaceServiceClient } = PulsarGrpcClient.useContext();
  const [forceDelete, setForceDelete] = React.useState(false);

  const deleteNamespace = async () => {
    try {
      const req = new DeleteNamespaceRequest();
      req.setNamespaceName(`${props.tenant}/${props.namespace}`);
      req.setForce(forceDelete);
      const res = await namespaceServiceClient.deleteNamespace(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to delete namespace: ${res.getStatus()?.getMessage()}`);
        return;
      }

      notifySuccess(`Namespace ${props.tenant}/${props.namespace} has been successfully deleted.`);
      navigate(routes.tenants.tenant.namespaces._.get({ tenant: props.tenant }));

      await mutate(swrKeys.pulsar.tenants.tenant.namespaces._({ tenant: props.tenant }));
      await mutate(swrKeys.pulsar.batch.getTreeNodesChildrenCount._());
    } catch (err) {
      notifyError(`Unable to delete namespace ${props.tenant}/${props.namespace}. ${err}`)
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
            text={`Yes. I know what I'm doing.`}
            onClick={() => deleteNamespace()}
          />
        </div>
      </div>
    </div>
  );
}

export default DeleteNamespace;
