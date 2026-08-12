package features.consumersession

import com.fasterxml.jackson.databind.ObjectMapper
import org.apache.pulsar.client.api.Schema

import java.nio.charset.StandardCharsets.UTF_8

/** A consumer session reading a topic with a REGISTERED Pulsar schema.
  *
  * Every other consumer-session fixture is `Schema.STRING` raw bytes, so the server's
  * schema-fetch-and-decode path (`getSchemasByTopic` -> per-message decode) had no end-to-end
  * coverage at all: a regression that decoded schema'd values to garbage, fetched the wrong
  * schema, or silently fell back to raw bytes passed every session test in the suite. The only
  * schema coverage was `SchemaSpec` - the schema MANAGEMENT page, a different code path - and the
  * UI-side deserializer dropdown, which never involves the registry.
  */
class CsSchemaValueSpec extends StartFromSupport:

  private val mapper = new ObjectMapper()

  test("CS-SCH-1: a topic with a registered JSON schema renders DECODED objects, not raw bytes") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"

    // Register the schema through the ADMIN api, then produce plain bytes with a schema-less
    // producer (standalone does not enforce schema validation). Nothing but the registry tells
    // the session these bytes are JSON - which is exactly the path under test. The fixture
    // asserts the registration premise (type JSON really stored) before the UI is driven.
    val schemaDef =
      """{"type":"record","name":"TestOrder","fields":[{"name":"id","type":"int"},{"name":"item","type":"string"}]}"""
    fixtures.registerJsonSchema(fqn, schemaDef)

    val payloads = Seq("""{"id":1,"item":"boots"}""", """{"id":2,"item":"socks"}""")
    val producer = client.newProducer(Schema.BYTES).topic(fqn).enableBatching(false).create()
    try payloads.foreach(p => producer.send(p.getBytes(UTF_8)))
    finally producer.close()

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.assertState("running")
    cs.awaitLoaded(2)

    // Parsed, not substring-matched: each rendered cell must BE one of the two produced objects.
    // What fails here [phase-2 bite-check - needs the running app]:
    //   - a raw-bytes fallback renders the document as a JSON STRING (`"{\"id\":1,...}"`); after
    //     the one-quote-pair strip that text still carries escape backslashes and fails the parse;
    //   - a broken or wrong-schema decode fails the parse or the object equality;
    //   - jackson-tree equality keeps the assertion independent of key order and whitespace, but
    //     if the app deliberately reshapes decoded values (truncation, annotation) this needs
    //     phase-2 eyes on the real rendering rather than a weaker assertion now.
    val rendered = harness.Eventually.eventually(timeoutMs = 20000, intervalMs = 400) {
      val cells = cs.allColumnValues("value")
      assert(cells.size == 2, s"expected 2 rendered rows, got $cells")
      cells
    }
    val renderedNodes = rendered.map { cell =>
      try mapper.readTree(cell)
      catch
        case t: Throwable =>
          fail(s"a value cell does not parse as JSON (raw-bytes fallback or broken decode?): '$cell' (${t.getMessage})")
    }
    renderedNodes.foreach(n => assert(n.isObject, s"a value cell decoded to ${n.getNodeType}, expected a JSON object: $n"))
    assert(
      renderedNodes.toSet == payloads.map(mapper.readTree).toSet,
      s"decoded objects differ from the produced ones: rendered $renderedNodes, produced $payloads"
    )
  }
