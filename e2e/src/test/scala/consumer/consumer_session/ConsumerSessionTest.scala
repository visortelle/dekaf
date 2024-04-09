package consumer.consumer_session

import test_env.PulsarStandaloneEnv

class ConsumerSessionTest extends munit.FunSuite:
    val testEnv = PulsarStandaloneEnv.make()
    
    test("hello"):
        val obtained = 42
        val expected = 42
        assertEquals(obtained, expected)

