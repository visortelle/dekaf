import { BatchRequest } from './types';
import { hideShowProgressIndicatorHeader } from "../../../../pages/_app";
import _ from "lodash";

export type TenantInfo = {
  allowedClusters: string[];
  adminRoles: string[];
}

export async function getTenantsInfo(tenants: string[], batchApiUrl: string, brokerWebApiUrl: string): Promise<Record<string, TenantInfo>> {
  const requests = tenants.map<BatchRequest>(tenant => {
    return {
      name: tenant,
      headers: { "Content-Type": "application/json" },
      method: 'GET',
      url: `${brokerWebApiUrl}/admin/v2/tenants/${tenant}`
    }
  });

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
  const json = await res.json() as Record<string, { body: TenantInfo }>;

  return _(json).toPairs().map(([k, v]) => [k, v.body]).fromPairs().value();
}
