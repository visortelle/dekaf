package schema.protobufnative

import com.google.protobuf.DescriptorProtos.FileDescriptorProto
import com.google.protobuf.Descriptors
import com.google.protobuf.Descriptors.FileDescriptor

import java.io.FileInputStream
import java.nio.file.Paths
import scala.sys.process.*
import scala.jdk.CollectionConverters.*
import org.apache.pulsar.client.impl.schema.ProtobufNativeSchemaUtils
import com.google.protobuf.Descriptors.DescriptorValidationException
import com.google.protobuf.DescriptorProtos.FileDescriptorSet
import com.typesafe.scalalogging.Logger
import org.apache.pulsar.client.impl
import org.apache.pulsar.common.protocol.schema.ProtobufNativeSchemaData
import _root_.client.config

import scala.reflect.ClassTag
import java.io.OutputStream
import java.io.PrintStream

type RelativePath = String
case class FileEntry(relativePath: RelativePath, content: String)

case class Schema(rawSchema: Array[Byte], humanReadableSchema: String)

type MessageName = String
case class CompiledFile(schemas: Map[MessageName, Schema])

case class CompiledFiles(files: Map[RelativePath, Either[Throwable, CompiledFile]])

object compiler:
    val logger: Logger = Logger(this.getClass.toString)

    def compileFiles(files: Seq[FileEntry]): CompiledFiles =
        // Write protobuf files to temp dir
        val tempDir = os.temp.dir(null, "__xray-protobuf-native_")
        logger.info(s"Compiling PROTOBUF_NATIVE schema files. Temp dir: $tempDir")

        val srcDir = tempDir / "src"
        os.makeDir(srcDir)

        val depsDir: os.Path = os.Path(config.schema.protobufNativeDepsDir, os.root)

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

        val protocProcess = Seq("sh", "-c", s"set -e; $protocCommand").run

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
