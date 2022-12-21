import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSWRConfig } from 'swr';

import { H1 } from '../../ui/H/H';
import { TenantIcon } from '../../ui/Icons/Icons';
import Button from '../../ui/Button/Button';
import Checkbox from '../../ui/Checkbox/Checkbox';
import * as Notifications from '../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { DeleteTenantRequest } from '../../../grpc-web/tools/teal/pulsar/ui/tenant/v1/tenant_pb';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import { swrKeys } from '../../swrKeys';

import s from './DeleteTenant.module.css'

export type DeleteTenantProps = {
  tenant: string
};

const DeleteTenant: React.FC<DeleteTenantProps> = (props) => {
  const navigate = useNavigate();
  const { mutate } = useSWRConfig()
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { tenantServiceClient } = PulsarGrpcClient.useContext();
  const [forceDelete, setForceDelete] = React.useState(false);

  const deleteTenant = async () => {
    try {
      const req = new DeleteTenantRequest();
      req.setTenantName(props.tenant);
      req.setForce(forceDelete);
      const res = await tenantServiceClient.deleteTenant(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to delete tenant: ${res.getStatus()?.getMessage()}`);
        return;
      }

      notifySuccess(`Tenant ${props.tenant} has been successfully deleted.`);
      navigate(`/`);

      await mutate(swrKeys.pulsar.tenants._());
      await mutate(swrKeys.pulsar.batch.getTreeNodesChildrenCount._());
    } catch (err) {
      notifyError(`Unable to delete tenant ${props.tenant}. ${err}`)
    }
  };

  return (
    <div className={s.View}>
      <div className={s.Header}><H1>Delete tenant</H1></div>
      <div
        className={s.Message}>
        The tenant&nbsp;
        <div className={s.SubjectName}>
          <div className={s.SubjectIcon}>
            <TenantIcon />
          </div>
          {props.tenant}
        </div>
        &nbsp;will be&nbsp;<strong style={{ color: 'var(--accent-color-red)' }}>permanently deleted!</strong>
      </div>
      <div className={s.Message}>Do you really want to proceed?</div>

      <div className={s.Actions}>
        <div className={s.ActionCheckbox}>
          <Checkbox isInline id="forceDelete" checked={forceDelete} onChange={() => setForceDelete(!forceDelete)} />
          &nbsp;
          <label htmlFor="forceDelete">Delete a tenant forcefully by deleting all namespaces under it.</label>
        </div>

        <div className={s.ActionButton}>
          <Button
            type="danger"
            text={`Yes. I know what I'm doing.`}
            onClick={() => deleteTenant()}
          />
        </div>
      </div>
    </div>
  );
}

export default DeleteTenant;
