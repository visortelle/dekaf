import stringify from "safe-stable-stringify";
import * as brokerMetrics from "tealtools-pulsar-ui-api/broker-metrics/broker-metrics";
import * as metrics from "tealtools-pulsar-ui-api/metrics/types";

export type ClientConfig = {
  apiUrl: string;
  notifyError: (message: string) => void;
};

export type Client = {
  getTenantMetrics: (tenant: string) => Promise<metrics.TenantMetrics>;
  getAllTenantsMetrics: () => Promise<Record<string, metrics.TenantMetrics>>;
  getAllTenantNamespacesMetrics: (
    tenant: string
  ) => Promise<Record<string, metrics.NamespaceMetrics>>;
  getAllTopicsMetrics: (
    tenant: string,
    namespace: string
  ) => Promise<{
    persistent: Record<string, metrics.TopicMetrics>;
    nonPersistent: Record<string, metrics.TopicMetrics>;
  }>;
  getMetrics: (
    filters: brokerMetrics.Filter
  ) => Promise<brokerMetrics.MetricsMap<any>>;
};

export const dummyClient: Client = {
  getAllTenantsMetrics: async () => ({}),
  getMetrics: async () => ({}),
  getTenantMetrics: async () => ({}),
  getAllTopicsMetrics: async () => ({ persistent: {}, nonPersistent: {} }),
  getAllTenantNamespacesMetrics: async () => ({}),
};

export function createClient(config: ClientConfig): Client {
  return {
    getTenantMetrics: (tenant) => getTenantMetrics(config, tenant),
    getAllTenantsMetrics: () => getAllTenantsMetrics(config),
    getAllTenantNamespacesMetrics: (tenant) =>
      getAllTenantNamespacesMetrics(config, tenant),
    getAllTopicsMetrics: (tenant, namespace) =>
      getAllTopicsMetrics(config, tenant, namespace),
    getMetrics: (filter) => getMetrics(config, filter),
  };
}

async function getTenantMetrics(
  config: ClientConfig,
  tenant: string
): Promise<metrics.TenantMetrics> {
  const res = await fetch(`${config.apiUrl}/metrics/tenants/${tenant}`);
  return res.json();
}

async function getAllTenantsMetrics(
  config: ClientConfig
): Promise<Record<string, metrics.TenantMetrics>> {
  const res = await fetch(`${config.apiUrl}/metrics/allTenants`);
  return res.json();
}

async function getAllTenantNamespacesMetrics(
  config: ClientConfig,
  tenant: string
): Promise<Record<string, metrics.NamespaceMetrics>> {
  const res = await fetch(
    `${config.apiUrl}/metrics/tenants/${tenant}/allNamespaces`
  );
  return res.json();
}

async function getAllTopicsMetrics(
  config: ClientConfig,
  tenant: string,
  namespace: string
): Promise<{
  persistent: Record<string, metrics.TopicMetrics>;
  nonPersistent: Record<string, metrics.TopicMetrics>;
}> {
  const res = await fetch(
    `${config.apiUrl}/metrics/tenants/${tenant}/namespaces/${namespace}/allTopics`
  );
  return res.json();
}

async function getMetrics(
  config: ClientConfig,
  filter: brokerMetrics.Filter
): Promise<brokerMetrics.MetricsMap<any>> {
  const response = await fetch(
    `${config.apiUrl}/broker-metrics/metrics?filter=${stringify(filter)}`,
    {}
  ).catch((error) => console.error(error));
  if (response === undefined) {
    config.notifyError(`Unable to get metrics.`);
    return {};
  }

  const json = await response.json();
  if (response.status >= 300) {
    config.notifyError(`Unable to get metrics: ${json.error!}`);
    return {};
  }

  return json as brokerMetrics.MetricsMap<any>;
}
