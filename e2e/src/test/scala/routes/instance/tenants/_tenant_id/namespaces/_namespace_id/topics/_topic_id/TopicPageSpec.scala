package routes.instance.tenants._tenant_id.namespaces._namespace_id.topics._topic_id

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import scala.jdk.CollectionConverters.*
import _root_.test_env.TestEnv
import com.microsoft.playwright.Page.WaitForURLOptions
import org.apache.pulsar.common.policies.data.{ResourceGroup, TenantInfo}
import net.datafaker.Faker

val faker = new Faker()

object TopicPageSpec extends ZIOSpecDefault {
    def spec: Spec[Any, Any] = suite("Topic page")() // TODO - add all topic pages suites
}
