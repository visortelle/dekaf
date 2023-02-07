package schema.shared

type JsonAsBytes = Array[Byte]
type AvroDatum = Array[Byte]
type Proto3Datum = Array[Byte]

trait JsonSerDe[SerializedData]:
    def fromJson(schema: Array[Byte], json: JsonAsBytes): Either[Throwable, SerializedData]
    def toJson(schema: Array[Byte], data: SerializedData): Either[Throwable, JsonAsBytes]
