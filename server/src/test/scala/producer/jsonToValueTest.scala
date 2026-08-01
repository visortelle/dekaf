package producer

import zio.*
import zio.test.*
import zio.test.Assertion.*

import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import _root_.conversions.primitiveConv
import _root_.schema.avro

import java.nio.charset.StandardCharsets
import io.circe.parser.parse as parseJson

/* Tests for `producer.jsonToValue` — the WRITE path that turns a JSON payload from the
 * producer UI into the wire bytes for a topic's schema. It is the mirror of the READ path
 * covered by `conversions.primitiveConvTest`, so wherever possible the corresponding
 * `primitiveConv` decoder is used as the oracle for a round-trip.
 *
 * `jsonToValue` is a pure function over its arguments (no shared/singleton state), so the
 * default parallel execution of ZIO Test suites is safe here — no `TestAspect.sequential`.
 */
object jsonToValueTest extends ZIOSpecDefault {

    private def schemaInfoOf(schemaType: SchemaType, definition: Array[Byte] = Array.emptyByteArray): SchemaInfo =
        SchemaInfo.builder
            .name(s"test-$schemaType")
            .`type`(schemaType)
            .schema(definition)
            .build

    private def encode(schemaType: SchemaType, json: String): Either[Throwable, Array[Byte]] =
        jsonToValue(schemaInfoOf(schemaType), json.getBytes(StandardCharsets.UTF_8))

    private def passesThrough(schemaType: SchemaType, payload: String): Boolean =
        encode(schemaType, payload) match
            case Right(bytes) => bytes.sameElements(payload.getBytes(StandardCharsets.UTF_8))
            case Left(_)      => false

    def spec = suite(this.getClass.toString)(
        // ---------------------------------------------------------------- INT8
        test("INT8 encodes one big-endian byte that round-trips through primitiveConv.bytesToInt8") {
            case class TestCase(json: String, expected: Byte)

            def runTestCase(testCase: TestCase): Boolean =
                encode(SchemaType.INT8, testCase.json) match
                    case Right(bytes) => bytes.length == 1 && primitiveConv.bytesToInt8(bytes) == Right(testCase.expected)
                    case Left(_)      => false

            val testCases = List(
                TestCase("0", 0),
                TestCase("1", 1),
                TestCase("-1", -1),
                TestCase("42", 42),
                TestCase("-42", -42),
                TestCase("127", Byte.MaxValue),
                TestCase("-128", Byte.MinValue)
            )

            val failures = testCases.filterNot(runTestCase).map(_.json)
            assertTrue(failures.isEmpty)
        },
        test("INT8 rejects out-of-range and unparseable input") {
            // Out-of-range is caught by the explicit Byte.MinValue/MaxValue guard
            // (ProducerServiceImpl.scala:190) — this one is a real, non-vacuous check.
            val rejected = List("128", "-128000", "-129", "1.5", "0x2a", "abc", "true", " 42", "42 ", "+42", "")

            val failures = rejected.filterNot(json => encode(SchemaType.INT8, json).isLeft)
            assertTrue(failures.isEmpty)
        },
        // --------------------------------------------------------------- INT16
        test("INT16 encodes two big-endian bytes that round-trip through primitiveConv.bytesToInt16") {
            case class TestCase(json: String, expected: Short)

            def runTestCase(testCase: TestCase): Boolean =
                encode(SchemaType.INT16, testCase.json) match
                    case Right(bytes) => bytes.length == 2 && primitiveConv.bytesToInt16(bytes) == Right(testCase.expected)
                    case Left(_)      => false

            val testCases = List(
                TestCase("0", 0),
                TestCase("1", 1),
                TestCase("-1", -1),
                TestCase("42", 42),
                TestCase("-42", -42),
                TestCase("32767", Short.MaxValue),
                TestCase("-32768", Short.MinValue)
            )

            val failures = testCases.filterNot(runTestCase).map(_.json)
            assertTrue(failures.isEmpty)
        },
        test("INT16 rejects out-of-range and unparseable input") {
            // Guarded by the explicit Short.MinValue/MaxValue check (ProducerServiceImpl.scala:201).
            val rejected = List("32768", "-32769", "2147483647", "1.5", "abc", "")

            val failures = rejected.filterNot(json => encode(SchemaType.INT16, json).isLeft)
            assertTrue(failures.isEmpty)
        },
        // --------------------------------------------------------------- INT32
        test("INT32 encodes four big-endian bytes that round-trip through primitiveConv.bytesToInt32") {
            case class TestCase(json: String, expected: Int)

            def runTestCase(testCase: TestCase): Boolean =
                encode(SchemaType.INT32, testCase.json) match
                    case Right(bytes) => bytes.length == 4 && primitiveConv.bytesToInt32(bytes) == Right(testCase.expected)
                    case Left(_)      => false

            val testCases = List(
                TestCase("0", 0),
                TestCase("1", 1),
                TestCase("-1", -1),
                TestCase("42", 42),
                TestCase("-42", -42),
                TestCase("2147483647", Int.MaxValue),
                TestCase("-2147483648", Int.MinValue)
            )

            val failures = testCases.filterNot(runTestCase).map(_.json)
            assertTrue(failures.isEmpty)
        },
        test("INT32 rejects out-of-range and unparseable input") {
            // NOTE: the explicit range guard at ProducerServiceImpl.scala:211 is VACUOUS —
            // `n` is already an Int, so `n > Int.MaxValue || n < Int.MinValue` can never hold.
            // Out-of-range input is nonetheless rejected, because Guava's Ints.tryParse returns
            // null on overflow. The observable contract is therefore still fail-closed; only the
            // error MESSAGE is wrong ("Unable to parse" instead of "out of range"). Asserting the
            // rejection, not the message.
            val rejected = List("2147483648", "-2147483649", "9223372036854775807", "1.5", "abc", "")

            val failures = rejected.filterNot(json => encode(SchemaType.INT32, json).isLeft)
            assertTrue(failures.isEmpty)
        },
        // --------------------------------------------------------------- INT64
        test("INT64 encodes eight big-endian bytes that round-trip through primitiveConv.bytesToInt64") {
            case class TestCase(json: String, expected: Long)

            def runTestCase(testCase: TestCase): Boolean =
                encode(SchemaType.INT64, testCase.json) match
                    case Right(bytes) => bytes.length == 8 && primitiveConv.bytesToInt64(bytes) == Right(testCase.expected)
                    case Left(_)      => false

            val testCases = List(
                TestCase("0", 0L),
                TestCase("1", 1L),
                TestCase("-1", -1L),
                TestCase("42", 42L),
                TestCase("-42", -42L),
                TestCase("2147483648", 2147483648L),
                TestCase("9223372036854775807", Long.MaxValue),
                TestCase("-9223372036854775808", Long.MinValue)
            )

            val failures = testCases.filterNot(runTestCase).map(_.json)
            assertTrue(failures.isEmpty)
        },
        test("INT64 rejects out-of-range and unparseable input") {
            // Same shape as INT32: the guard at ProducerServiceImpl.scala:221 is vacuous
            // (`n` is already a Long); Longs.tryParse returning null is what actually rejects.
            val rejected = List("9223372036854775808", "-9223372036854775809", "1.5", "abc", "")

            val failures = rejected.filterNot(json => encode(SchemaType.INT64, json).isLeft)
            assertTrue(failures.isEmpty)
        },
        // ----------------------------------------------- INT8/16/32/64, shared
        // REGRESSION - the four integer branches handed the payload straight to Guava's
        // `Ints/Longs.tryParse`, which accepts JAVA integer literal syntax rather than JSON: `01`,
        // `00` and `-01` all parsed and were encoded onto the topic. A leading zero is not a valid
        // JSON number, and this is the JSON message format - FLOAT/DOUBLE on the same switch have
        // gated on JSON number syntax since 2026-07-25, the integer widths had not.
        test("integer schemas reject leading-zero literals that are not valid JSON numbers") {
            val rejected = List("01", "00", "007", "-01", "-00", "0123")
            val widths = List(SchemaType.INT8, SchemaType.INT16, SchemaType.INT32, SchemaType.INT64)

            val accepted =
                for
                    width <- widths
                    json <- rejected
                    if encode(width, json).isRight
                yield s"$width accepted $json"

            assertTrue(accepted.isEmpty) ?? s"accepted non-JSON integer literals: ${accepted.mkString(", ")}"
        },
        test("a single zero and ordinary integers still encode for every integer width") {
            // The control for the case above: the JSON-syntax gate must reject the leading-zero
            // forms WITHOUT also rejecting `0` itself, or negative and multi-digit values.
            val accepted = List("0", "-0", "7", "-7", "42", "-42")
            val widths = List(SchemaType.INT8, SchemaType.INT16, SchemaType.INT32, SchemaType.INT64)

            val rejected =
                for
                    width <- widths
                    json <- accepted
                    if encode(width, json).isLeft
                yield s"$width rejected $json"

            assertTrue(rejected.isEmpty) ?? s"rejected valid JSON integers: ${rejected.mkString(", ")}"
        },
        // --------------------------------------------------------------- FLOAT
        test("FLOAT encodes four bytes that round-trip through primitiveConv.bytesToFloat32") {
            case class TestCase(json: String, expected: Float)

            def runTestCase(testCase: TestCase): Boolean =
                encode(SchemaType.FLOAT, testCase.json) match
                    case Right(bytes) => bytes.length == 4 && primitiveConv.bytesToFloat32(bytes) == Right(testCase.expected)
                    case Left(_)      => false

            val testCases = List(
                TestCase("0", 0.0f),
                TestCase("0.0", 0.0f),
                TestCase("1", 1.0f),
                TestCase("-1", -1.0f),
                TestCase("1.5", 1.5f),
                TestCase("-1.5", -1.5f),
                TestCase("42", 42.0f),
                TestCase("3.4028235E38", Float.MaxValue),
                TestCase("-3.4028235E38", Float.MinValue)
            )

            val failures = testCases.filterNot(runTestCase).map(_.json)
            assertTrue(failures.isEmpty)
        },
        test("FLOAT rejects infinities and values that overflow the float range") {
            // The bound check at ProducerServiceImpl.scala:231 is a symmetric magnitude bound
            // (Scala's Float.MinValue is -Float.MaxValue), so the only values it can reject are
            // the infinities — including inputs that parse INTO an infinity, e.g. "1e39".
            val rejected = List("Infinity", "-Infinity", "1e39", "-1e39")

            val failures = rejected.filterNot(json => encode(SchemaType.FLOAT, json).isLeft)
            assertTrue(failures.isEmpty)
        },
        // REGRESSION (fixed 2026-07-25) - FLOAT used to accept NaN. The guard at ProducerServiceImpl.scala:231
        // (`n > MaxValue || n < MinValue`) is always false for NaN, so NaN slips past the very
        // check that rejects both infinities and is encoded as 0x7fc00000 onto the topic —
        // even though `NaN` is not valid JSON and this is the JSON message format.
        test("FLOAT rejects NaN") {
            val rejected = List("NaN", "-NaN")

            val failures = rejected.filterNot(json => encode(SchemaType.FLOAT, json).isLeft)
            assertTrue(failures.isEmpty)
        },
        // REGRESSION (fixed 2026-07-25) - the FLOAT/DOUBLE branches delegated parsing to Guava, whose
        // FLOATING_POINT_PATTERN is Java literal syntax, not JSON: `+1`, `01`, `.5`, `1.`, a hex
        // float literal and a trailing `f`/`d` suffix all parsed and were silently encoded onto the
        // topic. This is the JSON message format - the STRING branch on the same switch has always
        // required real JSON - so the payload has to be a JSON number.
        test("FLOAT rejects Java float literals that are not valid JSON numbers") {
            val rejected = List("+1", "01", ".5", "1.", "0x1p3", "1f", "1d", "1.5F")

            val failures = rejected.filterNot(json => encode(SchemaType.FLOAT, json).isLeft)
            assertTrue(failures.isEmpty) ?? s"accepted non-JSON numeric forms: ${failures.mkString(", ")}"
        },
        // -------------------------------------------------------------- DOUBLE
        test("DOUBLE encodes eight bytes that round-trip through primitiveConv.bytesToFloat64") {
            case class TestCase(json: String, expected: Double)

            def runTestCase(testCase: TestCase): Boolean =
                encode(SchemaType.DOUBLE, testCase.json) match
                    case Right(bytes) => bytes.length == 8 && primitiveConv.bytesToFloat64(bytes) == Right(testCase.expected)
                    case Left(_)      => false

            val testCases = List(
                TestCase("0", 0.0d),
                TestCase("0.0", 0.0d),
                TestCase("1", 1.0d),
                TestCase("-1", -1.0d),
                TestCase("1.5", 1.5d),
                TestCase("-1.5", -1.5d),
                TestCase("42", 42.0d),
                TestCase("1e39", 1e39d),
                TestCase("1.7976931348623157E308", Double.MaxValue),
                TestCase("-1.7976931348623157E308", Double.MinValue)
            )

            val failures = testCases.filterNot(runTestCase).map(_.json)
            assertTrue(failures.isEmpty)
        },
        test("DOUBLE rejects infinities and values that overflow the double range") {
            val rejected = List("Infinity", "-Infinity", "1e309", "-1e309")

            val failures = rejected.filterNot(json => encode(SchemaType.DOUBLE, json).isLeft)
            assertTrue(failures.isEmpty)
        },
        // REGRESSION (fixed 2026-07-25) - DOUBLE used to accept NaN, same reason as FLOAT: the guard at
        // ProducerServiceImpl.scala:241 compares against NaN and is therefore always false,
        // so NaN is encoded as 0x7ff8000000000000 while both infinities are rejected.
        test("DOUBLE rejects NaN") {
            val rejected = List("NaN", "-NaN")

            val failures = rejected.filterNot(json => encode(SchemaType.DOUBLE, json).isLeft)
            assertTrue(failures.isEmpty)
        },
        // See the FLOAT case above - same Guava parser, same non-JSON forms.
        test("DOUBLE rejects Java double literals that are not valid JSON numbers") {
            val rejected = List("+1", "01", ".5", "1.", "0x1p3", "1f", "1d", "1.5D")

            val failures = rejected.filterNot(json => encode(SchemaType.DOUBLE, json).isLeft)
            assertTrue(failures.isEmpty) ?? s"accepted non-JSON numeric forms: ${failures.mkString(", ")}"
        },
        // ------------------------------------------------------------- BOOLEAN
        test("BOOLEAN encodes one byte that round-trips through primitiveConv.bytesToBoolean") {
            case class TestCase(json: String, expected: Boolean)

            def runTestCase(testCase: TestCase): Boolean =
                encode(SchemaType.BOOLEAN, testCase.json) match
                    case Right(bytes) => bytes.length == 1 && primitiveConv.bytesToBoolean(bytes) == Right(testCase.expected)
                    case Left(_)      => false

            val testCases = List(
                TestCase("true", true),
                TestCase("false", false)
            )

            val failures = testCases.filterNot(runTestCase).map(_.json)
            assertTrue(failures.isEmpty)
        },
        test("BOOLEAN accepts only the two bare lowercase literals, byte-for-byte") {
            // Documents the ACTUAL contract: BOOLEAN does a raw string compare of the whole
            // payload (ProducerServiceImpl.scala:177-181) rather than parsing JSON like STRING
            // does. It happens to accept exactly the canonical JSON boolean literals, but it is
            // stricter than JSON: " true" and "true\n" are valid JSON booleans and are rejected.
            // Fail-closed, so documented rather than flagged as a defect — but the two branches
            // of the same endpoint disagree about what "JSON" means.
            val rejected = List("True", "TRUE", "\"true\"", " true", "true ", "true\n", "1", "0", "yes", "on", "null", "")

            val failures = rejected.filterNot(json => encode(SchemaType.BOOLEAN, json).isLeft)
            assertTrue(failures.isEmpty)
        },
        // -------------------------------------------------------------- STRING
        test("STRING requires a quoted JSON string literal and round-trips through primitiveConv.bytesToString") {
            case class TestCase(json: String, expected: String)

            def runTestCase(testCase: TestCase): Boolean =
                encode(SchemaType.STRING, testCase.json) match
                    case Right(bytes) => primitiveConv.bytesToString(bytes) == testCase.expected
                    case Left(_)      => false

            val testCases = List(
                TestCase("\"\"", ""),
                TestCase("\"hello\"", "hello"),
                TestCase("\"123\"", "123"),
                TestCase("\"a\\nb\"", "a\nb"),
                TestCase("\"qu\\\"ote\\\"s\"", """qu"ote"s"""),
                // Non-ASCII guards the encoding of the write path: the payload must come back out
                // as UTF-8, which is what the read path (primitiveConv.bytesToString) assumes.
                TestCase("\"Gruß\"", "Gruß"),
                TestCase("\"世界\"", "世界")
            )

            val failures = testCases.filterNot(runTestCase).map(_.json)
            assertTrue(failures.isEmpty)
        },
        test("STRING rejects unquoted, non-string and malformed JSON") {
            val rejected = List(
                "hello", // bare token: not valid JSON at all
                "123", // valid JSON, but a number
                "true",
                "null",
                "{}",
                """{"a":1}""",
                "[]",
                """["a"]""",
                "\"unterminated",
                "" // empty payload
            )

            val failures = rejected.filterNot(json => encode(SchemaType.STRING, json).isLeft)
            assertTrue(failures.isEmpty)
        },
        // ---------------------------------------------------------- JSON, NONE
        test("JSON forwards a syntactically valid payload byte-for-byte") {
            // The bytes must reach the topic unchanged - validation must not reformat the payload.
            val payloads = List(
                """{"a":1}""",
                """{"a":{"b":[1,2]},"c":null}""",
                "[1,2,3]",
                "null",
                "true",
                "123",
                "\"a string\"",
                """  {"a":1}  """, // surrounding whitespace is legal JSON and is preserved
                """{"a":"Grüß 世界"}"""
            )

            val failures = payloads.filterNot(p => passesThrough(SchemaType.JSON, p))
            assertTrue(failures.isEmpty)
        },
        // REGRESSION (fixed 2026-07-25) - `case SchemaType.JSON => Right(jsonAsBytes)` did no parsing at all, so a
        // topic with a JSON schema accepted arbitrary bytes: the producer reported success and the
        // broken payload landed on the topic, where the READ path then fails to deserialize it. The
        // sibling STRING branch on the same switch has always parsed strict JSON.
        test("JSON rejects a payload that is not valid JSON") {
            val rejected = List(
                "not json at all",
                """{"a":}""",
                "{",
                "[1,2",
                "{'a':1}", // single quotes are not JSON
                """{"a":1} trailing""",
                """{"a":1}{"b":2}""", // two documents, not one
                "undefined",
                "NaN",
                "" // empty payload
            )

            val failures = rejected.filterNot(json => encode(SchemaType.JSON, json).isLeft)
            assertTrue(failures.isEmpty)
        },
        test("NONE stays permissive and forwards raw bytes byte-for-byte") {
            // Deliberately NOT tightened: SchemaType.NONE means "no schema", so the payload is
            // opaque bytes that may legitimately not be JSON at all.
            val payloads = List("""{"a":1}""", "[1,2,3]", "null", "", "not json at all", """{"a":}""", " raw")

            val failures = payloads.filterNot(p => passesThrough(SchemaType.NONE, p))
            assertTrue(failures.isEmpty)
        },
        // ---------------------------------------------------------------- AVRO
        test("AVRO encodes against the writer schema and rejects payloads that do not fit it") {
            val avroSchemaDefinition =
                """
                  |{
                  |  "type": "record",
                  |  "name": "User",
                  |  "fields": [
                  |    {"name": "name", "type": "string"},
                  |    {"name": "favorite_number", "type": "int"}
                  |  ]
                  |}
                  """.stripMargin

            val schemaInfo = schemaInfoOf(SchemaType.AVRO, avroSchemaDefinition.getBytes(StandardCharsets.UTF_8))

            val jsonToEncode = """{"name":"Alyssa","favorite_number":256}"""
            val encoded = jsonToValue(schemaInfo, jsonToEncode.getBytes(StandardCharsets.UTF_8))

            // Round-trip back through the matching decoder used by the consumer path.
            val decoded = encoded.flatMap(bytes => avro.converters.toJson(avroSchemaDefinition.getBytes(StandardCharsets.UTF_8), bytes))
            val roundTripped = decoded.map(bytes => parseJson(String(bytes, StandardCharsets.UTF_8)))

            val rejected = List(
                """{"name":"Alyssa"}""", // missing required field
                """{"name":"Alyssa","favorite_number":"not a number"}""",
                "not json at all",
                ""
            )
            val rejectFailures = rejected.filterNot(json => jsonToValue(schemaInfo, json.getBytes(StandardCharsets.UTF_8)).isLeft)

            assertTrue(
                encoded.isRight,
                roundTripped == Right(parseJson(jsonToEncode)),
                rejectFailures.isEmpty
            )
        },
        // ---------------------------------------------------- PROTOBUF_NATIVE
        test("PROTOBUF_NATIVE rejects a payload it cannot encode against the schema descriptor") {
            // A valid descriptor needs a compiled .proto (covered in schema.protobufnative tests);
            // here we only pin that the branch surfaces the converter's failure as a Left rather
            // than throwing out of jsonToValue.
            val schemaInfo = schemaInfoOf(SchemaType.PROTOBUF_NATIVE, "not a descriptor".getBytes(StandardCharsets.UTF_8))

            assertTrue(jsonToValue(schemaInfo, """{"a":1}""".getBytes(StandardCharsets.UTF_8)).isLeft)
        },
        // --------------------------------------------------- unsupported types
        test("unsupported schema types are rejected") {
            val unsupported = List(
                SchemaType.BYTES,
                SchemaType.DATE,
                SchemaType.TIME,
                SchemaType.TIMESTAMP,
                SchemaType.INSTANT,
                SchemaType.LOCAL_DATE,
                SchemaType.LOCAL_TIME,
                SchemaType.LOCAL_DATE_TIME,
                SchemaType.KEY_VALUE,
                SchemaType.PROTOBUF
            )

            def rejectsWithUnsupportedMessage(schemaType: SchemaType): Boolean =
                encode(schemaType, """{"a":1}""") match
                    case Left(err) => err.getMessage.startsWith("Unsupported schema type")
                    case Right(_)  => false

            val failures = unsupported.filterNot(rejectsWithUnsupportedMessage).map(_.toString)
            assertTrue(failures.isEmpty)
        },
        // --------------------------------------------------------- empty input
        test("an empty payload is rejected for every primitive schema type") {
            val primitives = List(
                SchemaType.INT8,
                SchemaType.INT16,
                SchemaType.INT32,
                SchemaType.INT64,
                SchemaType.FLOAT,
                SchemaType.DOUBLE,
                SchemaType.BOOLEAN,
                SchemaType.STRING
            )

            val failures = primitives.filterNot(t => jsonToValue(schemaInfoOf(t), Array.emptyByteArray).isLeft).map(_.toString)
            assertTrue(failures.isEmpty)
        }
    )
}
