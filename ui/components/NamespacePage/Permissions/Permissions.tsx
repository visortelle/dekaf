import React from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR, { useSWRConfig } from "swr";

import * as pb from '../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import { swrKeys } from '../../swrKeys';
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Notifications from '../../app/contexts/Notifications';

// interface Permissions {
//   [role: string]: string
//   // ['produce', 'consume', 'functions', 'sources', 'sinks', 'packages']
// }

type PolicyValue = pb.PermissionsSpecified

interface PermissionsProps {
  tenant: string;
  namespace: string;
}

const Permissions = (props: PermissionsProps) => {

  interface Example {
    [key: string]: string[]
  }

  const example: Example = {
    "role_name": ['produce', 'consume'],
    "other_role": ['produce', 'consume', 'functions', 'sources', 'sinks', 'packages'],
    "one_more_role": ['consume', 'sinks'],
    "last_role": []
  }

  const { notifyError } = Notifications.useContext();
  const { namespaceServiceClient } = PulsarGrpcClient.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.permissions._({ tenant: props.tenant, namespace: props.namespace });

  const { data: permissions, error: permissionsError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetPermissionsRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);
      const res = await namespaceServiceClient.getPermissions(req, {});
      if (res === undefined) {
        return;
      }

      console.log(`asd: ${res}`);

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(res.getStatus()?.getMessage());
        return;
      }

      let permissions = res.getSpecified();
      // setResourceGroupsList(res.getResourceGroupsList())

      // switch (res.getResourceGroupCase()) {
      //   case pb.GetResourceGroupResponse.ResourceGroupCase.UNSPECIFIED: {
      //     value = { type: 'undefined' };
      //     break;
      //   }
      //   case pb.GetResourceGroupResponse.ResourceGroupCase.SPECIFIED: {
      //     const resourceGroup = res.getSpecified()?.getResourceGroup() || '';
      //     value = { type: 'specified-for-this-topic', resourceGroup: resourceGroup };
      //     break;
      //   }
      // }

      return permissions;
    }
  );

  if (permissionsError) {
    notifyError(`Unable to get permissions. ${permissionsError}`);
  };

  return (
    <div>
      {Object.keys(example).map(role => (
        <div>
          {role}
          {example[role].map(pynkt => (
            <div>
              {pynkt}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default Permissions;