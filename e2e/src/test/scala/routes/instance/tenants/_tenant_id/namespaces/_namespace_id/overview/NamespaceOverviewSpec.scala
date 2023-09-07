package routes.instance.tenants._tenant_id.namespaces._namespace_id.overview

import net.datafaker.Faker
import zio.test.{Spec, ZIOSpecDefault}

val faker = new Faker()
object NamespaceOverviewSpec extends ZIOSpecDefault {
    def spec: Spec[Any, Any] = suite("Namespace overview page")() //TODO
}


