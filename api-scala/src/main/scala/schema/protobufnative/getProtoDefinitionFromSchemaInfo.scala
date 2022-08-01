//package schema.protobufnative
//
//import com.google.protobuf.DescriptorProtos.FileDescriptorProto
//import com.google.protobuf.Descriptors
//import com.google.protobuf.Descriptors.FileDescriptor
//
//import java.io.FileInputStream
//import java.nio.file.Paths
//import scala.sys.process.*
//import scala.jdk.CollectionConverters.*
//import org.apache.pulsar.client.impl.schema.ProtobufNativeSchemaUtils
//import com.google.protobuf.Descriptors.DescriptorValidationException
//import com.google.protobuf.DescriptorProtos.FileDescriptorSet
//import org.apache.pulsar.client.impl
//import org.apache.pulsar.common.protocol.schema.ProtobufNativeSchemaData
//import org.apache.pulsar.common.schema.SchemaInfo
//
//import scala.reflect.ClassTag
//import java.io.OutputStream
//import java.io.PrintStream
//
//def getProtoDefinitionFromSchemaInfo(schemaInfo: SchemaInfo): String =
//    val b = ProtobufNativeSchemaUtils.deserialize(schemaInfo.getSchema)
//    val c = b.toProto.getAllFields()
//    val d = c.asScala.map(f => f._1.getName)
    // d.get
//    c.get(0).toProto.getFi
//    val set = FileDescriptorSet.parseFrom(b)


    // "c"
