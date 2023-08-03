import React, {useEffect} from "react";
import s from "./Overview.module.css";
import useSWR, { useSWRConfig } from "swr";
import ConfigurationTable from "../../ui/ConfigurationTable/ConfigurationTable";
import * as Notifications from "../../app/contexts/Notifications";
import * as GrpcClient from "../../app/contexts/GrpcClient/GrpcClient";
import * as Either from "fp-ts/lib/Either";
import Input from "../../ui/ConfigurationTable/Input/Input";
import SelectInput, {
  ListItem,
} from "../../ui/ConfigurationTable/SelectInput/SelectInput";
import ListInput from "../../ui/ConfigurationTable/ListInput/ListInput";
import { swrKeys } from "../../swrKeys";
import { GetClustersRequest } from "../../../grpc-web/tools/teal/pulsar/ui/clusters/v1/clusters_pb";
import { Code } from "../../../grpc-web/google/rpc/code_pb";
import {
  GetTenantsRequest,
  TenantInfo,
  UpdateTenantRequest,
} from "../../../grpc-web/tools/teal/pulsar/ui/tenant/v1/tenant_pb";
import Markdown from "../../ui/Markdown/Markdown";
import {GetTenantMarkdownRequest} from "../../../grpc-web/tools/teal/pulsar/ui/markdown/v1/markdown_pb";

export type ConfigurationProps = {
  tenant: string;
};

const Configuration: React.FC<ConfigurationProps> = (props) => {
  const { clustersServiceClient, tenantServiceClient } = GrpcClient.useContext();
  const {markdownServiceClient} = GrpcClient.useContext();
  const [markdownData, setMarkdownData] = React.useState<string>('');
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    const fetchMarkdownData = async (cluster: string) => {
      const req = new GetTenantMarkdownRequest();
      req.setTenant(props.tenant);
      req.setClusterName(cluster);

      const res = await markdownServiceClient.getTenantMarkdown(req, null)
        .catch(err => notifyError(`Unable to get tenant markdown. ${err.getMessage()}`));

      if (res === undefined) {
        return "";
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get tenant markdown. ${res.getStatus()?.getMessage()}`);
        return "";
      }

      return res.getMarkdown();
    };

    fetchMarkdownData("All").then(markdown => {
      setMarkdownData(markdown.toString());
    });
  }, []);

  const onUpdateError = (err: string) =>
    notifyError(`Can't update tenant configuration. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.configuration._({
    tenant: props.tenant,
  });

  const { data: clusters, error: clustersError } = useSWR(
    swrKeys.pulsar.clusters._(),
    async () => {
      const res = await clustersServiceClient.getClusters(
        new GetClustersRequest(),
        null
      );

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(
          `Unable to get clusters list. ${res.getStatus()?.getMessage()}`
        );
        return [];
      }

      return res.getClustersList();
    }
  );

  if (clustersError) {
    notifyError(`Unable to get clusters list. ${clustersError}`);
  }

  const { data: tenantInfo, error: tenantInfoError } = useSWR(
    swrKey,
    async () => {
      const req = new GetTenantsRequest();
      req.setTenantsList([props.tenant]);

      const res = await tenantServiceClient.getTenants(req, null);
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get tenant. ${res.getStatus()?.getMessage()}`);
        return null;
      }

      return {
        allowedClusters: res.getTenantsMap().get(props.tenant)?.getAllowedClustersList() || [],
        adminRoles: res.getTenantsMap()?.get(props.tenant)?.getAdminRolesList() || [],
      };
    }
  );

  if (tenantInfoError) {
    notifyError(`Unable to get tenant admin roles. ${tenantInfoError}`);
  }

  const adminRolesInput = (
    <ListInput<string>
      value={
        tenantInfo?.adminRoles.sort((a, b) =>
          a.localeCompare(b, "en", { numeric: true })
        ) || []
      }
      getId={(v) => v}
      renderItem={(v) => (
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {v}
        </span>
      )}
      editor={{
        render: (v, onChange) => (
          <Input value={v} onChange={onChange} placeholder="Enter new role" />
        ),
        initialValue: "",
      }}
      onRemove={async (roleId) => {
        if (!tenantInfo) {
          return;
        }

        const req = new UpdateTenantRequest();
        req.setTenantName(props.tenant);
        const tenantInfoPb = new TenantInfo();
        tenantInfoPb.setAdminRolesList(
          tenantInfo.adminRoles.filter((r) => r !== roleId)
        );
        tenantInfoPb.setAllowedClustersList(tenantInfo.allowedClusters);
        req.setTenantInfo(tenantInfoPb);

        const res = await tenantServiceClient
          .updateTenant(req, null)
          .catch(onUpdateError);
        if (res === undefined || res.getStatus()?.getCode() !== Code.OK) {
          notifyError(`Unable to set role. ${res?.getStatus()?.getMessage()}`);
          return;
        }

        await mutate(swrKey);
      }}
      onAdd={async (v) => {
        if (!tenantInfo) {
          return;
        }

        const req = new UpdateTenantRequest();
        req.setTenantName(props.tenant);
        const tenantInfoPb = new TenantInfo();
        tenantInfoPb.setAdminRolesList([...tenantInfo.adminRoles, v]);
        tenantInfoPb.setAllowedClustersList(tenantInfo.allowedClusters);
        req.setTenantInfo(tenantInfoPb);

        const res = await tenantServiceClient
          .updateTenant(req, null)
          .catch(onUpdateError);
        if (res === undefined || res.getStatus()?.getCode() !== Code.OK) {
          notifyError(`Unable to add role. ${res?.getStatus()?.getMessage()}`);
          return;
        }

        await mutate(swrKey);
      }}
      validate={() => Either.right(undefined)}
    />
  );

  const clustersList = (clusters || [])
    .filter((c) => !tenantInfo?.allowedClusters?.some((ac) => ac === c))
    .map<ListItem<string>>((c) => ({ type: "item", value: c, title: c }));
  const hideAddButton = clustersList.length === 0;

  const allowedClustersInput = (
    <ListInput<string>
      value={
        tenantInfo?.allowedClusters.sort((a, b) =>
          a.localeCompare(b, "en", { numeric: true })
        ) || []
      }
      getId={(v) => v}
      renderItem={(v) => <div>{v}</div>}
      editor={
        hideAddButton
          ? undefined
          : {
            render: (v, onChange) => (
              <SelectInput<string>
                list={[{ type: "empty", title: "" }, ...clustersList]}
                value={v}
                onChange={(v) => onChange(v as string)}
                placeholder="Select cluster"
              />
            ),
            initialValue: "",
          }
      }
      onRemove={
        clustersList.length <= 1
          ? undefined
          : async (id) => {
            if (!tenantInfo) {
              return;
            }

            const req = new UpdateTenantRequest();
            req.setTenantName(props.tenant);
            const tenantInfoPb = new TenantInfo();
            tenantInfoPb.setAdminRolesList(tenantInfo.adminRoles);
            tenantInfoPb.setAllowedClustersList(
              tenantInfo.allowedClusters.filter((r) => r !== id)
            );
            req.setTenantInfo(tenantInfoPb);

            const res = await tenantServiceClient
              .updateTenant(req, null)
              .catch(onUpdateError);
            if (res === undefined || res.getStatus()?.getCode() !== Code.OK) {
              notifyError(
                `Unable to set allowed cluster. ${res
                  ?.getStatus()
                  ?.getMessage()}`
              );
              return;
            }

            await mutate(swrKey);
          }
      }
      onAdd={
        hideAddButton
          ? undefined
          : async (v) => {
            if (!tenantInfo) {
              return;
            }

            const req = new UpdateTenantRequest();
            req.setTenantName(props.tenant);
            const tenantInfoPb = new TenantInfo();
            tenantInfoPb.setAdminRolesList(tenantInfo.adminRoles);
            tenantInfoPb.setAllowedClustersList([
              ...tenantInfo.allowedClusters,
              v,
            ]);
            req.setTenantInfo(tenantInfoPb);

            const res = await tenantServiceClient
              .updateTenant(req, null)
              .catch(onUpdateError);
            if (res === undefined || res.getStatus()?.getCode() !== Code.OK) {
              notifyError(
                `Unable to add allowed cluster. ${res
                  ?.getStatus()
                  ?.getMessage()}`
              );
              return;
            }

            await mutate(swrKey);
          }
      }
      validate={(v) =>
        v.length > 0
          ? Either.right(undefined)
          : Either.left(new Error("Allowed clusters cannot be empty"))
      }
    />
  );

  return (
    <div className={s.Overview}>
      <div className={s.Section}>
        <ConfigurationTable
          fields={[
            {
              id: "allowedClusters",
              title: "Allowed clusters",
              description: (
                <span>List of clusters that this tenant is restricted on.</span>
              ),
              input: allowedClustersInput,
              isRequired: true,
            },
            {
              id: "adminRoles",
              title: "Admin roles",
              description: (
                <span>
                List of authenticated roles allowed to manage this tenant.
              </span>
              ),
              input: adminRolesInput,
            },
          ]}
        />
      </div>
      <div className={s.Section}>
        <div className={s.MarkdownTitle}>Markdown</div>
        <Markdown markdown={markdownData} />
      </div>
    </div>
  );
};

export default Configuration;
