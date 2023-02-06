package consumer

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import scala.jdk.CollectionConverters.*
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import org.apache.pulsar.client.api.{Message, Schema}
import org.apache.pulsar.client.api.schema.SchemaDefinition
import org.apache.pulsar.client.impl.{MessageImpl, TypedMessageBuilderImpl}
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
    StringSchema,
}
import _root_.schema.avro
import _root_.schema.protobufnative
import com.google.protobuf.Descriptors
import com.google.protobuf.descriptor.FileDescriptorProto
import org.apache.pulsar.client.impl.schema.generic.{GenericAvroReader, GenericAvroWriter, GenericProtobufNativeRecord, GenericProtobufNativeSchema}
import org.apache.pulsar.client.impl.schema.writer.AvroWriter
import org.apache.pulsar.client.impl.schema.util.SchemaUtil
import org.apache.pulsar.common.api.proto.MessageMetadata
import schema.protobufnative.FileEntry
import io.circe.parser.parse as parseJson

import java.nio.ByteBuffer
import java.nio.charset.StandardCharsets

object convertersTest extends ZIOSpecDefault:
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
            val avroPayload = avro.converters.fromJson(
                avroSchemaDefinition.getBytes,
                jsonToEncode.getBytes
            ) match
                case Right(value) => value
                case Left(error)  => throw error

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

            val decodedJson = converters.messageValueToJson(schemasByTopic, message) match
                case Right(value) => value
                case Left(err)    => throw err

            assertTrue(parseJson(decodedJson) == parseJson(jsonToEncode))
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

            val decodedJson = converters.messageValueToJson(schemasByTopic, message) match
                case Right(value) => value
                case Left(err)    => throw err

            assertTrue(parseJson(decodedJson) == parseJson(jsonToEncode))
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
            val protoSchemaDefinition = compiledFiles.files.get(protoFileName) match
                case Some(Right(file)) =>
                    file.schemas.get("User") match
                        case Some(schema) => schema.rawSchema
                        case _            => throw new Exception(s"Failed to compile PROTOBUF_NATIVE message")
                case _ => throw new Exception(s"Failed to compile PROTOBUF_NATIVE message")

            val schemaInfo = SchemaInfo.builder
                .`type`(SchemaType.PROTOBUF_NATIVE)
                .schema(protoSchemaDefinition)
                .build

            val protoSchema = Schema.getSchema(schemaInfo).asInstanceOf[Schema[Array[Byte]]]

            val jsonToEncode = """{"name":"Alyssa","favorite_number":256}"""
            val protoPayload = protobufnative.converters.fromJson(protoSchemaDefinition, jsonToEncode.getBytes) match
                case Right(value) => value
                case Left(error)  => throw error

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

            val decodedJson = converters.messageValueToJson(schemasByTopic, message) match
                case Right(value) => value
                case Left(err)    => throw err

            assertTrue(parseJson(decodedJson) == parseJson(jsonToEncode))
        },
        test("BOOLEAN to json") {
            case class TestCase(messagePayload: Array[Byte], expectedJson: String)

            def runTestCase(testCase: TestCase): Boolean =
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

                val json = converters.messageValueToJson(schemasByTopic, message) match
                    case Right(value) => value
                    case Left(err)    => throw err

                parseJson(json) == parseJson(testCase.expectedJson)

            val testCases = List[TestCase](
                TestCase(Array(0), "false"),
                TestCase(Array(1), "true")
            )

            assertTrue(testCases.forall(runTestCase))
        },
        test("INT8 to json") {
            case class TestCase(messagePayload: Array[Byte], expected: String)

            def runTestCase(testCase: TestCase): Boolean =
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

                val json = converters.messageValueToJson(schemasByTopic, message) match
                    case Right(value) => value
                    case Left(err)    => throw err

                parseJson(json) == parseJson(testCase.expected)

            val testCases = List[TestCase](
                TestCase(Array(0), "0"),
                TestCase(Array(1), "1"),
                TestCase(Array(15), "15"),
                TestCase(Array(127), "127"),
                TestCase(Array(-18), "-18")
            )

            assertTrue(testCases.forall(runTestCase))
        },
        test("INT16 to json") {
            case class TestCase(messagePayload: Array[Byte], expectedJson: String)

            def runTestCase(testCase: TestCase): Boolean =
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

                val json = converters.messageValueToJson(schemasByTopic, message) match
                    case Right(value) => value
                    case Left(err)    => throw err

                parseJson(json) == parseJson(testCase.expectedJson)

            val testCases = List[TestCase](
                TestCase(Array(0), "0"),
                TestCase(Array(0, 0), "0"),
                TestCase(Array(1), "1"),
                TestCase(Array(15), "15"),
                TestCase(Array(127), "127"),
                TestCase(Array(0xff, 0xee).map(_.toByte), "-18"),
                TestCase(Array(0x7f, 0xff).map(_.toByte), Short.MaxValue.toString)
            )

            assertTrue(testCases.forall(runTestCase))
        },
        test("INT32 to json") {
            case class TestCase(messagePayload: Array[Byte], expectedJson: String)

            def runTestCase(testCase: TestCase): Boolean =
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

                val json = converters.messageValueToJson(schemasByTopic, message) match
                    case Right(value) => value
                    case Left(err)    => throw err

                parseJson(json) == parseJson(testCase.expectedJson)

            val testCases = List[TestCase](
                TestCase(Array(0), "0"),
                TestCase(Array(0, 0), "0"),
                TestCase(Array(1), "1"),
                TestCase(Array(15), "15"),
                TestCase(Array(127), "127"),
                TestCase(Array(0xff, 0xff, 0xff, 0xee).map(_.toByte), "-18"),
                TestCase(Array(0x7f, 0xff, 0xff, 0xff).map(_.toByte), Int.MaxValue.toString)
            )

            assertTrue(testCases.forall(runTestCase))
        },
        test("INT64 to json") {
            case class TestCase(messagePayload: Array[Byte], expectedJson: String)

            def runTestCase(testCase: TestCase): Boolean =
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

                val json = converters.messageValueToJson(schemasByTopic, message) match
                    case Right(value) => value
                    case Left(err)    => throw err

                parseJson(json) == parseJson(testCase.expectedJson)

            val testCases = List[TestCase](
                TestCase(Array(0), "\"0\""),
                TestCase(Array(0, 0), "\"0\""),
                TestCase(Array(1), "\"1\""),
                TestCase(Array(15), "\"15\""),
                TestCase(Array(127), "\"127\""),
                TestCase(Array(0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xee).map(_.toByte), "\"-18\""),
                TestCase(Array(0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff).map(_.toByte), s""""${Long.MaxValue.toString}"""")
            )

            assertTrue(testCases.forall(runTestCase))
        },
        test("FLOAT to json") {
            case class TestCase(messagePayload: Array[Byte], expectedJson: String)

            def runTestCase(testCase: TestCase): Boolean =
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

                val json = converters.messageValueToJson(schemasByTopic, message) match
                    case Right(value) => value
                    case Left(err)    => throw err

                parseJson(json) == parseJson(testCase.expectedJson)

            val testCases = List[TestCase](
                TestCase(Array(0), "0.0"),
                TestCase(Array(0, 0), "0.0"),
                TestCase(Array(0x3f, 0x80, 0x00, 0x00).map(_.toByte), "1.0"),
                TestCase(Array(0x41, 0x70, 0x00, 0x00).map(_.toByte), "15.0"),
                TestCase(Array(0x42, 0xfe, 0x00, 0x00).map(_.toByte), "127.0"),
                TestCase(Array(0xc1, 0x90, 0x00, 0x00).map(_.toByte), "-18.0"),
                TestCase(Array(0xc6, 0xea, 0x60, 0x0f).map(_.toByte), "-30000.03")
            )

            assertTrue(testCases.forall(runTestCase))
        },
        test("DOUBLE to json") {
            case class TestCase(messagePayload: Array[Byte], expectedJson: String)

            def runTestCase(testCase: TestCase): Boolean =
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

                val json = converters.messageValueToJson(schemasByTopic, message) match
                    case Right(value) => value
                    case Left(err)    => throw err

                parseJson(json) == parseJson(testCase.expectedJson)

            val testCases = List[TestCase](
                TestCase(Array(0), "0.0"),
                TestCase(Array(0, 0), "0.0"),
                TestCase(Array(0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), "1.0"),
                TestCase(Array(0x40, 0x2e, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), "15.0"),
                TestCase(Array(0x40, 0x5f, 0xc0, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), "127.0"),
                TestCase(Array(0xc0, 0x32, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00).map(_.toByte), "-18.0"),
                TestCase(Array(0xc0, 0xdd, 0x4c, 0x01, 0xeb, 0x85, 0x1e, 0xb8).map(_.toByte), "-30000.03"),
            )

            assertTrue(testCases.forall(runTestCase))
        },
        test("STRING to json") {
            case class TestCase(messagePayload: Array[Byte], expectedJson: String)

            def runTestCase(testCase: TestCase): Boolean =
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

                val json = converters.messageValueToJson(schemasByTopic, message) match
                    case Right(value) => value
                    case Left(err)    => throw err

                parseJson(json) == parseJson(testCase.expectedJson)

            val testCases = List[TestCase](
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
        test("BYTES to json") {
            case class TestCase(bytes: Array[Byte], check: (result: Either[Throwable, String]) => Boolean)

            def runTestCase(testCase: TestCase): Boolean =
                val schemaInfo = SchemaInfo.builder
                    .`type`(SchemaType.BYTES)
                    .build

                val topicName = "topic-a"
                val schemaVersion = 1L;
                val messageMetadata = new MessageMetadata().setSchemaVersion(scala.math.BigInt(schemaVersion).toByteArray)
                val message = MessageImpl.create[Array[Byte]](
                    messageMetadata,
                    ByteBuffer.wrap(testCase.bytes),
                    BytesSchema.of(),
                    topicName
                )

                val schemasByVersion: SchemasByVersion = Map(schemaVersion -> schemaInfo)
                val schemasByTopic: SchemasByTopic = Map(topicName -> schemasByVersion)

                val json = converters.messageValueToJson(schemasByTopic, message)
                testCase.check(json)

            val testCases = List(
                TestCase("null".getBytes("UTF-8"), _ == Right("null")),
                TestCase("true".getBytes("UTF-8"), _ == Right("true")),
                TestCase("false".getBytes("UTF-8"), _ == Right("false")),
                TestCase("3".getBytes("UTF-8"), _ == Right("3")),
                TestCase("3.0".getBytes("UTF-8"), _ == Right("3.0")),
                TestCase("-3.0".getBytes("UTF-8"), _ == Right("-3.0")),
                TestCase("\"abc\"".getBytes("UTF-8"), _ == Right("\"abc\"")),
                TestCase("[]".getBytes("UTF-8"), _ == Right("[]")),
                TestCase("""[1,2,"a"]""".getBytes("UTF-8"), _ == Right("""[1,2,"a"]""")),
                TestCase("{}".getBytes("UTF-8"), _ == Right("{}")),
                TestCase("""{"a":2,"b":{"c":3}}""".getBytes("UTF-8"), _ == Right("""{"a":2,"b":{"c":3}}""")),

                TestCase("".getBytes("UTF-8"), _.isLeft),
                TestCase("""2z""".getBytes("UTF-8"), _.isLeft),
                TestCase("""undefined""".getBytes("UTF-8"), _.isLeft),
                TestCase("""{a:2,"b":{"c":3}}""".getBytes("UTF-8"), _.isLeft),
            )

            assertTrue(testCases.forall(runTestCase))
        },
        test("NONE to json") {
            case class TestCase(bytes: Array[Byte], check: (result: Either[Throwable, String]) => Boolean)

            def runTestCase(testCase: TestCase): Boolean =
                val schemaInfo = SchemaInfo.builder
                    .`type`(SchemaType.NONE)
                    .build

                val topicName = "topic-a"
                val schemaVersion = 1L;
                val messageMetadata = new MessageMetadata().setSchemaVersion(scala.math.BigInt(schemaVersion).toByteArray)
                val message = MessageImpl.create[Array[Byte]](
                    messageMetadata,
                    ByteBuffer.wrap(testCase.bytes),
                    null,
                    topicName
                )

                val schemasByVersion: SchemasByVersion = Map(schemaVersion -> schemaInfo)
                val schemasByTopic: SchemasByTopic = Map(topicName -> schemasByVersion)

                val json = converters.messageValueToJson(schemasByTopic, message)
                testCase.check(json)

            val testCases = List(
                TestCase("null".getBytes("UTF-8"), _ == Right("null")),
                TestCase("true".getBytes("UTF-8"), _ == Right("true")),
                TestCase("false".getBytes("UTF-8"), _ == Right("false")),
                TestCase("3".getBytes("UTF-8"), _ == Right("3")),
                TestCase("3.0".getBytes("UTF-8"), _ == Right("3.0")),
                TestCase("-3.0".getBytes("UTF-8"), _ == Right("-3.0")),
                TestCase("\"abc\"".getBytes("UTF-8"), _ == Right("\"abc\"")),
                TestCase("[]".getBytes("UTF-8"), _ == Right("[]")),
                TestCase("""[1,2,"a"]""".getBytes("UTF-8"), _ == Right("""[1,2,"a"]""")),
                TestCase("{}".getBytes("UTF-8"), _ == Right("{}")),
                TestCase("""{"a":2,"b":{"c":3}}""".getBytes("UTF-8"), _ == Right("""{"a":2,"b":{"c":3}}""")),

                TestCase("".getBytes("UTF-8"), _.isLeft),
                TestCase("""2z""".getBytes("UTF-8"), _.isLeft),
                TestCase("""undefined""".getBytes("UTF-8"), _.isLeft),
                TestCase("""{a:2,"b":{"c":3}}""".getBytes("UTF-8"), _.isLeft),
            )

            assertTrue(testCases.forall(runTestCase))
        }
    )
