import React, {useEffect} from "react";
import * as Notifications from "../../../../app/contexts/Notifications";
import * as GrpcClient from "../../../../app/contexts/GrpcClient/GrpcClient";
import useSWR from "swr";
import {swrKeys} from "../../../../swrKeys";
import * as namespacePb from "../../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb";
import {Code} from "../../../../../grpc-web/google/rpc/code_pb";
import Link from "../../../Link/Link";
import {routes} from "../../../../routes";
import s from "../NavigationTree.module.css";
import {nodesSwrConfiguration} from "../utils/nodes-utils";

export type PulsarTenantProps = {
  forceReloadKey: number;
  tenant: string;
  onNamespaces: (namespaces: string[]) => void;
  leftIndent: string;
  onDoubleClick: () => void;
  isActive: boolean;
  isFetchData: boolean;
  customRender?: (props: PulsarTenantProps) => React.ReactElement;
}

export const PulsarTenant: React.FC<PulsarTenantProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const { namespaceServiceClient } = GrpcClient.useContext();

  const { data: namespaces, error: namespacesError } = useSWR<string[]>(
    props.isFetchData ? swrKeys.pulsar.tenants.tenant.namespaces._({ tenant: props.tenant }) : null,
    async () => {
      const req = new namespacePb.ListNamespacesRequest();
      req.setTenant(props.tenant);

      const res = await namespaceServiceClient.listNamespaces(req, null);
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(res.getStatus()?.getMessage());
        return [];
      }

      return res.getNamespacesList().map(ns => ns.split('/')[1]);
    },
    nodesSwrConfiguration
  );

  useEffect(
    () => props.onNamespaces(namespaces ? namespaces.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) : []),
    [namespaces, props.forceReloadKey]
  );

  if (namespacesError) {
    notifyError(`Unable to fetch namespaces. ${namespacesError.toString()}`);
  }

  return props.customRender?.(props) || (
    <Link
      to={routes.tenants.tenant.namespaces._.get({ tenant: props.tenant })}
      className={`${s.NodeLink} ${props.isActive ? s.NodeLinkActive : ''}`}
      style={{ paddingLeft: props.leftIndent }}
      onDoubleClick={props.onDoubleClick}
    >
      <span className={s.NodeLinkText}>{props.tenant}</span>
    </Link>
  );
}
