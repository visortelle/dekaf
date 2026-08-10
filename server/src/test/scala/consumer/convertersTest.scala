package consumer.session_runner

import zio.*
import zio.test.*
import zio.test.Assertion.*

import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import org.apache.pulsar.client.api.Schema
import org.apache.pulsar.client.api.schema.SchemaDefinition
import org.apache.pulsar.client.impl.MessageImpl
import org.apache.pulsar.client.impl.schema.{
    AvroSchema,
    BooleanSchema,
    ByteSchema,
    BytesSchema,
    DoubleSchema,
    FloatSchema,
    InstantSchema,
    IntSchema,
    JSONSchema,
    LongSchema,
    ProtobufNativeSchema,
    ProtobufNativeSchemaUtils,
    ProtobufSchema,
    SchemaDefinitionImpl,
    SchemaUtils,
    ShortSchema,
    StringSchema
}
import _root_.schema.avro
import _root_.schema.protobufnative
import _root_.consumer.deserializer.Deserializer
import _root_.consumer.deserializer.deserializers.{TreatBytesAsJson, UseLatestTopicSchema}
import org.apache.pulsar.common.api.proto.MessageMetadata
import schema.protobufnative.FileEntry
import io.circe.parser.parse as parseJson

import java.nio.ByteBuffer

val useLatestTopicSchemaDeserializer = Deserializer(deserializer = UseLatestTopicSchema())
val treatBytesAsJsonDeserializer = Deserializer(deserializer = TreatBytesAsJson())

object convertersTest extends ZIOSpecDefault:
    /* Renders a byte array as hex so a failing table case is identifiable in the report. */
    private def hex(bytes: Array[Byte]): String = bytes.map(b => f"0x$b%02x").mkString("[", " ", "]")

    def spec = suite(s"${this.getClass.toString} - messageValueToJson()")(
        test("AVRO schema") {
            val avroSchemaDefinition = """
            |{
            |  "type": "record",
            |  "name": "User",
            |  "fields": [
            |    {
            |      "name": "name",
            |      "type": "string"
            |    },
            |    {
            |      "name": "favorite_number",
            |      "type": "int"
            |    }
            |  ]
            |}
            """.stripMargin

            val schemaInfo = SchemaInfo.builder
                .`type`(SchemaType.AVRO)
                .schema(avroSchemaDefinition.getBytes)
                .build

            val schemaDefinition: SchemaDefinition[Array[Byte]] =
                SchemaDefinition
                    .builder()
                    .withJsonDef(schemaInfo.getSchemaDefinition)
                    .build

            val jsonToEncode = """{"name":"Alyssa","favorite_number":256}"""

            avro.converters.fromJson(
                avroSchemaDefinition.getBytes,
                jsonToEncode.getBytes
            ) match
                case Left(error) => assertNever(s"failed to encode the AVRO test payload: $error")
                case Right(avroPayload) =>
                    val avroSchema = AvroSchema.of(schemaDefinition)

                    val topicName = "topic-a"
                    val schemaVersion = 1L;
                    val messageMetadata = new MessageMetadata().setSchemaVersion(scala.math.BigInt(schemaVersion).toByteArray)
                    val message = MessageImpl.create[Array[Byte]](
                        messageMetadata,
                        java.nio.ByteBuffer.wrap(avroPayload),
                        avroSchema,
                        topicName
                    )

                    val schemasByVersion: SchemasByVersion = Map(1L -> schemaInfo)
                    val schemasByTopic: SchemasByTopic = Map(topicName -> schemasByVersion)

                    converters.messageValueToJson(schemasByTopic, message, useLatestTopicSchemaDeserializer) match
                        case Left(err) => assertNever(s"messageValueToJson failed for the AVRO message: $err")
                        case Right(decodedJson) =>
                            assertTrue(parseJson(decodedJson) == parseJson(jsonToEncode)) ??
                                s"decoded $decodedJson, expected $jsonToEncode"
        },
        test("JSON schema") {
            val avroSchemaDefinition =
                """
                  |{
                  |  "type": "record",
                  |  "name": "User",
                  |  "fields": [
                  |    {
                  |      "name": "name",
                  |      "type": "string"
                  |    },
                  |    {
                  |      "name": "favorite_number",
                  |      "type": "int"
                  |    }
                  |  ]
                  |}
                  """.stripMargin

            val schemaInfo = SchemaInfo.builder
                .`type`(SchemaType.JSON)
                .schema(avroSchemaDefinition.getBytes)
                .build

            val schemaDefinition: SchemaDefinition[Array[Byte]] =
                SchemaDefinition
                    .builder()
                    .withJsonDef(schemaInfo.getSchemaDefinition)
                    .build

            val jsonToEncode = """{"name":"Alyssa","favorite_number":256}"""
            val jsonPayload = jsonToEncode.getBytes

            val jsonSchema = JSONSchema.of(schemaDefinition)

            val topicName = "topic-a"
            val schemaVersion = 1L;
            val messageMetadata = new MessageMetadata().setSchemaVersion(scala.math.BigInt(schemaVersion).toByteArray)
            val message = MessageImpl.create[Array[Byte]](
                messageMetadata,
                java.nio.ByteBuffer.wrap(jsonPayload),
                jsonSchema,
                topicName
            )

            val schemasByVersion: SchemasByVersion = Map(schemaVersion -> schemaInfo)
            val schemasByTopic: SchemasByTopic = Map(topicName -> schemasByVersion)

            converters.messageValueToJson(schemasByTopic, message, useLatestTopicSchemaDeserializer) match
                case Left(err) => assertNever(s"messageValueToJson failed for the JSON-schema message: $err")
                case Right(decodedJson) =>
                    assertTrue(parseJson(decodedJson) == parseJson(jsonToEncode)) ??
                        s"decoded $decodedJson, expected $jsonToEncode"
        },
        test("a message that names NO schema version is read with the topic's LATEST schema") {
            // THE CASE THIS DESERIALIZER IS NAMED FOR. A producer using Schema.BYTES (or an older
            // client) stamps no schema version, so nothing but the topic's registry says what the
            // bytes are. The old code answered `bytesToJsonString` here, which renders a JSON
            // DOCUMENT as an escaped JSON STRING - `{\"id\":1,...}` instead of the object - and
            // `SchemasByVersion.getLatest`, written for exactly this, was never called from
            // anywhere. Confirmed end to end by e2e CS-SCH-1 (schema registered through the admin
            // API, payload produced with Schema.BYTES).
            val schemaDefinition =
                """
                  |{
                  |  "type": "record",
                  |  "name": "TestOrder",
                  |  "fields": [
                  |    { "name": "id", "type": "int" },
                  |    { "name": "item", "type": "string" }
                  |  ]
                  |}
                  """.stripMargin

            val schemaInfo = SchemaInfo.builder
                .`type`(SchemaType.JSON)
                .schema(schemaDefinition.getBytes)
                .build

            val jsonToEncode = """{"id":1,"item":"boots"}"""
            val topicName = "topic-a"

            // No setSchemaVersion: this is what a schema-less producer actually writes.
            val messageMetadata = new MessageMetadata()
            val message = MessageImpl.create[Array[Byte]](
                messageMetadata,
                java.nio.ByteBuffer.wrap(jsonToEncode.getBytes),
                Schema.BYTES,
                topicName
            )

            val schemasByTopic: SchemasByTopic = Map(topicName -> Map(1L -> schemaInfo))

            converters.messageValueToJson(schemasByTopic, message, useLatestTopicSchemaDeserializer) match
                case Left(err) => assertNever(s"messageValueToJson failed for the version-less message: $err")
                case Right(decodedJson) =>
                    assertTrue(parseJson(decodedJson) == parseJson(jsonToEncode)) ??
                        s"decoded $decodedJson, expected the OBJECT $jsonToEncode (an escaped string means the raw-bytes fallback ran)"
        },
        test("a version-less message on a topic with NO registered schema still reads as raw bytes") {
            // The other side of the same branch: inferring a schema is only possible when the
            // registry holds one. With nothing to infer from, the raw-string answer is correct
            // and must not change.
            val payload = """{"id":1}"""
            val message = MessageImpl.create[Array[Byte]](
                new MessageMetadata(),
                java.nio.ByteBuffer.wrap(payload.getBytes),
                Schema.BYTES,
                "topic-without-schema"
            )

            converters.messageValueToJson(Map.empty, message, useLatestTopicSchemaDeserializer) match
                case Left(err) => assertNever(s"messageValueToJson failed for the schema-less topic: $err")
                case Right(decodedJson) =>
                    // A JSON string literal - the document as text, quoted and escaped.
                    assertTrue(parseJson(decodedJson).toOption.exists(_.isString)) ??
                        s"decoded $decodedJson, expected the raw payload as a JSON string"
        },
        test("PROTOBUF_NATIVE schema") {
            val protoFileName = "user.proto"
            val protoFileContent =
                """
                  |syntax = "proto3";
                  |
                  |package rootPkg;
                  |
                  |message User {
                  |  string name = 1;
                  |  int32 favorite_number = 2;
                  |}
              """.stripMargin

            val compiledFiles = protobufnative.compiler.compileFiles(List(FileEntry(protoFileName, protoFileContent)))
            val compiledUserSchema: Either[String, Array[Byte]] = compiledFiles.files.get(protoFileName) match
                case Some(Right(file)) =>
                    file.schemas.get("User").map(_.rawSchema).toRight(s"""compiled $protoFileName has no "User" message""")
                case Some(Left(error)) => Left(s"failed to compile $protoFileName: $error")
                case None              => Left(s"the PROTOBUF_NATIVE compiler returned no result for $protoFileName")

            compiledUserSchema match
                case Left(reason) => assertNever(reason)
                case Right(protoSchemaDefinition) =>
                    val schemaInfo = SchemaInfo.builder
                        .`type`(SchemaType.PROTOBUF_NATIVE)
                        .schema(protoSchemaDefinition)
                        .build

                    val protoSchema = Schema.getSchema(schemaInfo).asInstanceOf[Schema[Array[Byte]]]

                    val jsonToEncode = """{"name":"Alyssa","favorite_number":256}"""

                    protobufnative.converters.fromJson(protoSchemaDefinition, jsonToEncode.getBytes) match
                        case Left(error) => assertNever(s"failed to encode the PROTOBUF_NATIVE test payload: $error")
                        case Right(protoPayload) =>
                            val topicName = "topic-a"
                            val schemaVersion = 1L;
                            val messageMetadata = new MessageMetadata().setSchemaVersion(scala.math.BigInt(schemaVersion).toByteArray)
                            val message = MessageImpl.create[Array[Byte]](
                                messageMetadata,
                                java.nio.ByteBuffer.wrap(protoPayload),
                                protoSchema,
                                topicName
                            )

                            val schemasByVersion: SchemasByVersion = Map(schemaVersion -> schemaInfo)
                            val schemasByTopic: SchemasByTopic = Map(topicName -> schemasByVersion)

                            converters.messageValueToJson(schemasByTopic, message, useLatestTopicSchemaDeserializer) match
                                case Left(err) => assertNever(s"messageValueToJson failed for the PROTOBUF_NATIVE message: $err")
                                case Right(decodedJson) =>
                                    assertTrue(parseJson(decodedJson) == parseJson(jsonToEncode)) ??
                                        s"decoded $decodedJson, expected $jsonToEncode"
        },
        test("BOOLEAN to json") {
            case class TestCase(messagePayload: Array[Byte], expectedJson: String)

            def runTestCase(testCase: TestCase, idx: Int): TestResult =
                val schemaInfo = SchemaInfo.builder
                    .`type`(SchemaType.BOOLEAN)
                    .build

                val topicName = "topic-a"
                val schemaVersion = 1L;
                val messageMetadata = new MessageMetadata().setSchemaVersion(scala.math.BigInt(schemaVersion).toByteArray)
                val message = MessageImpl.create[Array[Byte]](
                    messageMetadata,
                    ByteBuffer.wrap(testCase.messagePayload),
                    BooleanSchema.of.asInstanceOf[Schema[Array[Byte]]],
                    topicName
                )

                val schemasByVersion: SchemasByVersion = Map(schemaVersion -> schemaInfo)
                val schemasByTopic: SchemasByTopic = Map(topicName -> schemasByVersion)

                val label = s"case #$idx: BOOLEAN payload=${hex(testCase.messagePayload)}, expected ${testCase.expectedJson}"

                converters.messageValueToJson(schemasByTopic, message, useLatestTopicSchemaDeserializer) match
                    case Left(err)   => assertNever(s"$label -- messageValueToJson failed: $err")
                    case Right(json) => assertTrue(parseJson(json) == parseJson(testCase.expectedJson)) ?? s"$label, actual $json"

            val testCases = List[TestCase](
                TestCase(Array(0), "false"),
                TestCase(Array(1), "true")
            )

            testCases.zipWithIndex.map { (testCase, idx) => runTestCase(testCase, idx) }.reduce(_ && _)
        },
        test("INT8 to json") {
            case class TestCase(messagePayload: Array[Byte], expected: String)

            def runTestCase(testCase: TestCase, idx: Int): TestResult =
                val schemaInfo = SchemaInfo.builder
                    .`type`(SchemaType.INT8)
                    .build

                val topicName = "topic-a"
                val schemaVersion = 1L;
                val messageMetadata = new MessageMetadata().setSchemaVersion(scala.math.BigInt(schemaVersion).toByteArray)
                val message = MessageImpl.create[Array[Byte]](
                    messageMetadata,
                    ByteBuffer.wrap(testCase.messagePayload),
                    ByteSchema.of.asInstanceOf[Schema[Array[Byte]]],
                    topicName
                )

                val schemasByVersion: SchemasByVersion = Map(schemaVersion -> schemaInfo)
                val schemasByTopic: SchemasByTopic = Map(topicName -> schemasByVersion)

                val label = s"case #$idx: INT8 payload=${hex(testCase.messagePayload)}, expected ${testCase.expected}"

                converters.messageValueToJson(schemasByTopic, message, useLatestTopicSchemaDeserializer) match
                    case Left(err)   => assertNever(s"$label -- messageValueToJson failed: $err")
                    case Right(json) => assertTrue(parseJson(json) == parseJson(testCase.expected)) ?? s"$label, actual $json"

            val testCases = List[TestCase](
                TestCase(Array(0), "0"),
                TestCase(Array(1), "1"),
                TestCase(Array(15), "15"),
                TestCase(Array(127), "127"),
                TestCase(Array(-18), "-18")
            )

            testCases.zipWithIndex.map { (testCase, idx) => runTestCase(testCase, idx) }.reduce(_ && _)
        },
        test("INT16 to json") {
            case class TestCase(messagePayload: Array[Byte], expectedJson: String)

            def runTestCase(testCase: TestCase, idx: Int): TestResult =
                val schemaInfo = SchemaInfo.builder
                    .`type`(SchemaType.INT16)
                    .build

                val topicName = "topic-a"
                val schemaVersion = 1L;
                val messageMetadata = new MessageMetadata().setSchemaVersion(scala.math.BigInt(schemaVersion).toByteArray)
                val message = MessageImpl.create[Array[Byte]](
                    messageMetadata,
                    ByteBuffer.wrap(testCase.messagePayload),
                    ShortSchema.of.asInstanceOf[Schema[Array[Byte]]],
                    topicName
                )

                val schemasByVersion: SchemasByVersion = Map(schemaVersion -> schemaInfo)
                val schemasByTopic: SchemasByTopic = Map(topicName -> schemasByVersion)

                val label = s"case #$idx: INT16 payload=${hex(testCase.messagePayload)}, expected ${testCase.expectedJson}"

                converters.messageValueToJson(schemasByTopic, message, useLatestTopicSchemaDeserializer) match
                    case Left(err)   => assertNever(s"$label -- messageValueToJson failed: $err")
                    case Right(json) => assertTrue(parseJson(json) == parseJson(testCase.expectedJson)) ?? s"$label, actual $json"

            val testCases = List[TestCase](
                TestCase(Array(0), "0"),
                TestCase(Array(0, 0), "0"),
                TestCase(Array(1), "1"),
                TestCase(Array(15), "15"),
                TestCase(Array(127), "127"),
                TestCase(Array(0xff, 0xee).map(_.toByte), "-18"),
                TestCase(Array(0x7f, 0xff).map(_.toByte), Short.MaxValue.toString)
            )

            testCases.zipWithIndex.map { (testCase, idx) => runTestCase(testCase, idx) }.reduce(_ && _)
        },
        test("INT32 to json") {
            case class TestCase(messagePayload: Array[Byte], expectedJson: String)

            def runTestCase(testCase: TestCase, idx: Int): TestResult =
                val schemaInfo = SchemaInfo.builder
                    .`type`(SchemaType.INT32)
                    .build

                val topicName = "topic-a"
                val schemaVersion = 1L;
                val messageMetadata = new MessageMetadata().setSchemaVersion(scala.math.BigInt(schemaVersion).toByteArray)
                val message = MessageImpl.create[Array[Byte]](
                    messageMetadata,
                    ByteBuffer.wrap(testCase.messagePayload),
                    IntSchema.of.asInstanceOf[Schema[Array[Byte]]],
                    topicName
                )

                val schemasByVersion: SchemasByVersion = Map(schemaVersion -> schemaInfo)
                val schemasByTopic: SchemasByTopic = Map(topicName -> schemasByVersion)

                val label = s"case #$idx: INT32 payload=${hex(testCase.messagePayload)}, expected ${testCase.expectedJson}"

                converters.messageValueToJson(schemasByTopic, message, useLatestTopicSchemaDeserializer) match
                    case Left(err)   => assertNever(s"$label -- messageValueToJson failed: $err")
                    case Right(json) => assertTrue(parseJson(json) == parseJson(testCase.expectedJson)) ?? s"$label, actual $json"

            val testCases = List[TestCase](
                TestCase(Array(0), "0"),
                TestCase(Array(0, 0), "0"),
                TestCase(Array(1), "1"),
                TestCase(Array(15), "15"),
                TestCase(Array(127), "127"),
                TestCase(Array(0xff, 0xff, 0xff, 0xee).map(_.toByte), "-18"),
                TestCase(Array(0x7f, 0xff, 0xff, 0xff).map(_.toByte), Int.MaxValue.toString)
            )

            testCases.zipWithIndex.map { (testCase, idx) => runTestCase(testCase, idx) }.reduce(_ && _)
        },
        test("INT64 to json") {
            case class TestCase(messagePayload: Array[Byte], expectedJson: String)

            def runTestCase(testCase: TestCase, idx: Int): TestResult =
                val schemaInfo = SchemaInfo.builder
                    .`type`(SchemaType.INT64)
                    .build

                val topicName = "topic-a"
                val schemaVersion = 1L;
                val messageMetadata = new MessageMetadata().setSchemaVersion(scala.math.BigInt(schemaVersion).toByteArray)
                val message = MessageImpl.create[Array[Byte]](
                    messageMetadata,
                    ByteBuffer.wrap(testCase.messagePayload),
                    LongSchema.of.asInstanceOf[Schema[Array[Byte]]],
                    topicName
                )

                val schemasByVersion: SchemasByVersion = Map(schemaVersion -> schemaInfo)
                val schemasByTopic: SchemasByTopic = Map(topicName -> schemasByVersion)

                val label = s"case #$idx: INT64 payload=${hex(testCase.messagePayload)}, expected ${testCase.expectedJson}"

                converters.messageValueToJson(schemasByTopic, message, useLatestTopicSchemaDeserializer) match
                    case Left(err)   => assertNever(s"$label -- messageValueToJson failed: $err")
                    case Right(json) => assertTrue(parseJson(json) == parseJson(testCase.expectedJson)) ?? s"$label, actual $json"

            val testCases = List[TestCase](
                TestCase(Array(0), "0"),
                TestCase(Array(0, 0), "0"),
                TestCase(Array(1), "1"),
                TestCase(Array(15), "15"),
                TestCase(Array(127), "127"),
                TestCase(Array(0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xee).map(_.toByte), "-18"),
                TestCase(Array(0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff).map(_.toByte), s"""${Long.MaxValue.toString}""")
            )

            testCases.zipWithIndex.map { (testCase, idx) => runTestCase(testCase, idx) }.reduce(_ && _)
        },
        test("FLOAT to json") {
            case class TestCase(messagePayload: Array[Byte], expectedJson: String)

            def runTestCase(testCase: TestCase, idx: Int): TestResult =
                val schemaInfo = SchemaInfo.builder
                    .`type`(SchemaType.FLOAT)
                    .build

                val topicName = "topic-a"
                val schemaVersion = 1L;
                val messageMetadata = new MessageMetadata().setSchemaVersion(scala.math.BigInt(schemaVersion).toByteArray)
                val message = MessageImpl.create[Array[Byte]](
                    messageMetadata,
                    ByteBuffer.wrap(testCase.messagePayload),
                    FloatSchema.of.asInstanceOf[Schema[Array[Byte]]],
                    topicName
                )

                val schemasByVersion: SchemasByVersion = Map(schemaVersion -> schemaInfo)
                val schemasByTopic: SchemasByTopic = Map(topicName -> schemasByVersion)

                val label = s"case #$idx: FLOAT payload=${hex(testCase.messagePayload)}, expected ${testCase.expectedJson}"

                converters.messageValueToJson(schemasByTopic, message, useLatestTopicSchemaDeserializer) match
                    case Left(err)   => assertNever(s"$label -- messageValueToJson failed: $err")
                    case Right(json) => assertTrue(parseJson(json) == parseJson(testCase.expectedJson)) ?? s"$label, actual $json"

            val testCases = List[TestCase](
                TestCase(Array(0), "0.0"),
                TestCase(Array(0, 0), "0.0"),
                TestCase(Array(0x3f, 0x80, 0x00, 0x00).map(_.toByte), "1.0"),
                TestCase(Array(0x41, 0x70, 0x00, 0x00).map(_.toByte), "15.0"),
                TestCase(Array(0x42, 0xfe, 0x00, 0x00).map(_.toByte), "127.0"),
                TestCase(Array(0xc1, 0x90, 0x00, 0x00).map(_.toByte), "-18.0"),
                TestCase(Array(0xc6, 0xea, 0x60, 0x0f).map(_.toByte), "-30000.03")
            )

            testCases.zipWithIndex.map { (testCase, idx) => runTestCase(testCase, idx) }.reduce(_ && _)
        },
        test("DOUBLE to json") {
            case class TestCase(messagePayload: Array[Byte], expectedJson: String)

            def runTestCase(testCase: TestCase, idx: Int): TestResult =
                val schemaInfo = SchemaInfo.builder
                    .`type`(SchemaType.DOUBLE)
                    .build

                val topicName = "topic-a"
                val schemaVersion = 1L;
                val messageMetadata = new MessageMetadata().setSchemaVersion(scala.math.BigInt(schemaVersion).toByteArray)
                val message = MessageImpl.create[Array[Byte]](
                    messageMetadata,
                    ByteBuffer.wrap(testCase.messagePayload),
                    DoubleSchema.of.asInstanceOf[Schema[Array[Byte]]],
                    topicName
                )

                val schemasByVersion: SchemasByVersion = Map(schemaVersion -> schemaInfo)
                val schemasByTopic: SchemasByTopic = Map(topicName -> schemasByVersion)

                val label = s"case #$idx: DOUBLE payload=${hex(testCase.messagePayload)}, expected ${testCase.expectedJson}"

                converters.messageValueToJson(schemasByTopic, message, useLatestTopicSchemaDeserializer) match
                    case Left(err)   => assertNever(s"$label -- messageValueToJson failed: $err")
                    case Right(json) => assertTrue(parseJson(json) == parseJson(testCase.expectedJson)) ?? s"$label, actual $json"

            val testCases = List[TestCase](
                TestCase(Array(0), "0.0"),
                TestCase(Array(0, 0), "0.0"),
                TestCase(Array(0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), "1.0"),
                TestCase(Array(0x40, 0x2e, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), "15.0"),
                TestCase(Array(0x40, 0x5f, 0xc0, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), "127.0"),
                TestCase(Array(0xc0, 0x32, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), "-18.0"),
                TestCase(Array(0xc0, 0xdd, 0x4c, 0x01, 0xeb, 0x85, 0x1e, 0xb8).map(_.toByte), "-30000.03")
            )

            testCases.zipWithIndex.map { (testCase, idx) => runTestCase(testCase, idx) }.reduce(_ && _)
        },
        test("STRING to json") {
            case class TestCase(messagePayload: Array[Byte], expectedJson: String)

            def runTestCase(testCase: TestCase, idx: Int): TestResult =
                val schemaInfo = SchemaInfo.builder
                    .`type`(SchemaType.STRING)
                    .build

                val topicName = "topic-a"
                val schemaVersion = 1L;
                val messageMetadata = new MessageMetadata().setSchemaVersion(scala.math.BigInt(schemaVersion).toByteArray)
                val message = MessageImpl.create[Array[Byte]](
                    messageMetadata,
                    ByteBuffer.wrap(testCase.messagePayload),
                    StringSchema.utf8.asInstanceOf[Schema[Array[Byte]]],
                    topicName
                )

                val schemasByVersion: SchemasByVersion = Map(schemaVersion -> schemaInfo)
                val schemasByTopic: SchemasByTopic = Map(topicName -> schemasByVersion)

                val label = s"case #$idx: STRING payload=${hex(testCase.messagePayload)}, expected ${testCase.expectedJson}"

                converters.messageValueToJson(schemasByTopic, message, useLatestTopicSchemaDeserializer) match
                    case Left(err)   => assertNever(s"$label -- messageValueToJson failed: $err")
                    case Right(json) => assertTrue(parseJson(json) == parseJson(testCase.expectedJson)) ?? s"$label, actual $json"

            val testCases = List[TestCase](
                TestCase(Array(), "\"\""),
                TestCase(Array(0x68).map(_.toByte), "\"h\""),
                TestCase(
                    Array(0x61, 0x0a, 0x62, 0x0a, 0x63).map(_.toByte),
                    """"a\nb\nc""""
                ),
                TestCase(Array(0x47, 0x72, 0x75, 0xc3, 0x9f).map(_.toByte), "\"Gruß\""),
                TestCase(Array(0xe4, 0xb8, 0x96, 0xe7, 0x95, 0x8c).map(_.toByte), "\"世界\""),
                TestCase(Array(0x71, 0x75, 0x22, 0x6f, 0x74, 0x65, 0x22, 0x73).map(_.toByte), """"qu\"ote\"s"""")
            )

            testCases.zipWithIndex.map { (testCase, idx) => runTestCase(testCase, idx) }.reduce(_ && _)
        },
        test("TreatBytesAsJson deserializer - valid JSON payload") {
            case class TestCase(payload: String)

            def runTestCase(testCase: TestCase, idx: Int): TestResult =
                val topicName = "topic-a"
                val message = MessageImpl.create[Array[Byte]](
                    new MessageMetadata(),
                    ByteBuffer.wrap(testCase.payload.getBytes("UTF-8")),
                    BytesSchema.of.asInstanceOf[Schema[Array[Byte]]],
                    topicName
                )

                // The deserializer ignores the registered schemas by design - it treats the raw bytes as JSON.
                val schemasByTopic: SchemasByTopic = Map.empty

                val label = s"case #$idx: payload=${testCase.payload}"

                converters.messageValueToJson(schemasByTopic, message, treatBytesAsJsonDeserializer) match
                    case Left(err)   => assertNever(s"$label -- expected Right, got Left($err)")
                    case Right(json) => assertTrue(parseJson(json) == parseJson(testCase.payload)) ?? s"$label, actual $json"

            val testCases = List[TestCase](
                TestCase("""{"name":"Alyssa","favorite_number":256}"""),
                TestCase("""{"a":2,"b":{"c":3}}"""),
                TestCase("""[1,2,"a"]"""),
                TestCase("[]"),
                TestCase("null"),
                TestCase("true"),
                TestCase("-3.0"),
                TestCase("\"Gruß\"")
            )

            testCases.zipWithIndex.map { (testCase, idx) => runTestCase(testCase, idx) }.reduce(_ && _)
        },
        test("TreatBytesAsJson deserializer - invalid JSON payload") {
            case class TestCase(payload: String)

            def runTestCase(testCase: TestCase, idx: Int): TestResult =
                val topicName = "topic-a"
                val message = MessageImpl.create[Array[Byte]](
                    new MessageMetadata(),
                    ByteBuffer.wrap(testCase.payload.getBytes("UTF-8")),
                    BytesSchema.of.asInstanceOf[Schema[Array[Byte]]],
                    topicName
                )

                val schemasByTopic: SchemasByTopic = Map.empty

                val label = s"case #$idx: payload=${testCase.payload}"
                val actual = converters.messageValueToJson(schemasByTopic, message, treatBytesAsJsonDeserializer)

                assertTrue(actual.isLeft) ?? s"$label -- expected Left, actual $actual"

            val testCases = List[TestCase](
                TestCase(""),
                TestCase("2z"),
                TestCase("undefined"),
                TestCase("""{a:2,"b":{"c":3}}"""),
                TestCase("""{"a":}""")
            )

            testCases.zipWithIndex.map { (testCase, idx) => runTestCase(testCase, idx) }.reduce(_ && _)
        }
    )
