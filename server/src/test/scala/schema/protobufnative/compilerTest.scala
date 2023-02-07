package schema.protobufnative

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*
import scala.jdk.CollectionConverters.*
import org.apache.pulsar.client.impl.schema.ProtobufNativeSchemaUtils

object compilerTest extends ZIOSpecDefault:
    def spec = suite(this.getClass.toString)(
        test("compiles protobuf files") {
            val fileEntryContent =
                """syntax = "proto3";
                  |
                  |message Person {
                  |  string person_name = 1;
                  |  int32 person_age = 2;
                  |}
                  |""".stripMargin

            val relativePath = "a/b/c"
            val fileEntry = FileEntry(relativePath, fileEntryContent)
            val compiledFiles = compiler.compileFiles(Seq(fileEntry))

            val file = compiledFiles.files.getOrElse(relativePath, Left("No such file")) match
                case Right(f) => f
            file.schemas.get("Person") match
                case Some(schema) =>
                    assertTrue(!schema.rawSchema.isEmpty)
                    assertTrue(schema.humanReadableSchema.contains("Person"))
        }
    )
