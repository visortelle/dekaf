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

            // Every arm must FAIL the test rather than throw MatchError, and both conditions must
            // be in ONE assertTrue - a second `assertTrue` statement is evaluated and discarded,
            // so the rawSchema check used to be dead.
            compiledFiles.files.getOrElse(relativePath, Left("No such file")) match
                case Left(err) => assertNever(s"compilation failed for $relativePath: $err")
                case Right(file) =>
                    file.schemas.get("Person") match
                        case None => assertNever(s"no 'Person' schema; got: ${file.schemas.keys.mkString(", ")}")
                        case Some(schema) =>
                            assertTrue(
                                !schema.rawSchema.isEmpty,
                                schema.humanReadableSchema.contains("Person"),
                                schema.humanReadableSchema.contains("person_name"),
                                schema.humanReadableSchema.contains("person_age")
                            )
        },
        test("reports a compilation error for a malformed proto file") {
            val relativePath = "bad/file"
            val compiledFiles = compiler.compileFiles(Seq(FileEntry(relativePath, "this is not a proto file")))

            assertTrue(compiledFiles.files.get(relativePath).exists(_.isLeft))
        },
        test("a message absent from the file does not resolve") {
            val relativePath = "a/b/c"
            val fileEntryContent =
                """syntax = "proto3";
                  |
                  |message Person {
                  |  string person_name = 1;
                  |}
                  |""".stripMargin
            val compiledFiles = compiler.compileFiles(Seq(FileEntry(relativePath, fileEntryContent)))

            compiledFiles.files.getOrElse(relativePath, Left("No such file")) match
                case Left(err)   => assertNever(s"compilation failed: $err")
                case Right(file) => assertTrue(file.schemas.get("Absent").isEmpty)
        }
    )
