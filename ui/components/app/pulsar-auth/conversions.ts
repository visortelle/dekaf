import * as pb from '../../../grpc-web/tools/teal/pulsar/ui/api/v1/pulsar_auth_pb';
import { MaskedCredentials, CredentialsType } from './domain';

export function maskedCredentialsFromPb(credentialsPb: pb.MaskedCredentials): MaskedCredentials {
  let type: CredentialsType;
  switch (credentialsPb.getType()) {
    case pb.CredentialsType.CREDENTIALS_TYPE_EMPTY:
      type = 'empty';
      break;
    case pb.CredentialsType.CREDENTIALS_TYPE_OAUTH2:
      type = 'oauth2';
      break;
    case pb.CredentialsType.CREDENTIALS_TYPE_JWT:
      type = 'jwt';
      break;
    default:
      throw new Error(`Unknown credentials type: ${credentialsPb.getType()}`);
  }

  return {
    name: credentialsPb.getName(),
    type,
  };
}
