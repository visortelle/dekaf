import React from 'react';
import s from './DeleteTenant.module.css'
import { H1 } from '../../ui/H/H';
import { TenantIcon } from '../../Icons/Icons';
import Button from '../../ui/Button/Button';
import * as Notifications from '../../contexts/Notifications';
import * as PulsarAdminClient from '../../contexts/PulsarAdminClient';
import { useNavigate } from 'react-router-dom';
import { useSWRConfig } from 'swr';

export type DeleteTenantProps = {
  tenant: string
};

const DeleteTenant: React.FC<DeleteTenantProps> = (props) => {
  const navigate = useNavigate();
  const { mutate } = useSWRConfig()
  const notification = Notifications.useContext();
  const adminClient = PulsarAdminClient.useContext();
  const [forceDelete, setForceDelete] = React.useState(false);

  const deleteTenant = async () => {
    try {
      await adminClient.client.tenants.deleteTenant(props.tenant, forceDelete);
      notification.notifySuccess(`Tenant ${props.tenant} has successfully been deleted.`);
      navigate(`/`);
      mutate(['pulsar', 'tenants']);
    } catch (err) {
      notification.notifyError(`Failed to delete tenant ${props.tenant}. ${err}`)
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
          <input type="checkbox" id="forceDelete" checked={forceDelete} onChange={() => setForceDelete(!forceDelete)} />
          &nbsp;
          <label htmlFor="forceDelete">Delete a tenant forcefully by deleting all namespaces under it.</label>
        </div>

        <div className={s.ActionButton}>
          <Button
            type="danger"
            title={`Yes. I know what I'm doing.`}
            onClick={() => deleteTenant()}
          />
        </div>
      </div>
    </div>
  );
}

export default DeleteTenant;
