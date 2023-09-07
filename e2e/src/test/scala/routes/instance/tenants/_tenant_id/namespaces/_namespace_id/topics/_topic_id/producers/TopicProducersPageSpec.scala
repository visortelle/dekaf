package routes.instance.tenants._tenant_id.namespaces._namespace_id.topics._topic_id.producers

import zio.test.{Spec, ZIOSpecDefault}
import net.datafaker.Faker

val faker = new Faker()

object TopicProducersPageSpec extends ZIOSpecDefault {
    def spec: Spec[Any, Any] = suite("Delete topic modal")() // TODO
}
