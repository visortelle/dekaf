package routes.instance.tenants._tenant_id.namespaces._namespace_id.topics._topic_id.overview

import zio.test.{Spec, ZIOSpecDefault}
import net.datafaker.Faker

val faker = new Faker()

object TopicOverviewSpec extends ZIOSpecDefault {
    def spec: Spec[Any, Any] = suite("Topic overview page")() // TODO
}
