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

def interpretJsonAsFromPb(v: pb.InterpretJsonAs): InterpretJsonAs = v match
    case pb.InterpretJsonAs.INTERPRET_JSON_AS_JSON => InterpretJsonAs.Json
    case pb.InterpretJsonAs.INTERPRET_JSON_AS_BASE64_ENCODED_BYTES => InterpretJsonAs.Base64EncodedBytes
    case pb.InterpretJsonAs.INTERPRET_JSON_AS_HEX_ENCODED_BYTES => InterpretJsonAs.HexEncodedBytes
    case _ => throw new Exception("Unknown InterpretJsonAs value: " + v)

def interpretJsonAsToPb(v: InterpretJsonAs): pb.InterpretJsonAs = v match
    case InterpretJsonAs.Json => pb.InterpretJsonAs.INTERPRET_JSON_AS_JSON
    case InterpretJsonAs.Base64EncodedBytes => pb.InterpretJsonAs.INTERPRET_JSON_AS_BASE64_ENCODED_BYTES
    case InterpretJsonAs.HexEncodedBytes => pb.InterpretJsonAs.INTERPRET_JSON_AS_HEX_ENCODED_BYTES

def jsonGeneratorFromPb(v: pb.JsonGenerator): JsonGenerator = JsonGenerator(
    interpretJsonAs = interpretJsonAsFromPb(v.interpretJsonAs),
    generator = v.generator match
        case pb.JsonGenerator.Generator.FixedGenerator(gen) => fixedJsonGeneratorFromPb(gen)
        case pb.JsonGenerator.Generator.JsGenerator(gen) => jsJsonGeneratorFromPb(gen)
)

def jsonGeneratorToPb(v: JsonGenerator): pb.JsonGenerator = pb.JsonGenerator(
    interpretJsonAs = interpretJsonAsToPb(v.interpretJsonAs),
    generator = v.generator match
        case v: FixedJsonGenerator => pb.JsonGenerator.Generator.FixedGenerator(fixedJsonGeneratorToPb(v))
        case v: JsJsonGenerator => pb.JsonGenerator.Generator.JsGenerator(jsJsonGeneratorToPb(v))
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
        case v: EmptyEventTimeGenerator => pb.EventTimeGenerator.Generator.EmptyGenerator(emptyEventTimeGeneratorToPb(v))
        case v: AutoEventTimeGenerator => pb.EventTimeGenerator.Generator.AutoGenerator(autoEventTimeGeneratorToPb(v))
        case v: FixedEventTimeGenerator => pb.EventTimeGenerator.Generator.FixedGenerator(fixedEventTimeGeneratorToPb(v))
        case v: JsonGenerator => pb.EventTimeGenerator.Generator.JsonGenerator(jsonGeneratorToPb(v))
)

def emptyKeyGeneratorFromPb(v: pb.EmptyKeyGenerator): EmptyKeyGenerator = EmptyKeyGenerator()
def emptyKeyGeneratorToPb(v: EmptyKeyGenerator): pb.EmptyKeyGenerator = pb.EmptyKeyGenerator()

def randomKeyGeneratorFromPb(v: pb.RandomKeyGenerator): RandomKeyGenerator = RandomKeyGenerator(
    minChars = v.minChars,
    maxChars = v.maxChars
)
def randomKeyGeneratorToPb(v: RandomKeyGenerator): pb.RandomKeyGenerator = pb.RandomKeyGenerator(
    minChars = v.minChars,
    maxChars = v.maxChars
)

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
        case v: EmptyKeyGenerator => pb.KeyGenerator.Generator.EmptyGenerator(emptyKeyGeneratorToPb(v))
        case v: RandomKeyGenerator => pb.KeyGenerator.Generator.RandomGenerator(randomKeyGeneratorToPb(v))
        case v: FixedKeyGenerator => pb.KeyGenerator.Generator.FixedGenerator(fixedKeyGeneratorToPb(v))
        case v: JsonGenerator => pb.KeyGenerator.Generator.JsonGenerator(jsonGeneratorToPb(v))
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
        case pb.ValueGenerator.Generator.RandomBytesGenerator(gen) => randomBytesGeneratorFromPb(gen)
        case pb.ValueGenerator.Generator.JsonGenerator(gen) => jsonGeneratorFromPb(gen)
        case _ => throw new Exception("Unknown ValueGenerator.Generator value: " + v.generator)
)

def valueGeneratorToPb(v: ValueGenerator): pb.ValueGenerator = pb.ValueGenerator(
    generator = v.generator match
        case v: EmptyValueGenerator => pb.ValueGenerator.Generator.EmptyGenerator(emptyValueGeneratorToPb(v))
        case v: RandomBytesGenerator => pb.ValueGenerator.Generator.RandomBytesGenerator(randomBytesGeneratorToPb(v))
        case v: JsonGenerator => pb.ValueGenerator.Generator.JsonGenerator(jsonGeneratorToPb(v))
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
        case v: EmptyPropertiesGenerator => pb.PropertiesGenerator.Generator.EmptyGenerator(emptyPropertiesGeneratorToPb(v))
        case v: JsonGenerator => pb.PropertiesGenerator.Generator.JsonGenerator(jsonGeneratorToPb(v))
)

def messageGeneratorFromPb(v: pb.MessageGenerator): MessageGenerator = MessageGenerator(
    keyGenerator = v.keyGenerator.map(keyGeneratorFromPb).getOrElse(KeyGenerator(generator = EmptyKeyGenerator())),
    valueGenerator = v.valueGenerator.map(valueGeneratorFromPb).getOrElse(ValueGenerator(generator = EmptyValueGenerator())),
    propertiesGenerator = v.propertiesGenerator.map(propertiesGeneratorFromPb).getOrElse(PropertiesGenerator(generator = EmptyPropertiesGenerator())),
    eventTimeGenerator = v.eventTimeGenerator.map(eventTimeGeneratorFromPb).getOrElse(EventTimeGenerator(generator = EmptyEventTimeGenerator()))
)
def messageGeneratorToPb(v: MessageGenerator): pb.MessageGenerator = pb.MessageGenerator(
    keyGenerator = Some(keyGeneratorToPb(v.keyGenerator)),
    valueGenerator = Some(valueGeneratorToPb(v.valueGenerator)),
    propertiesGenerator = Some(propertiesGeneratorToPb(v.propertiesGenerator)),
    eventTimeGenerator = Some(eventTimeGeneratorToPb(v.eventTimeGenerator))
)

def produceMessagesTaskFromPb(v: pb.ProduceMessagesTask): ProduceMessagesTask = ProduceMessagesTask(
    targetTopic = v.targetTopic,
    generator = v.generator.map(messageGeneratorFromPb).getOrElse(MessageGenerator(
        keyGenerator = KeyGenerator(generator = EmptyKeyGenerator()),
        valueGenerator = ValueGenerator(generator = EmptyValueGenerator()),
        propertiesGenerator = PropertiesGenerator(generator = EmptyPropertiesGenerator()),
        eventTimeGenerator = EventTimeGenerator(generator = EmptyEventTimeGenerator())
    )),
    generatorRunsCount = v.generatorRunsCount,
    generatorRunsIntervalMs = v.generatorRunsIntervalMs
)

def produceMessagesTaskToPb(v: ProduceMessagesTask): pb.ProduceMessagesTask = pb.ProduceMessagesTask(
    targetTopic = v.targetTopic,
    messageGenerator = messageGeneratorToPb(v.generator),
    generatorRunsCount = v.generatorRunsCount,
    generatorRunsIntervalMs = v.generatorRunsIntervalMs
)

//def producerSessionFromPb(v: pb.ProducerSession): ProducerSession = ProducerSession(
//    sessionId: v.sessionId,
//    tasks = v.tasks.map(produceMessagesTaskFromPb)
//)
//
//def producerSessionToPb(v: ProducerSession): pb.ProducerSession = pb.ProducerSession(
//    sessionId: v.sessionId,
//    tasks = v.tasks.map(produceMessagesTaskToPb)
//)
