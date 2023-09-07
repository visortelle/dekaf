package routes.instance.tenants._tenant_id.namespaces._namespace_id.subscription_permissions

import net.datafaker.Faker
import zio.test.{Spec, ZIOSpecDefault}

val faker = new Faker()
object NamespaceSubscriptionPermissionsSpec extends ZIOSpecDefault {
    def spec: Spec[Any, Any] = suite("Namespace subscription permissions page")() //TODO
}
