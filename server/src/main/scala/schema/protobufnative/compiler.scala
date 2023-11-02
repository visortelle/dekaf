package schema.protobufnative

import _root_.config.readConfigAsync
import com.google.protobuf.DescriptorProtos.{FileDescriptorProto, FileDescriptorSet}
import com.google.protobuf.Descriptors
import com.google.protobuf.Descriptors.{FieldDescriptor, FileDescriptor}
import com.typesafe.scalalogging.Logger
import io.circe.*
import io.circe.generic.auto.*
import io.circe.parser.*
import org.apache.pulsar.client.impl
import org.apache.pulsar.client.impl.schema.ProtobufNativeSchemaUtils

import java.lang
import java.util.Base64
import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}
import scala.jdk.CollectionConverters.*
import scala.reflect.ClassTag
import scala.sys.process.*

type RelativePath = String
type JsonSchema = String

case class FileEntry(relativePath: RelativePath, content: String)

case class Schema(rawSchema: Array[Byte], humanReadableSchema: String)

type MessageName = String
case class CompiledFile(schemas: Map[MessageName, Schema])

case class CompiledFiles(files: Map[RelativePath, Either[Throwable, CompiledFile]])

case class ProtoSchema(fileDescriptorSet: String, rootMessageTypeName: String, rootFileDescriptorName: String)

object compiler:
    val config = Await.result(readConfigAsync, Duration(10, SECONDS))
    val logger: Logger = Logger(this.getClass.toString)

    def compileFiles(files: Seq[FileEntry]): CompiledFiles =
        // Write protobuf files to temp dir
        val tempDir = os.temp.dir(null, "__dekaf-protobuf-native_")
        logger.info(s"Compiling PROTOBUF_NATIVE schema files. Temp dir: $tempDir")

        val srcDir = tempDir / "src"
        os.makeDir(srcDir)

        val depsDir: os.Path = os.Path(config.dataDir.get + "/proto", os.pwd)

        files.foreach(f =>
            val path = srcDir / os.PathChunk.SeqPathChunk(f.relativePath.split("/"))
            os.write(path, f.content, null, true)
        )

        // Compile each file
        val compiledFiles: Map[RelativePath, Either[Throwable, CompiledFile]] = files.map(f => compileFile(f, srcDir, depsDir)).toMap

        CompiledFiles(files = compiledFiles)

    // Recursively build file descriptor and all it's dependencies.
    private def buildProtobufNativeFilesDescriptor(
        currentFileProto: FileDescriptorProto,
        fileProtoCache: Map[String, FileDescriptorProto]
    ): FileDescriptor = {
        val dependencyFileDescriptorList: collection.mutable.ArrayBuffer[FileDescriptor] = collection.mutable.ArrayBuffer.empty

        currentFileProto.getDependencyList.forEach { (dependencyStr: String) =>
            def helper(dependencyStr: String) = {
                val dependencyFileProto = fileProtoCache.get(dependencyStr)
                dependencyFileProto match
                    case Some(v) =>
                        val dependencyFileDescriptor = buildProtobufNativeFilesDescriptor(v, fileProtoCache)
                        dependencyFileDescriptorList.addOne(dependencyFileDescriptor)
                    case _ => ()
            }

            helper(dependencyStr)
        }

        val dependencies = arrayBufferToJavaArray(dependencyFileDescriptorList)

        try FileDescriptor.buildFrom(currentFileProto, dependencies)
        catch {
            case err =>
                throw new IllegalStateException("FileDescriptor build failed.", err)
        }
    }

    private def compileFile(f: FileEntry, srcDir: os.Path, depsDir: os.Path): (String, Either[Throwable, CompiledFile]) =
        val inputFile = srcDir / os.PathChunk.SeqPathChunk(f.relativePath.split("/"))
        val descriptorSetOut = srcDir / os.PathChunk.SeqPathChunk((f.relativePath + ".pb").split("/"))
        val protocLogFile = srcDir / s"${f.relativePath.replace(java.io.File.separator, "--")}-protoc.log"
        val protocCommand =
            s"protoc --include_imports --descriptor_set_out=$descriptorSetOut -I $srcDir -I $depsDir $inputFile &> $protocLogFile"

        val protocProcess = Seq("sh", "-c", s"set -ue; $protocCommand").run

        if protocProcess.exitValue != 0 then
            val compilationError = os.read(protocLogFile)
            return (f.relativePath, Left(new Exception(s"Failed to compile $inputFile.\nError: $compilationError")))

        val descriptorSetOutContent = os.read.inputStream(descriptorSetOut)
        val descriptorSet = FileDescriptorSet.parseFrom(descriptorSetOutContent)

        val currentProtoFile = descriptorSet.getFileList.asScala.find(fi => fi.getName == f.relativePath).get
        val fileProtoCache = descriptorSet.getFileList.asScala.map(f => (f.getName, f)).toMap
        val fileDescriptor = buildProtobufNativeFilesDescriptor(currentProtoFile, fileProtoCache)
        val messageNames = fileDescriptor.getMessageTypes.asScala.map(t => t.getName).toSeq

        val schemas: Map[MessageName, Schema] = messageNames
            .map(m =>
                val messageDescriptor = fileDescriptor.findMessageTypeByName(m)
                val rawSchema = ProtobufNativeSchemaUtils.serialize(messageDescriptor)
                val humanReadableSchema = messageDescriptor.toProto.toString
                val schema = Schema(rawSchema, humanReadableSchema)
                (m, schema)
            )
            .toMap

        (f.relativePath, Right(CompiledFile(schemas = schemas)))

    private def arrayBufferToJavaArray[A: ClassTag](list: collection.mutable.ArrayBuffer[A]) =
        val arr = new Array[A](list.size)
        for (i <- list.indices)
            arr(i) = list(i)
        arr

    def compileProtobufNativeToJsonSchema(schema: Array[Byte]): Either[Throwable, JsonSchema] =
        val tempDir = os.temp.dir(null, "__dekaf-protobuf-native-json-schema_")
        logger.info(s"Compiling PROTOBUF_NATIVE to JSON_SCHEMA schema. Temp dir: $tempDir")
        val depsDir: os.Path = os.Path(config.dataDir.get + "/proto", os.pwd)

        val jsonDescriptorString = schema.map(_.toChar).mkString

        val decodedJson = decode[ProtoSchema](jsonDescriptorString) match
            case Left(err) => return Left(err)
            case Right(v)  => v

        val fileDescriptorSetBytes = Base64.getDecoder.decode(decodedJson.fileDescriptorSet)
        val fileDescriptorSet = FileDescriptorSet.parseFrom(fileDescriptorSetBytes)
        val fileDescriptor = FileDescriptor.buildFrom(fileDescriptorSet.getFile(0), Array.empty)
        val descriptorName = fileDescriptorSet.getFile(0).getMessageTypeList.get(0).getName

        val schemaData = ProtoDescriptorConverter.getProtoSchemaFromDescriptor(fileDescriptor)

        val protobufJsonSchemaCompilerFile = os.Path(config.dataDir.get + "/compilers", os.pwd) / "protoc-gen-jsonschema"
        val inputFile = tempDir / "schema.proto"
        val outputFile = tempDir / (descriptorName + ".json")
        val protocLogFile = tempDir / "protoc.log"

        os.write(inputFile, schemaData, null, true)

        val protocCommand =
            s"""protoc \\
                   --plugin=$protobufJsonSchemaCompilerFile \\
                   --jsonschema_opt=disallow_additional_properties \\
                   --jsonschema_opt=enforce_oneof \\
                   --jsonschema_opt=all_fields_required \\
                   --jsonschema_opt=json_fieldnames \\
                   --jsonschema_opt=file_extension=json \\
                   -I $tempDir -I $depsDir \\
                   --jsonschema_out=$tempDir \\
                   $inputFile &> $protocLogFile
               """

        val protocProcess = Seq("sh", "-c", s"set -ue; $protocCommand").run

        if protocProcess.exitValue != 0 then
            val compilationError = os.read(protocLogFile)
            return Left(Exception(s"Failed to compile $inputFile.\nError: $compilationError"))

        Right(os.read(outputFile))
