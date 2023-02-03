package conversions

import java.nio.charset.StandardCharsets
import java.nio.{ByteBuffer, ByteOrder}

object primitiveConv:
    def eqFloat(x: Double, y: Double, precision: Double): Boolean = (x - y).abs < precision
    
    def bytesToInt8(bytes: Array[Byte]): Either[Throwable, Byte] =
        if bytes.length == 1
        then Right(bytes.head)
        else Left(new Exception(s"Invalid byte array length ${bytes.length}}"))

    def bytesToInt16(bytes: Array[Byte]): Either[Throwable, Short] =
        createByteBuf(bytes, 2).map(_.getShort)

    def bytesToInt32(bytes: Array[Byte]): Either[Throwable, Int] =
        createByteBuf(bytes, 4).map(_.getInt)

    def bytesToInt64(bytes: Array[Byte]): Either[Throwable, Long] =
        createByteBuf(bytes, 8).map(_.getLong)

    def bytesToFloat32(bytes: Array[Byte]): Either[Throwable, Float] =
        createByteBuf(bytes, 4).map(_.getFloat)

    def bytesToFloat64(bytes: Array[Byte]): Either[Throwable, Double] =
        createByteBuf(bytes, 8).map(_.getDouble)

    def bytesToString(bytes: Array[Byte]): String = String(bytes, StandardCharsets.UTF_8)

    def bytesToJsonString(bytes: Array[Byte]): String =
        "\"" + bytesToString(bytes).replace("\"", "\\\"") + "\""

    def bytesToBoolean(bytes: Array[Byte]): Boolean = bytes.head > 0

    private def createByteBuf(bytes: Array[Byte], expectedSize: Byte): Either[Throwable, ByteBuffer] =
        if bytes.length == expectedSize
        then
            val buf = ByteBuffer.allocateDirect(expectedSize)
            buf.order(ByteOrder.BIG_ENDIAN)
            for (_ <- 0 until buf.capacity - bytes.length) buf.put(0x00.toByte)
            bytes.foreach(buf.put)
            buf.flip
            Right(buf)
        else Left(new Exception(s"Invalid byte array length ${bytes.length}"))
