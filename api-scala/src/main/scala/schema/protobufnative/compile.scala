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
import org.apache.pulsar.client.impl
import org.apache.pulsar.common.protocol.schema.ProtobufNativeSchemaData

import scala.reflect.ClassTag
import java.io.OutputStream
import java.io.PrintStream

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
        case e: Descriptors.DescriptorValidationException =>
            throw new IllegalStateException("FileDescriptor build failed.", e)
    }
}

type RelativePath = String
case class FileEntry(relativePath: RelativePath, content: String)

case class Schema(rawSchema: Array[Byte], humanReadableSchema: String)

type MessageName = String
case class CompiledFile(schemas: Map[MessageName, Schema])

case class CompiledFiles(files: Map[RelativePath, Either[String, CompiledFile]])

def compileFiles(files: Seq[FileEntry]): CompiledFiles =
    // Write protobuf files to temp dir
    val tempDir = os.temp.dir(null, "__xray-protobuf-native_")
    files.map(f =>
        val path = tempDir / os.PathChunk.SeqPathChunk(f.relativePath.split("/"))
        os.write(path, f.content, null, true)
    )

    // Compile each file
    val compiledFiles: Map[RelativePath, Either[String, CompiledFile]] = files.map(f => compileFile(f, tempDir)).toMap

    CompiledFiles(files = compiledFiles)

private def compileFile(f: FileEntry, tempDir: os.Path): (String, Either[String, CompiledFile]) =
    val inputFile = tempDir / os.PathChunk.SeqPathChunk(f.relativePath.split("/"))
        val descriptorSetOut = tempDir / os.PathChunk.SeqPathChunk((f.relativePath + ".pb").split("/"))
        val protocLogFile = tempDir / s"${f.relativePath.replace(java.io.File.separator, "--")}-protoc.log"
        val protocCommand = s"protoc --descriptor_set_out=$descriptorSetOut -I $tempDir $inputFile &> $protocLogFile"

        val protocProcess = Seq("sh", "-c", s"set -e; $protocCommand").run

        if (protocProcess.exitValue != 0) {
            val compilationError = os.read(protocLogFile)
            return (f.relativePath, Left(s"Failed to compile $inputFile.\nError: $compilationError"))
        }

        val descriptorSetOutContent = os.read.inputStream(descriptorSetOut)
        val descriptorSet = FileDescriptorSet.parseFrom(descriptorSetOutContent)
        val fileDescriptor = buildProtobufNativeFilesDescriptor(descriptorSet.getFile(0), Map.empty)
        val messageNames = fileDescriptor.getMessageTypes.asScala.map(t => t.getName).toSeq

        val schemas: Map[MessageName, Schema] = messageNames.map(m =>
            val messageDescriptor = fileDescriptor.findMessageTypeByName(m)
            val rawSchema = ProtobufNativeSchemaUtils.serialize(messageDescriptor)
            val humanReadableSchema = messageDescriptor.toProto.toString
            val schema = Schema(rawSchema, humanReadableSchema)
            (m, schema)
        ).toMap

        (f.relativePath, Right(CompiledFile(schemas = schemas)))

private def arrayBufferToJavaArray[A: ClassTag](list: collection.mutable.ArrayBuffer[A]) =
    val arr = new Array[A](list.size)
    for (i <- 0 until list.size)
        arr(i) = list(i)
    arr
