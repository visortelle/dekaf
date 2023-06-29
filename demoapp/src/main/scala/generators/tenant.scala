package generators

type TenantName = String
type TenantIndex = Int

case class Tenant(
    name: TenantName,
    namespaces: Map[NamespaceName, NamespacePlan]
)

case class TenantGenerator(
    getName: TenantIndex => TenantName,
    getNamespacesCount: TenantIndex => Int,
    getNamespaceGenerator: NamespaceIndex => NamespacePlanGenerator
)
