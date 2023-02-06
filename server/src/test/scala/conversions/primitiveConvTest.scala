package conversions

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*
import com.google.common.primitives.{Bytes, Doubles, Ints, Shorts}

/* Useful tools:
 - https://hexed.it/
 - https://www.simonv.fr/TypesConvert/?integers
 - https://onlineutf8tools.com
 */

object primitiveConvTest extends ZIOSpecDefault {
    private val floatPrecision = 0.000_000_1
    def spec = suite(this.getClass.toString)(
        test("eqFloat") {
            case class TestCase(a: Double, b: Double, precision: Double, expected: Boolean)

            def runTestCase(testCase: TestCase): Boolean =
                val actual = primitiveConv.eqFloat(testCase.a, testCase.b, testCase.precision)
                actual == testCase.expected

            val testCases = List(
                TestCase(0.0f, 0.0f, floatPrecision, true),
                TestCase(0.0f, 1.0f, floatPrecision, false),
                TestCase(1.0f, 0.0f, floatPrecision, false),
                TestCase(1.0f, 1.0f, floatPrecision, true),
                TestCase(0.0f, -0.0f, floatPrecision, true),
                TestCase(0.0f, Float.NaN, floatPrecision, false),
                TestCase(Float.NaN, 0.0f, floatPrecision, false),
                TestCase(Float.NaN, Float.NaN, floatPrecision, false)
            )

            assertTrue(testCases.forall(runTestCase))
        },
        test("bytesToInt8") {
            case class TestCase(bytes: Array[Byte], check: (result: Either[Throwable, Byte]) => Boolean)

            def runTestCase(testCase: TestCase): Boolean =
                val actual = primitiveConv.bytesToInt8(testCase.bytes)
                testCase.check(actual)

            val testCases = List(
                TestCase(Array(), _ == Right(0)),
                TestCase(Array(0x00.toByte), _ == Right(0)),
                TestCase(Array(0x01.toByte), _ == Right(1)),
                TestCase(Array(0xff.toByte), _ == Right(-1)),
                TestCase(Array(0x2a.toByte), _ == Right(42)),
                TestCase(Array(0xd6.toByte), _ == Right(-42)),
                TestCase(Array(0x80.toByte), _ == Right(Byte.MinValue)),
                TestCase(Array(0x7f.toByte), _ == Right(Byte.MaxValue)),
                TestCase(Array(0x00, 0x00).map(_.toByte), _.isLeft),
                TestCase(Array(0x00, 0x01, 0x01).map(_.toByte), _.isLeft)
            )

            assertTrue(testCases.forall(runTestCase))
        },
        test("bytesToInt16") {
            case class TestCase(bytes: Array[Byte], check: (result: Either[Throwable, Short]) => Boolean)

            def runTestCase(testCase: TestCase): Boolean =
                val actual = primitiveConv.bytesToInt16(testCase.bytes)
                testCase.check(actual)

            val testCases = List(
                TestCase(Array(), _ == Right(0)),
                TestCase(Array(0x00.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x01).map(_.toByte), _ == Right(1)),
                TestCase(Array(0xff, 0xff).map(_.toByte), _ == Right(-1)),
                TestCase(Array(0x00, 0x2a).map(_.toByte), _ == Right(42)),
                TestCase(Array(0xff, 0xd6).map(_.toByte), _ == Right(-42)),
                TestCase(Array(0x80, 0x00).map(_.toByte), _ == Right(Short.MinValue)),
                TestCase(Array(0x7f, 0xff).map(_.toByte), _ == Right(Short.MaxValue)),
                TestCase(Array(0x00, 0x00, 0x00).map(_.toByte), _.isLeft),
                TestCase(Array(0x00, 0x00, 0x01, 0x01).map(_.toByte), _.isLeft)
            )

            assertTrue(testCases.forall(runTestCase))
        },
        test("bytesToInt32") {
            case class TestCase(bytes: Array[Byte], check: (result: Either[Throwable, Int]) => Boolean)

            def runTestCase(testCase: TestCase): Boolean =
                val actual = primitiveConv.bytesToInt32(testCase.bytes)
                testCase.check(actual)

            val testCases = List(
                TestCase(Array(), _ == Right(0)),
                TestCase(Array(0x00.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x02).map(_.toByte), _ == Right(2)),
                TestCase(Array(0x00, 0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x00, 0x03).map(_.toByte), _ == Right(3)),
                TestCase(Array(0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x00, 0x00, 0x01).map(_.toByte), _ == Right(1)),
                TestCase(Array(0xff, 0xff, 0xff, 0xff).map(_.toByte), _ == Right(-1)),
                TestCase(Array(0x00, 0x00, 0x00, 0x2a).map(_.toByte), _ == Right(42)),
                TestCase(Array(0xff, 0xff, 0xff, 0xd6).map(_.toByte), _ == Right(-42)),
                TestCase(Array(0x80, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(Int.MinValue)),
                TestCase(Array(0x7f, 0xff, 0xff, 0xff).map(_.toByte), _ == Right(Int.MaxValue)),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _.isLeft)
            )

            assertTrue(testCases.forall(runTestCase))
        },
        test("bytesToInt64") {
            case class TestCase(bytes: Array[Byte], check: (result: Either[Throwable, Long]) => Boolean)

            def runTestCase(testCase: TestCase): Boolean =
                val actual = primitiveConv.bytesToInt64(testCase.bytes)
                testCase.check(actual)

            val testCases = List(
                TestCase(Array(), _ == Right(0)),
                TestCase(Array(0x00.toByte), _ == Right(0)),
                TestCase(Array(0x02.toByte), _ == Right(2)),
                TestCase(Array(0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x03).map(_.toByte), _ == Right(3)),
                TestCase(Array(0x00, 0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x00, 0x04).map(_.toByte), _ == Right(4)),
                TestCase(Array(0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x00, 0x00, 0x05).map(_.toByte), _ == Right(5)),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x06).map(_.toByte), _ == Right(6)),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00, 0x07).map(_.toByte), _ == Right(7)),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08).map(_.toByte), _ == Right(8)),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01).map(_.toByte), _ == Right(1)),
                TestCase(Array(0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff).map(_.toByte), _ == Right(-1)),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2a).map(_.toByte), _ == Right(42)),
                TestCase(Array(0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xd6).map(_.toByte), _ == Right(-42)),
                TestCase(Array(0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(Long.MinValue)),
                TestCase(Array(0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff).map(_.toByte), _ == Right(Long.MaxValue)),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _.isLeft)
            )

            assertTrue(testCases.forall(runTestCase))
        },
        test("bytesToFloat32") {
            case class TestCase(bytes: Array[Byte], check: (result: Either[Throwable, Float]) => Boolean)

            def runTestCase(testCase: TestCase): Boolean =
                val actual = primitiveConv.bytesToFloat32(testCase.bytes)
                testCase.check(actual)

            val testCases = List(
                TestCase(Array(), _ == Right(0)),
                TestCase(Array(0x00.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x3f, 0x80, 0x00, 0x00).map(_.toByte), _ == Right(1)),
                TestCase(Array(0xbf, 0x80, 0x00, 0x00).map(_.toByte), _ == Right(-1)),
                TestCase(Array(0x42, 0x28, 0x00, 0x00).map(_.toByte), _ == Right(42)),
                TestCase(Array(0xc2, 0x28, 0x00, 0x00).map(_.toByte), _ == Right(-42)),
                TestCase(Array(0x7f, 0x7f, 0xff, 0xff).map(_.toByte), _ == Right(Float.MaxValue)),
                TestCase(Array(0x7f, 0x80, 0x00, 0x00).map(_.toByte), _ == Right(Float.PositiveInfinity)),
                TestCase(Array(0xff, 0x80, 0x00, 0x00).map(_.toByte), _ == Right(Float.NegativeInfinity)),
                TestCase(Array(0x7f, 0xc0, 0x00, 0x00).map(_.toByte), _.toOption.get.isNaN),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _.isLeft)
            )

            assertTrue(testCases.forall(runTestCase))
        },
        test("bytesToFloat64") {
            case class TestCase(bytes: Array[Byte], check: (result: Either[Throwable, Double]) => Boolean)

            def runTestCase(testCase: TestCase): Boolean =
                val actual = primitiveConv.bytesToFloat64(testCase.bytes)
                testCase.check(actual)

            val testCases = List(
                TestCase(Array(), _ == Right(0)),
                TestCase(Array(0x00.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(1)),
                TestCase(Array(0xbf, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(-1)),
                TestCase(
                    Array(0x40, 0x45, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte),
                    v => primitiveConv.eqFloat(v.toOption.get, 42, floatPrecision)
                ),
                TestCase(
                    Array(0xc0, 0x45, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte),
                    v => primitiveConv.eqFloat(v.toOption.get, -42, floatPrecision)
                ),
                TestCase(Array(0x7f, 0xef, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff).map(_.toByte), _ == Right(Double.MaxValue)),
                TestCase(Array(0x7f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(Double.PositiveInfinity)),
                TestCase(Array(0xff, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(Double.NegativeInfinity)),
                TestCase(Array(0x7f, 0xf8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _.toOption.get.isNaN),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _.isLeft)
            )

            assertTrue(testCases.forall(runTestCase))
        },
        test("bytesToString") {
            case class TestCase(bytes: Array[Byte], expected: String)

            def runTestCase(testCase: TestCase): Boolean =
                val actual = primitiveConv.bytesToString(testCase.bytes)
                actual == testCase.expected

            val testCases = List(
                TestCase(Array(), ""),
                TestCase(Array(0x68).map(_.toByte), "h"),
                TestCase(
                    Array(0x61, 0x0a, 0x62, 0x0a, 0x63).map(_.toByte),
                    """a
                      |b
                      |c""".stripMargin
                ),
                TestCase(Array(0x47, 0x72, 0x75, 0xc3, 0x9f).map(_.toByte), "Gruß"),
                TestCase(Array(0xe4, 0xb8, 0x96, 0xe7, 0x95, 0x8c).map(_.toByte), "世界"),
                TestCase(Array(0x71, 0x75, 0x22, 0x6f, 0x74, 0x65, 0x22, 0x73).map(_.toByte), """qu"ote"s"""),
            )

            assertTrue(testCases.forall(runTestCase))
        },
        test("bytesToJsonString") {
            case class TestCase(bytes: Array[Byte], expected: String)

            def runTestCase(testCase: TestCase): Boolean =
                val actual = primitiveConv.bytesToJsonString(testCase.bytes)
                actual == testCase.expected

            val testCases = List(
                TestCase(Array(), "\"\""),
                TestCase(Array(0x68).map(_.toByte), "\"h\""),
                TestCase(
                    Array(0x61, 0x0a, 0x62, 0x0a, 0x63).map(_.toByte),
                    """"a\nb\nc""""
                ),
                TestCase(Array(0x47, 0x72, 0x75, 0xc3, 0x9f).map(_.toByte), "\"Gruß\""),
                TestCase(Array(0xe4, 0xb8, 0x96, 0xe7, 0x95, 0x8c).map(_.toByte), "\"世界\""),
                TestCase(Array(0x71, 0x75, 0x22, 0x6f, 0x74, 0x65, 0x22, 0x73).map(_.toByte), """"qu\"ote\"s""""),
            )

            assertTrue(testCases.forall(runTestCase))
        },
        test("bytesToBoolean") {
            case class TestCase(bytes: Array[Byte], check: (result: Either[Throwable, Boolean]) => Boolean)

            def runTestCase(testCase: TestCase): Boolean =
                val actual = primitiveConv.bytesToBoolean(testCase.bytes)
                testCase.check(actual)

            val testCases = List(
                TestCase(Array(), _.isLeft),
                TestCase(Array(0x00).map(_.toByte), _ == Right(false)),
                TestCase(Array(0x01).map(_.toByte), _ == Right(true)),
                TestCase(Array(0x00, 0x00).map(_.toByte), _.isLeft),
                TestCase(Array(0x00, 0x01).map(_.toByte), _.isLeft),
            )

            assertTrue(testCases.forall(runTestCase))
        },
        test("leftPad") {
            case class TestCase(bytes: Array[Byte], size: Int, pad: Byte, expected: Array[Byte])

            def runTestCase(testCase: TestCase): Boolean =
                val actual = primitiveConv.leftPad(testCase.bytes, testCase.size, testCase.pad)
                actual.sameElements(testCase.expected)

            val testCases = List(
                TestCase(Array(), 0, 0, Array()),
                TestCase(Array(), 1, 0, Array(0x00).map(_.toByte)),
                TestCase(Array(), 2, 0, Array(0x00, 0x00).map(_.toByte)),
                TestCase(Array(0x01), 2, 0x02.toByte, Array(0x02, 0x01)),
                TestCase(Array(0x01), 3, 0x02.toByte, Array(0x02, 0x02, 0x01).map(_.toByte)),

                TestCase(Array(0x01).map(_.toByte), 0, 0, Array(0x01).map(_.toByte)),
                TestCase(Array(0x01).map(_.toByte), 1, 0, Array(0x01).map(_.toByte)),
            )

            assertTrue(testCases.forall(runTestCase))
        }
    )
}
