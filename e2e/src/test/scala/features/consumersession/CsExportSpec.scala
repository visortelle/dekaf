package features.consumersession

import harness.DekafSuite
import com.fasterxml.jackson.databind.{JsonNode, ObjectMapper}
import com.microsoft.playwright.Download
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import org.apache.pulsar.client.api.Schema
import scala.jdk.CollectionConverters.*

class CsExportSpec extends DekafSuite:

  /** Export runs JSON.parse(message.value) - values MUST be valid JSON, else the export throws. */
  private def produceKeyedJson(fqn: String, keyed: Seq[(String, String)]): Unit =
    val p = client.newProducer(Schema.STRING).topic(fqn).create()
    try keyed.foreach((k, v) => p.newMessage().key(k).value(v).send())
    finally p.close()

  /** A JSON string literal for `s` - the exact encoding both the server (circe `noSpaces`) and the
    * exporter (`JSON.stringify`) emit, so expectations can be built from the produced values. */
  private def jsonQuoted(s: String): String =
    "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

  /** Every non-directory entry of a downloaded .zip, as name -> UTF-8 text. */
  private def zipEntries(download: Download): Map[String, String] =
    val zipPath = java.nio.file.Files.createTempFile("cs-export", ".zip")
    download.saveAs(zipPath)
    fixtures.onCleanup(() => java.nio.file.Files.deleteIfExists(zipPath))
    val zip = new java.util.zip.ZipFile(zipPath.toFile)
    try
      zip.entries().asScala
        .filterNot(_.isDirectory)
        .map(e => e.getName -> new String(zip.getInputStream(e).readAllBytes(), java.nio.charset.StandardCharsets.UTF_8))
        .toMap
    finally zip.close()

  /** ONE exported message, reduced to the fields a test can predict. Everything else in the
    * descriptor is the broker's (message id, publish/event times, size, producer name, sequence id)
    * and is deliberately not pinned. */
  private case class Exported(index: Int, key: String, value: String, topic: String)

  private val mapper = new ObjectMapper()

  /** Parse an exported "message per array entry" file into records.
    *
    * PARSING is the point. The previous version searched the concatenated file text for each index,
    * each key and each value INDEPENDENTLY - which is satisfied by an export that paired message 1's
    * key with message 4's value, or wrote every field of every message into one record, as long as
    * all the substrings appeared somewhere. Records make the association itself assertable. */
  private def exportedMessages(fileText: String): List[Exported] =
    val root = mapper.readTree(fileText)
    assert(root.isArray, s"the exported file is not a JSON array:\n$fileText")
    root.elements().asScala.toList.map { node =>
      def field(name: String): JsonNode =
        val v = node.get(name)
        assert(v != null && !v.isNull, s"exported message has no '$name':\n${node.toString}")
        v
      // Each of these also pins the ENCODING LEVEL, which the recorded values below depend on: a
      // string field that stopped being a JSON string, or an index that became one, fails here
      // rather than quietly comparing something else.
      def jsonString(name: String): String =
        val v = field(name)
        assert(v.isTextual, s"'$name' was expected to be a JSON string, got ${v.toString}")
        v.asText
      val index = field("index")
      assert(index.isInt, s"'index' is not a JSON number: ${index.toString}")
      Exported(
        index = index.intValue,
        // Both of these arrive at the browser JSON-ENCODED, and the exporter treats them
        // differently: `value` is JSON.parse'd once (so it comes back out as the produced text),
        // `key` is not (so it comes back out still carrying its own quotes). Pin what is really
        // written rather than what one might assume - `asText` peels exactly one JSON string level
        // off each, and `isTextual` above is what stops that from hiding a change.
        key = jsonString("key"),
        value = jsonString("value"),
        topic = jsonString("topic")
      )
    }

  private def loadedPaused(t: String, ns: String, topic: String, n: Int): ConsumerSessionPage =
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.waitMessages(n)
    cs.pauseFromToolbar()
    cs.assertState("paused")
    cs

  // Previously this asserted 4 formats + that indices 1..5 appeared somewhere in the .zip - an
  // exporter that dropped every value, or exported the wrong topic's messages, still passed. It now
  // asserts the exported BYTES: exact content for the value-only format, and the parsed RECORDS -
  // (index, key, value, topic) per message, in order - for the default full-descriptor format.
  //
  // Records rather than substrings because the fields are what a broken exporter mixes up. Every key
  // and every value is DISTINCT and their positions differ (key i is the i-th key, value i the i-th
  // value), so a record-for-record comparison fails on a swap that a "does the file contain this
  // string" search cannot see at all.
  test("CS-28: Export modal offers 4 formats and the .zip carries exactly the produced messages") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    val keys   = (1 to 5).map(i => s"cs28-key-$i").toList
    val values = (1 to 5).map(i => s"""{"n":$i}""").toList
    produceKeyedJson(fqn, keys.zip(values))
    val cs = loadedPaused(t, ns, topic, 5)

    cs.exportOpen.click()
    val modal = ExportModal(page)
    assertThat(modal.root).isVisible()
    assert(modal.formatOptionCount == 4, s"expected 4 formats, got ${modal.formatOptionCount}")
    assertThat(modal.fieldRows.first()).isVisible() // field-config list present (reorder disabled - see NOTES)

    // --- "value per array entry": the file is nothing but the values, so pin it EXACTLY - a
    // dropped, duplicated, reordered or mangled message all fail here. The messages sort by
    // publishTime ascending (stable), i.e. production order.
    modal.selectFormat("json-value-per-entry")
    val valueEntries = zipEntries(page.waitForDownload(() => modal.runButton.click()))
    assert(valueEntries.size == 1, s"expected one exported file, got ${valueEntries.keys.toList}")
    val expectedValuesJson = values.map(jsonQuoted).mkString("[", ",", "]")
    assert(
      valueEntries.head._2 == expectedValuesJson,
      s"exported values were:\n${valueEntries.head._2}\nexpected:\n$expectedValuesJson"
    )

    // --- default "message per array entry": full descriptors. Timestamps and message ids are
    // non-deterministic, so the exported file is PARSED and compared record for record on the
    // fields that are: index, key, value and topic.
    modal.selectFormat("json-message-per-entry")
    val download: Download = page.waitForDownload(() => modal.runButton.click())
    assert(download.suggestedFilename().endsWith(".zip"), download.suggestedFilename())
    val entries = zipEntries(download)
    // One file, and its NAME is the index range it holds: the exporter chunks by size and names each
    // chunk `<first index>-<last index>.json`, inside a timestamped export folder.
    assert(entries.size == 1, s"expected one exported file, got ${entries.keys.toList}")
    val (entryName, entryText) = entries.head
    assert(entryName.endsWith("/1-5.json"), s"unexpected exported file name: $entryName")

    val exported = exportedMessages(entryText)
    val expected = keys.zip(values).zipWithIndex.map { case ((k, v), i) =>
      Exported(index = i + 1, key = jsonQuoted(k), value = v, topic = fqn)
    }
    assert(
      exported == expected,
      s"the exported messages are not the produced ones.\n  exported: $exported\n  expected: $expected"
    )
  }

  test("CS-29: export config persists across reopen") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceStrings(fqn, 3) // persistence path never exports -> plain values are fine
    val cs = loadedPaused(t, ns, topic, 3)

    cs.exportOpen.click()
    val modal = ExportModal(page)
    modal.selectFormat("json-value-per-entry")
    modal.close()

    cs.exportOpen.click()
    assertThat(ExportModal(page).format).hasValue("json-value-per-entry")
  }

  test("CS-29: a poisoned export config resets via the ErrorBoundary") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceStrings(fqn, 3)
    val cs = loadedPaused(t, ns, topic, 3)

    // Corrupt the stored config so _MessagesExporter throws on render (config.format.type on null).
    page.evaluate(
      """() => localStorage.setItem('messageExportConfig',
        |   JSON.stringify({ format: null, fields: { fields: [] }, filePerRawValueConfig: { fileExtension: '' } }))""".stripMargin)

    cs.exportOpen.click()
    // The ErrorBoundary catches the poisoned config and degrades gracefully instead of crashing.
    assertThat(page.getByText("Resetting to default")).isVisible()
  }
