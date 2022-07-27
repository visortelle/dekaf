package schema

import com.google.protobuf.DescriptorProtos.FileDescriptorProto
import com.google.protobuf.Descriptors
import com.google.protobuf.Descriptors.FileDescriptor

import scala.reflect.ClassTag


// Recursively build file descriptor and all it's dependencies.
private def buildFileDescriptor(currentFileProto: FileDescriptorProto, fileProtoCache: Map[String, FileDescriptorProto]): FileDescriptor = {
    val dependencyFileDescriptorList: collection.mutable.ArrayBuffer[FileDescriptor] = collection.mutable.ArrayBuffer.empty
    currentFileProto.getDependencyList.forEach { (dependencyStr: String) =>
        def helper(dependencyStr: String) = {
            val dependencyFileProto = fileProtoCache.get(dependencyStr)
            dependencyFileProto match
                case Some(v) =>
                    val dependencyFileDescriptor = buildFileDescriptor(v, fileProtoCache)
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

def arrayBufferToJavaArray[A: ClassTag](list: collection.mutable.ArrayBuffer[A]) = {
    val arr = new Array[A](list.size)
    for (i <- 0 until list.size)
        arr(i) = list(i)
    arr
}
