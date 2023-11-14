package schema

import com.fasterxml.jackson.databind.ObjectMapper
import com.typesafe.scalalogging.Logger
import config.readConfigAsync
import net.jimblackler.jsongenerator.{DefaultConfig, Generator}
import net.jimblackler.jsonschemafriend.{Schema, SchemaStore}

import java.util.Random
import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}
import scala.sys.process.*

object utils:
    type JsonSchema = String

    val config = Await.result(readConfigAsync, Duration(10, SECONDS))
    val logger: Logger = Logger(this.getClass.toString)

    def generateSampleJsonByAvroSchema(schema: Array[Byte]): Either[Throwable, String] =
        try
            val tempDir = os.temp.dir(null, "__dekaf-avro-sample-json_")
            logger.info(s"Generating sample json from Avro schema. Temp dir: $tempDir")

            val avroSchema = schema.map(_.toChar).mkString

            val avroRandomGeneratorJarFile = os.Path(config.dataDir.get + "/executables/jars", os.pwd) / "arg.jar"
            val avroSchemaFile = tempDir / "schema.avro"
            val outputFile = tempDir / "sample.json"

            os.write(avroSchemaFile, avroSchema, null, true)

            val generateJsonSampleCommand =
                s"""java \\
                    -jar "$avroRandomGeneratorJarFile" \\
                    --pretty \\
                    --schema-file $avroSchemaFile \\
                    --output $outputFile
                """.stripMargin

            val generateJsonSampleProcess = Seq("sh", "-c", s"set -ue; $generateJsonSampleCommand").run

            if generateJsonSampleProcess.exitValue == 0 then
                Right(os.read(outputFile))
            else
                Left(Exception(s"Failed to generate sample json from Avro schema."))
        catch
            case err: Throwable => Left(err)

    def generateSampleJsonByJsonSchema(jsonSchema: JsonSchema): Either[Throwable, String] =
        try
            val config = DefaultConfig.build
                .setPedanticTypes(false)
                .setGenerateNulls(false)
                .setGenerateMinimal(false)
                .setGenerateAdditionalProperties(false)
                .setNonRequiredPropertyChance(0.6f)
                .get
            val schemaStore = SchemaStore(true)
            val schema: Schema = schemaStore.loadSchemaJson(jsonSchema)
            val generator: Generator = Generator(config, schemaStore, Random())

            val jsonObject: Object = generator.generate(schema, 16)

            val objectMapper = ObjectMapper()
            val jsonString = objectMapper.writeValueAsString(jsonObject)

            Right(jsonString)
        catch
            case err: Throwable => Left(err)
