package consumer.consumer_session

import zio.*
import zio.test.*
import zio.test.Assertion.*
import testing.{TestDekaf, TestEnv, TestPulsarContainer}

val testEnv = TestEnv.make()

object ConsumerSessionTest extends ZIOSpecDefault:
    def spec = suite(this.getClass.getName)(
        test("hello world") {
            for {
                pulsarContainer <- ZIO.service[TestPulsarContainer]
                pulsarAdmin <- ZIO.attempt(pulsarContainer.getAdminClient)
                dekaf <- ZIO.service[TestDekaf]
            } yield assertTrue(2 == 2)
        }
    ).provideSomeShared(
        TestPulsarContainer.live,
        TestDekaf.live
    )
