package schema.protobufnative

import com.google.protobuf.DynamicMessage
import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*
import org.apache.pulsar.client.impl.schema.ProtobufNativeSchemaUtils
import io.circe.parser.parse as parseJson

object convertersTest extends ZIOSpecDefault {
    def spec = suite(this.getClass.toString)(
        test("converts PROTOBUF_NATIVE data to JSON and vice-versa") {
            val protoFileContent = """
                |syntax = "proto3";
                |
                |message Occupation {
                |  string person_company = 1;
                |  string person_position = 2;
                |  int32 person_salary = 3;
                |}
                |
                |message Person {
                |  string name = 1;
                |  int32 age = 2;
                |
                |  // https://github.com/protocolbuffers/protobuf/issues/5015
                |  int64 height = 3;
                |
                |  Occupation person_occupation = 4;
                |}
             """.stripMargin

            val relativePath = "a"
            val fileEntry = FileEntry(relativePath, protoFileContent)
            val compiledFiles = compiler.compileFiles(Seq(fileEntry))

            val file = compiledFiles.files.getOrElse(relativePath, Left("No such file")) match
                case Right(f)             => f
                case Left(err: Throwable) => throw err

            val rawSchema = file.schemas.get("Person") match
                case Some(schema) => schema.rawSchema
                case None         => throw new Exception("No such schema")

            val jsonInput =
                """
                  |{
                  |  "name": "John",
                  |  "age": 30,
                  |  "height": "180",
                  |  "person_occupation": {
                  |    "person_company": "Teal Tools",
                  |    "person_position": "Software Engineer",
                  |    "person_salary": 100
                  |  }
                  |}
                  |""".stripMargin

            val protoResult = converters.fromJson(rawSchema, jsonInput.getBytes) match
                case Left(err)     => throw new Exception(err)
                case Right(result) => result

            val reverseConversionResult = converters.toJson(rawSchema, protoResult) match
                case Left(err)     => throw new Exception(err)
                case Right(result) => String(result)

            assertTrue(parseJson(jsonInput) == parseJson(reverseConversionResult))
        }
    )
}
