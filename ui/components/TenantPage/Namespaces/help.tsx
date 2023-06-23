import { ReactNode } from "react";
import { ColumnKey } from "./Namespaces";

export const help: Record<ColumnKey, ReactNode> = {
  tenantName: "The name of the tenant.",
  adminRoles: "A client with the admin role token can then create, modify and destroy namespaces, and grant and revoke permissions to other role tokens on those namespaces.",
  allowedClusters: "The list of clusters that this tenant is allowed to use.",
  namespacesCount: "The number of namespaces that this tenant has."
};
