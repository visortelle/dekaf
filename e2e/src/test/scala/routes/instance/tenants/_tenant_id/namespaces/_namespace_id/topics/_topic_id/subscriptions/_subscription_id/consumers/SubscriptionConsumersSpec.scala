package routes.instance.tenants._tenant_id.namespaces._namespace_id.topics._topic_id.subscriptions._subscription_id.consumers

import zio.test.{Spec, ZIOSpecDefault}
import net.datafaker.Faker

val faker = new Faker()

object SubscriptionConsumersSpec extends ZIOSpecDefault {
    def spec: Spec[Any, Any] = suite("Subscription consumers page")()
}
