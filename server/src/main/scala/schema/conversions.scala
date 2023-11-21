package schema

import scala.jdk.CollectionConverters.*
import com.google.protobuf.ByteString
import org.apache.pulsar.common.schema.{KeyValueEncodingType, SchemaInfo, SchemaType}
import com.tools.teal.pulsar.ui.api.v1.schema.{KeyValueEncodingType as KeyValueEncodingTypePb, SchemaInfo as SchemaInfoPb, SchemaType as SchemaTypePb}

def schemaInfoToPb(s: SchemaInfo): SchemaInfoPb =
    SchemaInfoPb(
        name = Option(s.getName).getOrElse(""),
        `type` = Option(schemaTypeToPb(s.getType)).getOrElse(SchemaTypePb.SCHEMA_TYPE_NONE),
        schema = Option(s.getSchema).map(v => ByteString.copyFrom(v)).getOrElse(ByteString.EMPTY),
        properties = Option(s.getProperties).map(_.asScala.toMap).getOrElse(Map.empty[String, String])
    )

def schemaInfoFromPb(spb: SchemaInfoPb): SchemaInfo =
    SchemaInfo.builder
        .name(spb.name)
        .`type`(schemaTypeFromPb(spb.`type`))
        .properties(spb.properties.asJava)
        .schema(spb.schema.toByteArray)
        .build

def schemaTypeFromPb(pb: SchemaTypePb): SchemaType =
    pb match
        case SchemaTypePb.SCHEMA_TYPE_UNSPECIFIED => SchemaType.NONE
        case SchemaTypePb.SCHEMA_TYPE_NONE => SchemaType.NONE

        case SchemaTypePb.SCHEMA_TYPE_STRING => SchemaType.STRING
        case SchemaTypePb.SCHEMA_TYPE_JSON => SchemaType.JSON
        case SchemaTypePb.SCHEMA_TYPE_PROTOBUF => SchemaType.PROTOBUF
        case SchemaTypePb.SCHEMA_TYPE_AVRO => SchemaType.AVRO

        case SchemaTypePb.SCHEMA_TYPE_BOOLEAN => SchemaType.BOOLEAN

        case SchemaTypePb.SCHEMA_TYPE_INT8 => SchemaType.INT8
        case SchemaTypePb.SCHEMA_TYPE_INT16 => SchemaType.INT16
        case SchemaTypePb.SCHEMA_TYPE_INT32 => SchemaType.INT32
        case SchemaTypePb.SCHEMA_TYPE_INT64 => SchemaType.INT64
        case SchemaTypePb.SCHEMA_TYPE_FLOAT => SchemaType.FLOAT
        case SchemaTypePb.SCHEMA_TYPE_DOUBLE => SchemaType.DOUBLE

        case SchemaTypePb.SCHEMA_TYPE_DATE => SchemaType.DATE
        case SchemaTypePb.SCHEMA_TYPE_TIME => SchemaType.TIME
        case SchemaTypePb.SCHEMA_TYPE_TIMESTAMP => SchemaType.TIMESTAMP
        case SchemaTypePb.SCHEMA_TYPE_KEY_VALUE => SchemaType.KEY_VALUE
        case SchemaTypePb.SCHEMA_TYPE_INSTANT => SchemaType.INSTANT
        case SchemaTypePb.SCHEMA_TYPE_LOCAL_DATE => SchemaType.LOCAL_DATE
        case SchemaTypePb.SCHEMA_TYPE_LOCAL_TIME => SchemaType.LOCAL_TIME
        case SchemaTypePb.SCHEMA_TYPE_LOCAL_DATE_TIME => SchemaType.LOCAL_DATE_TIME

        case SchemaTypePb.SCHEMA_TYPE_PROTOBUF_NATIVE => SchemaType.PROTOBUF_NATIVE

        case SchemaTypePb.SCHEMA_TYPE_BYTES => SchemaType.BYTES

        case _ => SchemaType.NONE

def schemaTypeToPb(schemaType: SchemaType): SchemaTypePb =
    schemaType match
        case SchemaType.NONE => SchemaTypePb.SCHEMA_TYPE_NONE

        case SchemaType.STRING => SchemaTypePb.SCHEMA_TYPE_STRING
        case SchemaType.JSON => SchemaTypePb.SCHEMA_TYPE_JSON
        case SchemaType.PROTOBUF => SchemaTypePb.SCHEMA_TYPE_PROTOBUF
        case SchemaType.AVRO => SchemaTypePb.SCHEMA_TYPE_AVRO

        case SchemaType.BOOLEAN => SchemaTypePb.SCHEMA_TYPE_BOOLEAN

        case SchemaType.INT8 => SchemaTypePb.SCHEMA_TYPE_INT8
        case SchemaType.INT16 => SchemaTypePb.SCHEMA_TYPE_INT16
        case SchemaType.INT32 => SchemaTypePb.SCHEMA_TYPE_INT32
        case SchemaType.INT64 => SchemaTypePb.SCHEMA_TYPE_INT64
        case SchemaType.FLOAT => SchemaTypePb.SCHEMA_TYPE_FLOAT
        case SchemaType.DOUBLE => SchemaTypePb.SCHEMA_TYPE_DOUBLE

        case SchemaType.DATE => SchemaTypePb.SCHEMA_TYPE_DATE
        case SchemaType.TIME => SchemaTypePb.SCHEMA_TYPE_TIME
        case SchemaType.TIMESTAMP => SchemaTypePb.SCHEMA_TYPE_TIMESTAMP
        case SchemaType.KEY_VALUE => SchemaTypePb.SCHEMA_TYPE_KEY_VALUE
        case SchemaType.INSTANT => SchemaTypePb.SCHEMA_TYPE_INSTANT
        case SchemaType.LOCAL_DATE => SchemaTypePb.SCHEMA_TYPE_LOCAL_DATE
        case SchemaType.LOCAL_TIME => SchemaTypePb.SCHEMA_TYPE_LOCAL_TIME
        case SchemaType.LOCAL_DATE_TIME => SchemaTypePb.SCHEMA_TYPE_LOCAL_DATE_TIME

        case SchemaType.PROTOBUF_NATIVE => SchemaTypePb.SCHEMA_TYPE_PROTOBUF_NATIVE

        case SchemaType.BYTES => SchemaTypePb.SCHEMA_TYPE_BYTES

        case _ => SchemaTypePb.SCHEMA_TYPE_NONE

def keyValueEncodingTypeFromPb(pb: KeyValueEncodingTypePb): KeyValueEncodingType =
    pb match
        case KeyValueEncodingTypePb.KEY_VALUE_ENCODING_TYPE_SEPARATED => KeyValueEncodingType.SEPARATED
        case KeyValueEncodingTypePb.KEY_VALUE_ENCODING_TYPE_INLINE => KeyValueEncodingType.INLINE
        case _ => KeyValueEncodingType.INLINE
        
def keyValueEncodingTypeToPb(keyValueEncodingType: KeyValueEncodingType): KeyValueEncodingTypePb =
    keyValueEncodingType match
        case KeyValueEncodingType.SEPARATED => KeyValueEncodingTypePb.KEY_VALUE_ENCODING_TYPE_SEPARATED
        case KeyValueEncodingType.INLINE => KeyValueEncodingTypePb.KEY_VALUE_ENCODING_TYPE_INLINE
        case _ => KeyValueEncodingTypePb.KEY_VALUE_ENCODING_TYPE_INLINE