package routes.instance.tenants._tenant_id.overview

import net.datafaker.Faker
import zio.test.ZIOSpecDefault

val faker = new Faker()

import zio.test.{Spec, ZIOSpecDefault}

object TenantOverviewPageSpec extends ZIOSpecDefault {
    def spec: Spec[Any, Any] = suite("Tenant overview page")() //TODO
}
