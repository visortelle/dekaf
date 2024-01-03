package conversions

import java.nio.charset.StandardCharsets
import java.nio.{ByteBuffer, ByteOrder}
import io.circe.*
import io.circe.syntax.*
import io.circe.parser.parse as parseJson

object primitiveConv:
    /*
     * Compares two floating point numbers for equality with a given precision.
     * */
    def eqFloat(x: Double, y: Double, precision: Double): Boolean = (x - y).abs < precision

    def bytesToInt8(bytes: Array[Byte]): Either[Throwable, Byte] =
        createByteBuf(bytes, 1).map(_.get(0))

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

    /* Converts a byte array to a string in UTF-8 encoding. */
    def bytesToString(bytes: Array[Byte]): String = String(bytes, StandardCharsets.UTF_8)

    /* Converts a byte array to a JSON string in UTF-8 encoding.
     * Escapes quotes and backslashes.
     * Replaces non-printable characters like line break to \n, tabs to \t, etc.
     * */
    def bytesToJsonString(bytes: Array[Byte]): String =
        bytesToString(bytes).asJson.noSpaces

    /* Converts a byte array to a boolean.
     * The byte array must be of length 1.
     * If the byte array is of length 1, the boolean is true if the byte is not 0.
     * If the byte array is not of length 1, an error is returned.
     * */
    def bytesToBoolean(bytes: Array[Byte]): Either[Throwable, Boolean] =
        if bytes.length == 1
        then Right(bytes.head != 0)
        else Left(new Exception(s"Invalid byte array length ${bytes.length}"))

    def bytesToJson(bytes: Array[Byte]): Either[Throwable, String] =
        val json = bytesToString(bytes)
        parseJson(json) match
            case Left(err) => Left(err)
            case Right(_) => Right(json)

    /* Creates a ByteBuffer from a byte array.
     * The byte array must be of length size.
     * */
    private def createByteBuf(bytes: Array[Byte], size: Byte): Either[Throwable, ByteBuffer] =
        if bytes.length > size
        then Left(new Exception(s"Invalid byte array length ${bytes.length}. Expected: $size"))
        else
            val buf = ByteBuffer.allocateDirect(size)
            buf.order(ByteOrder.BIG_ENDIAN)
            for (_ <- 0 until buf.capacity - bytes.length) buf.put(0x00.toByte)
            bytes.foreach(buf.put)
            buf.flip
            Right(buf)

    /*
    Pads a byte array with a given byte to a given size.
    Example: leftPad(Array(1, 2, 3), 5, 0) = Array(0, 0, 1, 2, 3)
     * */
    def leftPad(bytes: Array[Byte], size: Int, pad: Byte): Array[Byte] =
        val padSize = size - bytes.length
        if padSize <= 0
        then bytes
        else Array.fill(padSize)(pad) ++ bytes
