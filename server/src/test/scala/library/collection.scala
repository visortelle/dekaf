package library

import scala.jdk.CollectionConverters.*
import org.apache.pulsar.client.impl.schema.ProtobufNativeSchemaUtils

class Collection extends munit.FunSuite:

    test("create") {
        // Creating object
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

        // Using imported function
        val compiledFiles = compileFiles(Seq(fileEntry))


        val file = compiledFiles.files.getOrElse(relativePath, Left("No such file")) match
            case Right(f) => f
        file.schemas.get("Person") match
            case Some(schema) =>
                assert(!schema.rawSchema.isEmpty)
                assert(schema.humanReadableSchema.contains("Person"))
    }
