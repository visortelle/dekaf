package conversions

import java.nio.charset.StandardCharsets
import java.nio.{ByteBuffer, ByteOrder}

def bytesToInt8(bytes: Array[Byte]): Int =
    val buf = ByteBuffer.allocateDirect(4)
    buf.order(ByteOrder.BIG_ENDIAN)
    for (_ <- 0 to buf.capacity - bytes.length - 1) buf.put(0x00.toByte)
    bytes.foreach(buf.put)
    buf.flip
    val uint8 = buf.getInt
    if uint8 > 127 then uint8 - 256 else uint8

def bytesToInt16(bytes: Array[Byte]): Int =
    val buf = ByteBuffer.allocateDirect(4)
    buf.order(ByteOrder.BIG_ENDIAN)
    for (_ <- 0 to buf.capacity - bytes.length - 1) buf.put(0x00.toByte)
    bytes.foreach(buf.put)
    buf.flip
    buf.getInt

def bytesToInt32(bytes: Array[Byte]): Int =
    val buf = ByteBuffer.allocateDirect(4)
    buf.order(ByteOrder.BIG_ENDIAN)
    for (_ <- 0 to buf.capacity - bytes.length - 1) buf.put(0x00.toByte)
    bytes.foreach(buf.put)
    buf.flip
    buf.getInt

def bytesToInt64(bytes: Array[Byte]): Long =
    val buf = ByteBuffer.allocateDirect(8)
    buf.order(ByteOrder.BIG_ENDIAN)
    for (_ <- 0 to buf.capacity - bytes.length - 1) buf.put(0x00.toByte)
    bytes.foreach(buf.put)
    buf.flip
    buf.getLong

def bytesToFloat32(bytes: Array[Byte]): Float =
    val buf = ByteBuffer.allocateDirect(4)
    buf.order(ByteOrder.BIG_ENDIAN)
    for (_ <- 0 to buf.capacity - bytes.length - 1) buf.put(0x00.toByte)
    bytes.foreach(buf.put)
    buf.flip
    buf.getFloat

def bytesToFloat64(bytes: Array[Byte]): Double =
    val buf = ByteBuffer.allocateDirect(8)
    buf.order(ByteOrder.BIG_ENDIAN)
    for (_ <- 0 to buf.capacity - bytes.length - 1) buf.put(0x00.toByte)
    bytes.foreach(buf.put)
    buf.flip
    buf.getDouble

def bytesToString(bytes: Array[Byte]): String = String(bytes, StandardCharsets.UTF_8)

def bytesToJsonString(bytes: Array[Byte]): String =
    "\"" + bytesToString(bytes).replace("\"", "\\\"") + "\""

def bytesToBoolean(bytes: Array[Byte]): Boolean = bytes.head > 0
