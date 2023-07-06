package conversions

import java.nio.ByteBuffer

object Conversions:
    def int8ToBytes(n: Byte): Array[Byte] = Array(n)
    def int16ToBytes(n: Short): Array[Byte] = ByteBuffer.allocate(2).putShort(n).array
    def int32ToBytes(n: Int): Array[Byte] = ByteBuffer.allocate(4).putInt(n).array
    def int64ToBytes(n: Long): Array[Byte] = ByteBuffer.allocate(8).putLong(n).array
    def float32ToBytes(n: Float): Array[Byte] = ByteBuffer.allocate(4).putFloat(n).array
    def float64ToBytes(n: Double): Array[Byte] = ByteBuffer.allocate(8).putDouble(n).array
