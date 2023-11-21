import React from 'react';
import s from './Button.module.css'
import SmallButton from '../../../ui/SmallButton/SmallButton';
import * as Modals from '../../contexts/Modals/Modals';
import Editor from '../Editor/Editor';
import { swrKeys } from '../../../swrKeys';
import { GetCurrentCredentialsRequest } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/pulsar_auth_pb';
import * as GrpcClient from '../../contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../app/contexts/Notifications';
import useSWR, { mutate } from "swr";
import icon from './icon.svg';

export type ButtonProps = {};

const Button: React.FC<ButtonProps> = (props) => {
  const modals = Modals.useContext();
  const { notifyError } = Notifications.useContext();
  const { pulsarAuthServiceClient } = GrpcClient.useContext();

  const { data: currentCredentials, error: currentCredentialsError } = useSWR(
    swrKeys.pulsar.auth.credentials.current._(),
    async () => {
      const req = new GetCurrentCredentialsRequest();
      const res = await pulsarAuthServiceClient.getCurrentCredentials(req, {})
        .catch((err) => notifyError(`Unable to get the current credentials name. ${err.message}`));

      if (res === undefined) {
        return undefined;
      }

      return res.getName()?.getValue();
    }
  );

  if (currentCredentialsError) {
    notifyError(`Unable to get the current credentials name. ${currentCredentialsError}`);
  }
  return (
    <div className={s.Button}>
      <SmallButton
        title='Edit Pulsar Credentials'
        type='primary'
        svgIcon={icon}
        onClick={() => modals.push({
          id: 'auth-modal',
          title: `Pulsar Credentials`,
          content: <Editor onDone={
            async () => {
              modals.pop();
              await mutate(swrKeys.pulsar.tenants.listTenants._())
            }
          } />,
        })}
        text={currentCredentials || '-'}
      />
    </div>
  );
}

export default Button;
