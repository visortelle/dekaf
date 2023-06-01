import React from 'react';
import s from './Button.module.css'
import SmallButton from '../../../ui/SmallButton/SmallButton';
import * as Modals from '../../contexts/Modals/Modals';
import Editor from '../Editor/Editor';
import { swrKeys } from '../../../swrKeys';
import { GetCurrentCredentialsRequest } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/pulsar_auth_pb';
import * as GrpcClient from '../../contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../app/contexts/Notifications';
import useSWR from "swr";

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
    <div className={s.AuthButton}>
      <SmallButton
        type='regular'
        onClick={() => modals.push({
          id: 'auth-modal',
          title: `Pulsar credentials`,
          content: <Editor onDone={modals.pop} />,
        })}
        text={`Pulsar credentials ${currentCredentials}`}
      />
    </div>
  );
}

export default Button;
