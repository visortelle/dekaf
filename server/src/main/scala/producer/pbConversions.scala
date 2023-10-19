package producer

import com.tools.teal.pulsar.ui.api.v1.producer as pb
import com.google.protobuf.ByteString
import io.circe.*
import io.circe.generic.semiauto.*
import io.circe.syntax.*
import io.circe.parser.parse as parseJson
import io.circe.parser.decode as decodeJson

def fixedJsonGeneratorFromPb(v: pb.FixedJsonGenerator): FixedJsonGenerator = FixedJsonGenerator(json = v.json)
def fixedJsonGeneratorToPb(v: FixedJsonGenerator): pb.FixedJsonGenerator = pb.FixedJsonGenerator(json = v.json)

def jsJsonGeneratorFromPb(v: pb.JsJsonGenerator): JsJsonGenerator = JsJsonGenerator(jsCode = v.jsCode)
def jsJsonGeneratorToPb(v: JsJsonGenerator): pb.JsJsonGenerator = pb.JsJsonGenerator(jsCode = v.jsCode)

def interpretJsonAsGeneratorFromPb(v: pb.InterpretJsonAsGenerator): InterpretJsonAsGenerator = v match
    case pb.InterpretJsonAs.INTERPRET_JSON_AS_JSON => InterpretJsonAs.Json
    case pb.InterpretJsonAs.INTERPRET_JSON_AS_BASE64_ENCODED_BYTES => InterpretJsonAs.Base64EncodedBytes
    case pb.InterpretJsonAs.INTERPRET_JSON_AS_HEX_ENCODED_BYTES => InterpretJsonAs.HexEncodedBytes
    case _ => throw new Exception("Unknown InterpretJsonAs value: " + v)

def interpretJsonAsGeneratorToPb(v: InterpretJsonAsGenerator): pb.InterpretJsonAsGenerator = v match
    case InterpretJsonAs.Json => pb.InterpretJsonAs.INTERPRET_JSON_AS_JSON
    case InterpretJsonAs.Base64EncodedBytes => pb.InterpretJsonAs.INTERPRET_JSON_AS_BASE64_ENCODED_BYTES
    case InterpretJsonAs.HexEncodedBytes => pb.InterpretJsonAs.INTERPRET_JSON_AS_HEX_ENCODED_BYTES

def jsonGeneratorFromPb(v: pb.JsonGenerator): JsonGenerator = JsonGenerator(
    interpretJsonAs = interpretJsonAsGeneratorFromPb(v.interpretJsonAs),
    generator = v.generator match
        case pb.JsonGenerator.Generator.FixedGenerator(gen) => fixedJsonGeneratorFromPb(gen)
        case pb.JsonGenerator.Generator.JsGenerator(gen) => jsJsonGeneratorFromPb(gen)
)

def jsonGeneratorToPb(v: JsonGenerator): pb.JsonGenerator = pb.JsonGenerator(
    interpretJsonAs = interpretJsonAsGeneratorToPb(v.interpretJsonAs),
    generator = v.generator match
        case FixedJsonGenerator(json) => pb.JsonGenerator.Generator.FixedGenerator(fixedJsonGeneratorToPb(json))
        case JsJsonGenerator(jsCode) => pb.JsonGenerator.Generator.JsGenerator(jsJsonGeneratorToPb(jsCode))
)

def emptyEventTimeGeneratorFromPb(v: pb.EmptyEventTimeGenerator): EmptyEventTimeGenerator = EmptyEventTimeGenerator()
def emptyEventTimeGeneratorToPb(v: EmptyEventTimeGenerator): pb.EmptyEventTimeGenerator = pb.EmptyEventTimeGenerator()

def autoEventTimeGeneratorFromPb(v: pb.AutoEventTimeGenerator): AutoEventTimeGenerator = AutoEventTimeGenerator()
def autoEventTimeGeneratorToPb(v: AutoEventTimeGenerator): pb.AutoEventTimeGenerator = pb.AutoEventTimeGenerator()

def fixedEventTimeGeneratorFromPb(v: pb.FixedEventTimeGenerator): FixedEventTimeGenerator = FixedEventTimeGenerator(eventTime = v.eventTime)
def fixedEventTimeGeneratorToPb(v: FixedEventTimeGenerator): pb.FixedEventTimeGenerator = pb.FixedEventTimeGenerator(eventTime = v.eventTime)

def eventTimeGeneratorFromPb(v: pb.EventTimeGenerator): EventTimeGenerator = EventTimeGenerator(
    generator = v.generator match
        case pb.EventTimeGenerator.Generator.EmptyGenerator(gen) => emptyEventTimeGeneratorFromPb(gen)
        case pb.EventTimeGenerator.Generator.AutoGenerator(gen) => autoEventTimeGeneratorFromPb(gen)
        case pb.EventTimeGenerator.Generator.FixedGenerator(gen) => fixedEventTimeGeneratorFromPb(gen)
        case pb.EventTimeGenerator.Generator.JsonGenerator(gen) => jsonGeneratorFromPb(gen)
        case _ => throw new Exception("Unknown EventTimeGenerator.Generator value: " + v.generator)
)

def eventTimeGeneratorToPb(v: EventTimeGenerator): pb.EventTimeGenerator = pb.EventTimeGenerator(
    generator = v.generator match
        case EmptyEventTimeGenerator() => pb.EventTimeGenerator.Generator.EmptyGenerator(emptyEventTimeGeneratorToPb())
        case AutoEventTimeGenerator() => pb.EventTimeGenerator.Generator.AutoGenerator(autoEventTimeGeneratorToPb())
        case FixedEventTimeGenerator(eventTime) => pb.EventTimeGenerator.Generator.FixedGenerator(fixedEventTimeGeneratorToPb(eventTime))
        case JsonGenerator(interpretJsonAs, generator) => pb.EventTimeGenerator.Generator.JsonGenerator(jsonGeneratorToPb(JsonGenerator(interpretJsonAs, generator)))
)

def emptyKeyGeneratorFromPb(v: pb.EmptyKeyGenerator): EmptyKeyGenerator = EmptyKeyGenerator()
def emptyKeyGeneratorToPb(v: EmptyKeyGenerator): pb.EmptyKeyGenerator = pb.EmptyKeyGenerator()

def randomKeyGeneratorFromPb(v: pb.RandomKeyGenerator): RandomKeyGenerator = RandomKeyGenerator()
def randomKeyGeneratorToPb(v: RandomKeyGenerator): pb.RandomKeyGenerator = pb.RandomKeyGenerator()

def fixedKeyGeneratorFromPb(v: pb.FixedKeyGenerator): FixedKeyGenerator = FixedKeyGenerator(key = v.key)
def fixedKeyGeneratorToPb(v: FixedKeyGenerator): pb.FixedKeyGenerator = pb.FixedKeyGenerator(key = v.key)

def keyGeneratorFromPb(v: pb.KeyGenerator): KeyGenerator = KeyGenerator(
    generator = v.generator match
        case pb.KeyGenerator.Generator.EmptyGenerator(gen) => emptyKeyGeneratorFromPb(gen)
        case pb.KeyGenerator.Generator.RandomGenerator(gen) => randomKeyGeneratorFromPb(gen)
        case pb.KeyGenerator.Generator.FixedGenerator(gen) => fixedKeyGeneratorFromPb(gen)
        case pb.KeyGenerator.Generator.JsonGenerator(gen) => jsonGeneratorFromPb(gen)
        case _ => throw new Exception("Unknown KeyGenerator.Generator value: " + v.generator)
)

def keyGeneratorToPb(v: KeyGenerator): pb.KeyGenerator = pb.KeyGenerator(
    generator = v.generator match
        case EmptyKeyGenerator() => pb.KeyGenerator.Generator.EmptyGenerator(emptyKeyGeneratorToPb())
        case RandomKeyGenerator() => pb.KeyGenerator.Generator.RandomGenerator(randomKeyGeneratorToPb())
        case FixedKeyGenerator(key) => pb.KeyGenerator.Generator.FixedGenerator(fixedKeyGeneratorToPb(key))
        case JsonGenerator(interpretJsonAs, generator) => pb.KeyGenerator.Generator.JsonGenerator(jsonGeneratorToPb(JsonGenerator(interpretJsonAs, generator)))
)

def emptyValueGeneratorFromPb(v: pb.EmptyValueGenerator): EmptyValueGenerator = EmptyValueGenerator()
def emptyValueGeneratorToPb(v: EmptyValueGenerator): pb.EmptyValueGenerator = pb.EmptyValueGenerator()

def randomBytesGeneratorFromPb(v: pb.RandomBytesGenerator): RandomBytesGenerator = RandomBytesGenerator(
    minBytes = v.minBytes,
    maxBytes = v.maxBytes
)
def randomBytesGeneratorToPb(v: RandomBytesGenerator): pb.RandomBytesGenerator = pb.RandomBytesGenerator(
    minBytes = v.minBytes,
    maxBytes = v.maxBytes
)

def valueGeneratorFromPb(v: pb.ValueGenerator): ValueGenerator = ValueGenerator(
    generator = v.generator match
        case pb.ValueGenerator.Generator.EmptyGenerator(gen) => emptyValueGeneratorFromPb(gen)
        case pb.ValueGenerator.Generator.RandomGenerator(gen) => randomBytesGeneratorFromPb(gen)
        case pb.ValueGenerator.Generator.JsonGenerator(gen) => jsonGeneratorFromPb(gen)
        case _ => throw new Exception("Unknown ValueGenerator.Generator value: " + v.generator)
)

def valueGeneratorToPb(v: ValueGenerator): pb.ValueGenerator = pb.ValueGenerator(
    generator = v.generator match
        case EmptyValueGenerator() => pb.ValueGenerator.Generator.EmptyGenerator(emptyValueGeneratorToPb())
        case RandomBytesGenerator(minBytes, maxBytes) => pb.ValueGenerator.Generator.RandomGenerator(randomBytesGeneratorToPb(RandomBytesGenerator(minBytes, maxBytes)))
        case JsonGenerator(interpretJsonAs, generator) => pb.ValueGenerator.Generator.JsonGenerator(jsonGeneratorToPb(JsonGenerator(interpretJsonAs, generator)))
)

def emptyPropertiesGeneratorFromPb(v: pb.EmptyPropertiesGenerator): EmptyPropertiesGenerator = EmptyPropertiesGenerator()
def emptyPropertiesGeneratorToPb(v: EmptyPropertiesGenerator): pb.EmptyPropertiesGenerator = pb.EmptyPropertiesGenerator()

def propertiesGeneratorFromPb(v: pb.PropertiesGenerator): PropertiesGenerator = PropertiesGenerator(
    generator = v.generator match
        case pb.PropertiesGenerator.Generator.EmptyGenerator(gen) => emptyPropertiesGeneratorFromPb(gen)
        case pb.PropertiesGenerator.Generator.JsonGenerator(gen) => jsonGeneratorFromPb(gen)
        case _ => throw new Exception("Unknown PropertiesGenerator.Generator value: " + v.generator)
)
def propertiesGeneratorToPb(v: PropertiesGenerator): pb.PropertiesGenerator = pb.PropertiesGenerator(
    generator = v.generator match
        case EmptyPropertiesGenerator() => pb.PropertiesGenerator.Generator.EmptyGenerator(emptyPropertiesGeneratorToPb())
        case JsonGenerator(interpretJsonAs, generator) => pb.PropertiesGenerator.Generator.JsonGenerator(jsonGeneratorToPb(JsonGenerator(interpretJsonAs, generator)))
)

def messageGeneratorFromPb(v: pb.MessageGenerator): MessageGenerator = MessageGenerator(
    keyGenerator = keyGeneratorFromPb(v.keyGenerator),
    valueGenerator = valueGeneratorFromPb(v.valueGenerator),
    propertiesGenerator = propertiesGeneratorFromPb(v.propertiesGenerator),
    eventTimeGenerator = eventTimeGeneratorFromPb(v.eventTimeGenerator)
)
def messageGeneratorToPb(v: MessageGenerator): MessageGenerator = MessageGenerator(
    keyGenerator = keyGeneratorToPb(v.keyGenerator),
    valueGenerator = valueGeneratorToPb(v.valueGenerator),
    propertiesGenerator = propertiesGeneratorToPb(v.propertiesGenerator),
    eventTimeGenerator = eventTimeGeneratorToPb(v.eventTimeGenerator)
)

def produceMessagesTaskFromPb(v: pb.ProduceMessagesTask): ProduceMessagesTask = ProduceMessagesTask(
    targetTopic = v.targetTopic,
    generator = messageGeneratorFromPb(v.messageGenerator),
    generatorRunsCount = v.generatorRunsCount,
    generatorRunsIntervalMs = v.generatorRunsIntervalMs
)

def produceMessagesTaskToPb(v: ProduceMessagesTask): pb.ProduceMessagesTask = pb.ProduceMessagesTask(
    targetTopic = v.targetTopic,
    messageGenerator = messageGeneratorToPb(v.generator),
    generatorRunsCount = v.generatorRunsCount,
    generatorRunsIntervalMs = v.generatorRunsIntervalMs
)

def producerSessionFromPb(v: pb.ProducerSession): ProducerSession = ProducerSession(
    sessionId: v.sessionId,
    tasks = v.tasks.map(produceMessagesTaskFromPb)
)

def producerSessionToPb(v: ProducerSession): pb.ProducerSession = pb.ProducerSession(
    sessionId: v.sessionId,
    tasks = v.tasks.map(produceMessagesTaskToPb)
)
