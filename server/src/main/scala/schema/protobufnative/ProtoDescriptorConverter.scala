package schema.protobufnative

import com.google.protobuf.Descriptors.FieldDescriptor.JavaType
import com.google.protobuf.Descriptors.*

import scala.collection.mutable.StringBuilder
import scala.jdk.CollectionConverters.*

object ProtoDescriptorConverter:
    def getProtoSchemaFromDescriptor(fileDescriptor: FileDescriptor): String =
        val protoDefinition = ProtoDefinition(pb = fileDescriptor)
        protoDefinition.writeFileDescriptor()

        protoDefinition.builder.result()


    //https://github.com/arkadiyt/protodump/blob/main/pkg/protodump/proto.go translated to scala
    private class ProtoDefinition(
        var builder: StringBuilder = StringBuilder(),
        var indentation: Int = 0,
        var pb: FileDescriptor
    ):
        private def indent(): Unit =
            indentation += 1

        private def dedent(): Unit =
            indentation -= 1

        private def write(s: String): Unit =
            builder ++= s

        private def writeIndented(s: String): Unit =
            builder ++= "  " * indentation
            write(s)

        override def toString: String =
            builder.toString

        private def writeMethod(method: MethodDescriptor): Unit =
            writeIndented(s"rpc ${method.getName} (")
            if (method.toProto.getClientStreaming)
                write("stream ")
            write(s".${method.getInputType.getFullName}) returns (")
            if (method.toProto.getServerStreaming)
                write("stream ")
            write(s".${method.getOutputType.getFullName}) {}\n")

        private def writeService(service: ServiceDescriptor): Unit =
            write(s"service ${service.getName} {\n")
            indent()

            for (method <- service.getMethods.asScala)
                writeMethod(method)

            dedent()
            writeIndented("}\n\n")

        def writeType(field: FieldDescriptor): Unit =
            field.getType match
                case FieldDescriptor.Type.MESSAGE => write(s".${field.getMessageType.getFullName}")
                case FieldDescriptor.Type.ENUM => write(s".${field.getEnumType.getFullName}")
                case FieldDescriptor.Type.GROUP => write("group")
                case _ => write(field.getType.name().toLowerCase)

        private def writeOneof(oneof: OneofDescriptor): Unit =
            writeIndented(s"oneof ${oneof.getName} {\n")
            indent()

            for (field <- oneof.getFields.asScala)
                writeField(field)

            dedent()
            writeIndented("}\n")

        private def writeField(field: FieldDescriptor): Unit =
            writeIndented("")

            val label = field.toProto.getLabel.name().toLowerCase.split("label_", 2).toSeq.last
            if (pb.getSyntax == FileDescriptor.Syntax.PROTO3 && label == "optional")
                write("")
            else
                write(s"$label ")

            val typeName = field.getType match
                case FieldDescriptor.Type.MESSAGE | FieldDescriptor.Type.ENUM | FieldDescriptor.Type.GROUP =>
                    s"${field.toProto.getTypeName.split("\\.").last}"
                case _ => field.getType.name().toLowerCase
            write(s"$typeName ")

            write(s"${field.getName} = ${field.getNumber}")

            if (field.hasDefaultValue) then
                write(" [default = ")
                field.getJavaType match
                    case JavaType.STRING => write(s"""\"${field.getDefaultValue.asInstanceOf[String]}\"""")
                    case JavaType.ENUM => write(s"${field.getDefaultValue.asInstanceOf[EnumValueDescriptor].getName}")
                    case _ => write(s"${field.getDefaultValue}")
                write("]")
            write(";\n")


        private def writeEnum(enumDescriptor: EnumDescriptor): Unit =
            writeIndented(s"enum ${enumDescriptor.getName} {\n")
            indent()

            for (value <- enumDescriptor.getValues.asScala)
                writeIndented(s"${value.getName} = ${value.getNumber};\n")

            dedent()
            writeIndented("}\n\n")

        private def writeMessage(message: Descriptor): Unit =
            writeIndented(s"message ${message.getName} {\n")
            indent()

            val reservedFields = message.getFields.asScala.filter(f => message.isReservedName(f.getName)).map(_.getName).toSeq
            for (name <- reservedFields)
                writeIndented(s"""reserved "$name";\n""")

            /*            // Reserved ranges
                        for (range <- message.getFields.get(0).asScala)
                            writeIndented("reserved ")
                            val start = range.start
                            val end = range.end - 1 // Note: Adjust based on how your protobuf library defines ranges
                            write(s"$start to $end;\n")*/

            for (nestedMessage <- message.getNestedTypes.asScala)
                writeMessage(nestedMessage)

            for (enumerable <- message.getEnumTypes.asScala)
                writeEnum(enumerable)

            for (field <- message.getFields.asScala if field.getContainingOneof == null)
                writeField(field)

            for (oneof <- message.getOneofs.asScala)
                writeOneof(oneof)

            dedent()
            writeIndented("}\n\n")

        private def writeImport(fileImport: FileDescriptor): Unit =
            write("import ")
            if (fileImport.getPublicDependencies.contains(fileImport))
                write("public ")
            write(s""""${fileImport.getName}";\n""")

        private def writeStringFileOptions(name: String, value: String): Unit =
            builder ++= s"option $name = \"${value.replace("\\", "\\\\")}\";\n"

        private def writeBoolFileOptions(name: String, value: Boolean): Unit =
            builder ++= s"option $name = $value;\n"

        private def writeFileOptions(): Unit =
            val optionDefinitions = Seq(
                ("java_package", "JavaPackage"),
                ("java_package", "JavaPackage"),
                ("java_outer_classname", "JavaOuterClassname"),
                ("java_multiple_files", "JavaMultipleFiles"),
                ("java_string_check_utf8", "JavaStringCheckUtf8"),
                // TODO OptimizeMode: https://github.com/protocolbuffers/protobuf/blob/main/src/google/protobuf/descriptor.proto#L384
                ("go_package", "GoPackage"),
                // TODO generic services: https://github.com/protocolbuffers/protobuf/blob/main/src/google/protobuf/descriptor.proto#L403
                // TODO deprecated: https://github.com/protocolbuffers/protobuf/blob/main/src/google/protobuf/descriptor.proto#L412
                ("cc_enable_arenas", "CcEnableArenas"),
                ("objc_class_prefix", "ObjcClassPrefix"),
                ("csharp_namespace", "CsharpNamespace"),
                ("swift_prefix", "SwiftPrefix"),
                ("php_class_prefix", "PhpClassPrefix"),
                ("php_namespace", "PhpNamespace"),
                ("php_metadata_namespace", "PhpMetadataNamespace"),
                ("ruby_package", "RubyPackage"),
            )

            val options = Option(pb.getOptions).getOrElse(return)

            optionDefinitions.foreach { case (optionName, methodName) =>
                try
                    val method = options.getClass.getDeclaredMethod(methodName)
                    method.setAccessible(true)
                    val returnValue = method.invoke(options)
                    returnValue match
                        case s: String => writeStringFileOptions(optionName, s)
                        case b: java.lang.Boolean => writeBoolFileOptions(optionName, b.booleanValue())
                        case _ => ()
                catch
                    case e: NoSuchMethodException => // The option is not set, so we ignore it
                    case e: Exception => e.printStackTrace() // Handle other exceptions
            }

            if (builder.nonEmpty) builder.append("\n")

        def writeFileDescriptor(): Unit =
            write(s"""syntax = "${pb.getSyntax.name().toLowerCase}";\n\n""")

            val packageName = pb.getPackage
            if (packageName.nonEmpty)
                write(s"package $packageName;\n\n")
            else
                write(s"package samples;\n\n")

            writeFileOptions()

            pb.getDependencies.asScala.foreach { fileImport =>
                writeImport(fileImport)
            }

            if (!pb.getDependencies.isEmpty)
                write("\n")

            pb.getServices.asScala.foreach { service =>
                writeService(service)
            }

            pb.getMessageTypes.asScala.foreach { message =>
                writeMessage(message)
            }

            pb.getEnumTypes.asScala.foreach { enumeration =>
                writeEnum(enumeration)
            }
