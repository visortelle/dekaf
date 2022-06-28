import { Request, Response, Router } from "express";
import { TenantMetrics, NamespaceMetrics, TopicsMetrics } from "./types";
import { getNamespacesMetrics, getTenantMetrics, getNamespaceTopicsMetrics } from "./calculations";
import * as pulsarAdmin from "pulsar-admin-client-fetch";
import { fromPairs } from "lodash";

type State = {
  metrics: TopicsMetrics;
  metricsUpdateTimeout: NodeJS.Timeout | undefined;
  tenants: string[];
};

const state: State = {
  metrics: {},
  metricsUpdateTimeout: undefined,
  tenants: [],
};

const pulsarAdminClient = new pulsarAdmin.Client({
  BASE: "http://localhost:3001/pulsar-broker-web/admin/v2",
  HEADERS: { "Content-Type": "application/json" },
});

async function refreshState() {
  const metrics = await pulsarAdminClient.brokerStats
    .getTopics2()
    .catch((err) => console.log(err));

  if (metrics !== undefined) {
    state.metrics = metrics;
  }

  const tenants = await pulsarAdminClient.tenants
    .getTenants()
    .catch((err) => console.log(err));

  if (tenants !== undefined) {
    state.tenants = tenants;
  }

  scheduleRefreshState();
}

function scheduleRefreshState() {
  clearTimeout(state.metricsUpdateTimeout);
  state.metricsUpdateTimeout = setTimeout(refreshState, 10 * 1000);
}

refreshState();
scheduleRefreshState();

export const router = Router();

router.get(
  "/allTenants",
  async (_, res: Response<Record<string, TenantMetrics>>) => {
    const tenantsMetrics = fromPairs(
      state.tenants.map((tenant) => [
        tenant,
        getTenantMetrics(tenant, state.metrics),
      ])
    );
    res.status(200).json(tenantsMetrics);
  }
);

router.get(
  "/tenants/:tenant",
  async (req: Request, res: Response<TenantMetrics>) => {
    const tenant = req.params.tenant;
    const tenantMetrics = getTenantMetrics(tenant, state.metrics);
    res.status(200).json(tenantMetrics);
  }
);

router.get(
  "/tenants/:tenant/allNamespaces",
  async (req, res: Response<Record<string, NamespaceMetrics>>) => {
    const tenant = req.params.tenant;

    const namespacesData = await pulsarAdminClient.namespaces.getTenantNamespaces(tenant).catch((err) => console.log(err));
    if (namespacesData === undefined) {
      res.status(500).end();
      return;
    }

    const namespaces = namespacesData.map(tns => tns.split("/")[1]);

    const namespacesMetrics = getNamespacesMetrics(tenant, namespaces, state.metrics);
    res.status(200).json(namespacesMetrics);
  }
);

router.get(
  "/tenants/:tenant/namespaces/:namespace/topics",
  async (req, res: Response<Record<string, NamespaceMetrics>>) => {
    const tenant = req.params.tenant;
    const namespace = req.params.namespace;

    const topicMetrics = getNamespaceTopicsMetrics(tenant, namespace, state.metrics);
    console.log(topicMetrics);
    res.status(200).json(topicMetrics);
  }
);
