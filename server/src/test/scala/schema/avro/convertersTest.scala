package schema.avro

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*
import io.circe.parser.parse as parseJson

object convertersTest extends ZIOSpecDefault {
    def spec = suite(this.getClass.toString)(
        test("converts AVRO data to JSON and vice-versa") {
            val schema = """
                |{
                |    "type": "record",
                |    "name": "User",
                |    "fields": [
                |        {"name": "name", "type": "string"},
                |        {"name": "age",  "type": "int"},
                |        {"name": "height",  "type": "long"}
                |    ]
                |}
             """.stripMargin

            val jsonInput = """{"name":"John","age":30,"height":180}"""

            val avroResult = converters.fromJson(schema.getBytes, jsonInput.getBytes) match
                case Left(err) => throw new Exception(err)
                case Right(result) => result

            val reverseConversionResult = converters.toJson(schema.getBytes, avroResult) match
                case Left(err)     => throw new Exception(err)
                case Right(result) => String(result)

            assertTrue(parseJson(jsonInput) == parseJson(reverseConversionResult))
        }
    )
}
