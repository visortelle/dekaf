package conversions

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*
import com.google.common.primitives.{Bytes, Doubles, Ints, Shorts}

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
                TestCase(Array(0x00.toByte), _ == Right(0)),
                TestCase(Array(0x01.toByte), _ == Right(1)),
                TestCase(Array(0xff.toByte), _ == Right(-1)),
                TestCase(Array(0x2a.toByte), _ == Right(42)),
                TestCase(Array(0xd6.toByte), _ == Right(-42)),
                TestCase(Array(0x80.toByte), _ == Right(Byte.MinValue)),
                TestCase(Array(0x7f.toByte), _ == Right(Byte.MaxValue)),
                TestCase(Array(), _.isLeft),
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
                TestCase(Array(0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x01).map(_.toByte), _ == Right(1)),
                TestCase(Array(0xff, 0xff).map(_.toByte), _ == Right(-1)),
                TestCase(Array(0x00, 0x2a).map(_.toByte), _ == Right(42)),
                TestCase(Array(0xff, 0xd6).map(_.toByte), _ == Right(-42)),
                TestCase(Array(0x80, 0x00).map(_.toByte), _ == Right(Short.MinValue)),
                TestCase(Array(0x7f, 0xff).map(_.toByte), _ == Right(Short.MaxValue)),
                TestCase(Array(), _.isLeft),
                TestCase(Array(0x00.toByte), _.isLeft),
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
                TestCase(Array(0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x00, 0x00, 0x01).map(_.toByte), _ == Right(1)),
                TestCase(Array(0xff, 0xff, 0xff, 0xff).map(_.toByte), _ == Right(-1)),
                TestCase(Array(0x00, 0x00, 0x00, 0x2a).map(_.toByte), _ == Right(42)),
                TestCase(Array(0xff, 0xff, 0xff, 0xd6).map(_.toByte), _ == Right(-42)),
                TestCase(Array(0x80, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(Int.MinValue)),
                TestCase(Array(0x7f, 0xff, 0xff, 0xff).map(_.toByte), _ == Right(Int.MaxValue)),
                TestCase(Array(), _.isLeft),
                TestCase(Array(0x00.toByte), _.isLeft),
                TestCase(Array(0x00, 0x00).map(_.toByte), _.isLeft),
                TestCase(Array(0x00, 0x00, 0x00).map(_.toByte), _.isLeft),
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
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01).map(_.toByte), _ == Right(1)),
                TestCase(Array(0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff).map(_.toByte), _ == Right(-1)),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2a).map(_.toByte), _ == Right(42)),
                TestCase(Array(0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xd6).map(_.toByte), _ == Right(-42)),
                TestCase(Array(0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(Long.MinValue)),
                TestCase(Array(0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff).map(_.toByte), _ == Right(Long.MaxValue)),
                TestCase(Array(), _.isLeft),
                TestCase(Array(0x00.toByte), _.isLeft),
                TestCase(Array(0x00, 0x00).map(_.toByte), _.isLeft),
                TestCase(Array(0x00, 0x00, 0x00).map(_.toByte), _.isLeft),
                TestCase(Array(0x00, 0x00, 0x00, 0x00).map(_.toByte), _.isLeft),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _.isLeft),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _.isLeft),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _.isLeft),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _.isLeft)
            )

            assertTrue(testCases.forall(runTestCase))
        },
        test("bytesToFloat32") {
            case class TestCase(bytes: Array[Byte], check: (result: Either[Throwable, Float]) => Boolean)

            def runTestCase(testCase: TestCase): Boolean =
                val actual = primitiveConv.bytesToFloat32(testCase.bytes)
                println(s"actual: $actual")
                println(s"expected: ${Float.MinValue}")
                testCase.check(actual)

            val floatMinValueHex = 0x00800000
            val testCases = List(
                TestCase(Array(0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x3f, 0x80, 0x00, 0x00).map(_.toByte), _ == Right(1)),
                TestCase(Array(0xbf, 0x80, 0x00, 0x00).map(_.toByte), _ == Right(-1)),
                TestCase(Array(0x42, 0x28, 0x00, 0x00).map(_.toByte), _ == Right(42)),
                TestCase(Array(0xc2, 0x28, 0x00, 0x00).map(_.toByte), _ == Right(-42)),

                TestCase(Array(0x7f, 0x7f, 0xff, 0xff).map(_.toByte), _ == Right(Float.MaxValue)),
                TestCase(Array(0x7f, 0x80, 0x00, 0x00).map(_.toByte), _ == Right(Float.PositiveInfinity)),
                TestCase(Array(0xff, 0x80, 0x00, 0x00).map(_.toByte), _ == Right(Float.NegativeInfinity)),
                TestCase(Array(0x7f, 0xc0, 0x00, 0x00).map(_.toByte), _.toOption.get.isNaN),

                TestCase(Array(), _.isLeft),
                TestCase(Array(0x00.toByte), _.isLeft),
                TestCase(Array(0x00, 0x00).map(_.toByte), _.isLeft),
                TestCase(Array(0x00, 0x00, 0x00).map(_.toByte), _.isLeft),
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
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(0)),
                TestCase(Array(0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(1)),
                TestCase(Array(0xbf, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(-1)),
                TestCase(
                    Array(0x40, 0x45, 0x00, 0x00, 0xc0, 0x00, 0x00, 0x00).map(_.toByte),
                    v => primitiveConv.eqFloat(v.toOption.get, 42, floatPrecision)
                ),
                TestCase(
                    Array(0xc0, 0x45, 0x00, 0x00, 0xc0, 0x00, 0x00, 0x00).map(_.toByte),
                    v => primitiveConv.eqFloat(v.toOption.get, -42, floatPrecision)
                ),
                TestCase(Array(0x7f, 0xef, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff).map(_.toByte), _ == Right(Double.MaxValue)),
                TestCase(Array(0x7f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(Double.PositiveInfinity)),
                TestCase(Array(0xff, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _ == Right(Double.NegativeInfinity)),
                TestCase(Array(0x7f, 0xf8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _.toOption.get.isNaN),

                TestCase(Array(), _.isLeft),
                TestCase(Array(0x00.toByte), _.isLeft),
                TestCase(Array(0x00, 0x00).map(_.toByte), _.isLeft),
                TestCase(Array(0x00, 0x00, 0x00).map(_.toByte), _.isLeft),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _.isLeft),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _.isLeft),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _.isLeft),
                TestCase(Array(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), _.isLeft),
            )

            assertTrue(testCases.forall(runTestCase))
        }
    )
}
