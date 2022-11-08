import _ from "lodash";
import stringify from "safe-stable-stringify";
import { TreePath, treePath } from "../../../NavigationTree/TreeView";
import { BatchRequest, TreePathStr } from "./types";
import { hideShowProgressIndicatorHeader } from "../../../../pages/_app";

const getTenantNamespaces = (
  path: TreePath,
  brokerWebApiUrl: string
): BatchRequest => {
  const tenant = treePath.getTenant(path)?.name;
  return {
    name: pathToRequestName(path),
    url: `${brokerWebApiUrl}/admin/v2/namespaces/${tenant}`,
    method: "GET",
    headers: { "Content-Type": "application/json" },
  };
};

const getNamespacePersistentTopics = (
  path: TreePath,
  brokerWebApiUrl: string
): BatchRequest => {
  const tenant = treePath.getTenant(path)?.name;
  const namespace = treePath.getNamespace(path)?.name;
  return {
    name: "persistent-" + pathToRequestName(path),
    url: `${brokerWebApiUrl}/admin/v2/persistent/${tenant}/${namespace}`,
    method: "GET",
    headers: { "Content-Type": "application/json" },
  };
};

const getNamespaceNonPersistentTopics = (
  path: TreePath,
  brokerWebApiUrl: string
): BatchRequest => {
  const tenant = treePath.getTenant(path)?.name;
  const namespace = treePath.getNamespace(path)?.name;
  return {
    name: "non-persistent-" + pathToRequestName(path),
    url: `${brokerWebApiUrl}/admin/v2/non-persistent/${tenant}/${namespace}`,
    method: "GET",
    headers: { "Content-Type": "application/json" },
  };
};

const pathToRequestName = (path: TreePath): string => {
  return stringify(path);
};

const requestNameToPath = (requestName: string): TreePath => {
  if (requestName.startsWith("persistent-")) {
    const pathStr = requestName.replace(/^persistent-/, "");
    return JSON.parse(pathStr);
  }

  if (requestName.startsWith("non-persistent-")) {
    const pathStr = requestName.replace(/^non-persistent-/, "");
    return JSON.parse(pathStr);
  }

  return JSON.parse(requestName);
};

type GetTreeNodesChildrenCount = (
  paths: TreePath[],
  batchApiUrl: string,
  brokerWebApiUrl: string
) => Promise<Record<TreePathStr, number>>;
export const getTreeNodesChildrenCount: GetTreeNodesChildrenCount = async (
  paths,
  batchApiUrl,
  brokerWebApiUrl
) => {
  const requests: BatchRequest[] = paths
    .map((path) => {
      switch (treePath.getType(path)) {
        case "tenant": {
          const tenant = treePath.getTenant(path);
          if (tenant === undefined) {
            return [];
          }
          return getTenantNamespaces(path, brokerWebApiUrl);
        }
        case "namespace": {
          const tenant = treePath.getTenant(path);
          const namespace = treePath.getNamespace(path);
          if (tenant === undefined || namespace === undefined) {
            return [];
          }
          const persistentTopics = getNamespacePersistentTopics(
            path,
            brokerWebApiUrl
          );
          const nonPersistentTopics = getNamespaceNonPersistentTopics(
            path,
            brokerWebApiUrl
          );
          return [persistentTopics, nonPersistentTopics];
        }
        default:
          return [];
      }
    })
    .flat();

  const res = await fetch(batchApiUrl, {
    method: "POST",
    body: JSON.stringify(requests),
    headers: {
      [hideShowProgressIndicatorHeader]: "",
      "Content-Type": "application/json",
    },
  }).catch(() => undefined);
  if (res === undefined) {
    return {};
  }
  const json = await res.json();
  const result = _(json)
    .toPairs()
    .reduce<Record<string, number>>((result, [requestName, data]) => {
      const path = requestNameToPath(requestName);
      if (!Array.isArray(data.body)) {
        return result;
      }

      if (treePath.isNamespace(path)) {
        data.body = squashPartitionedTopics(data.body);
      }

      const key = stringify(path);
      return {
        ...result,
        [key]:
          result[key] === undefined
            ? data.body.length
            : result[key] + data.body.length,
      };
    }, {});

  return result;
};

type GetTenantsNamespacesCount = (
  tenants: string[],
  batchApiUrl: string,
  brokerWebApiUrl: string
) => Promise<Record<TreePathStr, number>>;
export const getTenantsNamespacesCount: GetTenantsNamespacesCount = async (
  tenants,
  batchApiUrl,
  brokerWebApiUrl
) => {
  const requests: BatchRequest[] = tenants.map((tenant) =>
    getTenantNamespaces([{ type: "tenant", name: tenant }], brokerWebApiUrl)
  );

  const res = await fetch(batchApiUrl, {
    method: "POST",
    body: JSON.stringify(requests),
    headers: {
      [hideShowProgressIndicatorHeader]: "",
      "Content-Type": "application/json",
    },
  }).catch(() => undefined);
  if (res === undefined) {
    return {};
  }
  const json = await res.json();
  const result = _(json)
    .toPairs()
    .reduce<Record<string, number>>((result, [requestName, data]) => {
      const path = requestNameToPath(requestName);
      if (!Array.isArray(data.body)) {
        return result;
      }
      const key = path[0]?.name;
      return {
        ...result,
        [key]:
          result[key] === undefined
            ? data.body.length
            : result[key] + data.body.length,
      };
    }, {});

  return result;
};

type GetTenantNamespacesTopicsCount = (
  tenant: string,
  namespaces: string[],
  batchApiUrl: string,
  brokerWebApiUrl: string
) => Promise<Record<string, { persistent: number; nonPersistent: number }>>;
export const getTenantNamespacesTopicsCount: GetTenantNamespacesTopicsCount =
  async (tenant, namespaces, batchApiUrl, brokerWebApiUrl) => {
    const requests: BatchRequest[] = namespaces
      .map((namespace) => {
        return [
          getNamespacePersistentTopics(
            [
              { type: "tenant", name: tenant },
              { type: "namespace", name: namespace },
            ],
            brokerWebApiUrl
          ),
          getNamespaceNonPersistentTopics(
            [
              { type: "tenant", name: tenant },
              { type: "namespace", name: namespace },
            ],
            brokerWebApiUrl
          ),
        ];
      })
      .flat();

    const res = await fetch(batchApiUrl, {
      method: "POST",
      body: JSON.stringify(requests),
      headers: {
        [hideShowProgressIndicatorHeader]: "",
        "Content-Type": "application/json",
      },
    }).catch(() => undefined);
    if (res === undefined) {
      return {};
    }
    const json = await res.json();
    const result = _(json)
      .toPairs()
      .reduce<Record<string, { persistent: number; nonPersistent: number }>>(
        (result, [requestName, data]) => {
          if (!Array.isArray(data.body)) {
            return result;
          }

          const topicType: "persistent" | "non-persistent" =
            requestName.startsWith("persistent-")
              ? "persistent"
              : "non-persistent";

          const namespace =
            treePath.getNamespace(requestNameToPath(requestName))?.name || "";
          const withSquashedPartitionedTopics = squashPartitionedTopics(
            data.body
          );
          const count = withSquashedPartitionedTopics.length;

          return {
            ...result,
            [namespace]: {
              persistent:
                topicType === "persistent"
                  ? count
                  : result[namespace] === undefined
                  ? 0
                  : result[namespace].persistent,
              nonPersistent:
                topicType === "non-persistent"
                  ? count
                  : result[namespace] === undefined
                  ? 0
                  : result[namespace].nonPersistent,
            },
          };
        },
        {}
      );

    return result;
  };

function squashPartitionedTopics(topics: string[]): string[] {
  return Array.from(
    new Set(topics.map((topic: string) => topic.replace(/-partition-\d+$/, "")))
  );
}
