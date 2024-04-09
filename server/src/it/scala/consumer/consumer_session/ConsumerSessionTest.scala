package consumer.consumer_session

import zio.*
import zio.test.*
import zio.test.Assertion.*
import testing.{TestDekaf, TestDekafPage, TestPulsar}

object ConsumerSessionTest extends ZIOSpecDefault:
    def spec = suite(this.getClass.getName)(
        test("hello world") {
            for {
                pulsar <- ZIO.service[TestPulsar]
                pulsarAdmin <- pulsar.getAdminClient
                dekaf <- ZIO.service[TestDekaf]
            } yield assertTrue(2 == 2)
        }
    ).provideSomeShared(
        TestPulsar.live,
        TestDekaf.live,
        TestDekafPage.live
    )
