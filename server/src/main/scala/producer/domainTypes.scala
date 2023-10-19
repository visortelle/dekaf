package producer

case class FixedJsonGenerator(json: String)

case class JsJsonGenerator(jsCode: String)

enum InterpretJsonAs:
    case Json, Base64EncodedBytes, HexEncodedBytes

case class JsonGenerator(
    generator: FixedJsonGenerator | JsJsonGenerator,
    interpretJsonAs: InterpretJsonAs
)

case class EmptyEventTimeGenerator()
case class AutoEventTimeGenerator()
case class FixedEventTimeGenerator(eventTime: Long)

case class EventTimeGenerator(
    generator: EmptyEventTimeGenerator | AutoEventTimeGenerator | FixedEventTimeGenerator | JsonGenerator
)

case class EmptyKeyGenerator()
case class RandomKeyGenerator(minChars: Int, maxChars: Int)
case class FixedKeyGenerator(key: String)
case class KeyGenerator(
    generator: EmptyKeyGenerator | RandomKeyGenerator | FixedKeyGenerator | JsonGenerator
)

case class EmptyValueGenerator()
case class RandomBytesGenerator(
    minBytes: Int,
    maxBytes: Int
)
case class ValueGenerator(
    generator: EmptyValueGenerator | RandomBytesGenerator | JsonGenerator
)

case class EmptyPropertiesGenerator()

case class PropertiesGenerator(
    generator: EmptyPropertiesGenerator | JsonGenerator
)

case class MessageGenerator(
    keyGenerator: KeyGenerator,
    valueGenerator: ValueGenerator,
    propertiesGenerator: PropertiesGenerator,
    eventTimeGenerator: EventTimeGenerator
)

case class ProduceMessagesTask(
    targetTopic: String,
    generator: MessageGenerator,
    generatorRunsCount: Long,
    generatorRunsIntervalMs: Long
)

case class ProducerSession(
    sessionId: String,
    task: ProduceMessagesTask
)
