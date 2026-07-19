package features.consumersession

import harness.DekafSuite
import com.microsoft.playwright.Download
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import org.apache.pulsar.client.api.Schema
import scala.jdk.CollectionConverters.*

class CsExportSpec extends DekafSuite:

  /** Export runs JSON.parse(message.value) - values MUST be valid JSON, else the export throws. */
  private def produceJson(fqn: String, n: Int): Unit =
    val p = client.newProducer(Schema.STRING).topic(fqn).create()
    try (0 until n).foreach(i => p.send(s"""{"n":$i}"""))
    finally p.close()

  private def loadedPaused(t: String, ns: String, topic: String, n: Int): ConsumerSessionPage =
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.waitMessages(n)
    cs.pauseFromToolbar()
    cs.assertState("paused")
    cs

  test("CS-28: Export modal offers 4 formats and downloads a .zip containing the messages") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    produceJson(fqn, 5)
    val cs = loadedPaused(t, ns, topic, 5)

    cs.exportOpen.click()
    val modal = ExportModal(page)
    assertThat(modal.root).isVisible()
    assert(modal.formatOptionCount == 4, s"expected 4 formats, got ${modal.formatOptionCount}")
    assertThat(modal.fieldRows.first()).isVisible() // field-config list present (reorder disabled - see NOTES)

    val download: Download = page.waitForDownload(() => modal.runButton.click())
    assert(download.suggestedFilename().endsWith(".zip"), download.suggestedFilename())

    val zipPath = java.nio.file.Files.createTempFile("cs-export", ".zip")
    download.saveAs(zipPath)
    fixtures.onCleanup(() => java.nio.file.Files.deleteIfExists(zipPath))

    val zip = new java.util.zip.ZipFile(zipPath.toFile)
    try
      val text = zip.entries().asScala
        .filterNot(_.isDirectory)
        .map(e => new String(zip.getInputStream(e).readAllBytes(), java.nio.charset.StandardCharsets.UTF_8))
        .mkString("\n")
      assert(text.nonEmpty, "empty export")
      // The default format exports the full message descriptor; the raw value is JSON-escaped inside
      // a string field, so assert the (unescaped) per-message index 1..5 is present.
      (1 to 5).foreach(i =>
        assert(text.contains(s"\"index\":$i"), s"missing message index $i in export"))
    finally zip.close()
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
