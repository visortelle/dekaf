package harness

import com.microsoft.playwright.{BrowserContext, Page, Tracing}
import com.microsoft.playwright.Browser.NewContextOptions
import org.scalatest.{BeforeAndAfterAll, Outcome, Tag}
import org.scalatest.funsuite.AnyFunSuite

import java.nio.file.Files

/** Tag for deliberately-failing bug regressions (see e2e/README.md §6): while an app bug is open its
  * test asserts the CORRECT behavior, carries this tag, and stays red outside the green lane; once
  * the bug is fixed the test is untagged and joins the green lane. Run only tagged: `-- -n KnownBug`
  * (currently empty - all catalogued bugs were fixed 2026-07-19); exclude: `-- -l KnownBug`. */
object KnownBug extends Tag("KnownBug")

/** Base for every UI spec.
  *  - fresh `BrowserContext` + `Page` per test (clean cookies + localStorage),
  *  - a Playwright trace recorded per test (kept on failure, or always when `TRACE=on`),
  *  - a `PulsarFixtures` (admin oracle + producer) with per-test teardown.
  * Tests use `page` to drive the UI and `admin` / `client` to arrange + assert server state. */
trait DekafSuite extends AnyFunSuite with BeforeAndAfterAll:
  protected val fixtures: PulsarFixtures = new PulsarFixtures
  protected def admin = fixtures.admin
  protected def client = fixtures.client

  protected var context: BrowserContext = scala.compiletime.uninitialized
  protected var page: Page = scala.compiletime.uninitialized

  override def withFixture(test: NoArgTest): Outcome =
    context = PwRuntime.browser.newContext(
      NewContextOptions()
        .setBaseURL(Config.baseUrl)
        .setViewportSize(1280, 800)
        .setPermissions(java.util.List.of("clipboard-read", "clipboard-write"))
    )
    // Everything after context creation runs inside the try: a throw from tracing().start or
    // newPage() must still tear the context down, or each such failure leaks a live (possibly
    // tracing) context and accelerates the shared browser's decline.
    page = null
    var tracingStarted = false
    var outcome: Outcome = null
    try
      if Config.trace != Config.TraceMode.Off then
        context.tracing().start(
          new Tracing.StartOptions().setScreenshots(true).setSnapshots(true).setSources(true)
        )
        tracingStarted = true
      page = context.newPage()
      outcome = super.withFixture(test)
      outcome
    finally
      val keep = Config.trace match
        case Config.TraceMode.On             => true
        case Config.TraceMode.Off            => false
        case Config.TraceMode.RetainOnFailure => outcome == null || !outcome.isSucceeded
      // Every step attempts regardless of an earlier failure, so one broken step can't leak the rest.
      // Ordering is deliberate: delete the broker resources while the page is STILL OPEN, so a live
      // Consumer Session observes the deletion and the server tears its consumer down promptly.
      // (Closing the browser first was tried and reverted: the server-side sessions linger, and after
      // a handful of tests page loads start timing out.)
      def attempt(label: String)(f: => Unit): Unit =
        try f catch case t: Throwable => System.err.println(s"[teardown:$label] ${t.getMessage}")
      attempt("tracing")(if tracingStarted then stopTracing(test, outcome, keep))
      attempt("fixtures.cleanup")(fixtures.cleanup())
      attempt("page.close")(if page != null then page.close())
      attempt("context.close")(context.close())

  /** PASS / FAIL / BUG (a KnownBug that failed as designed) / SKIP - stamped into the trace filename
    * so the dashboard can colorize without re-deriving the outcome from the trace. */
  private def statusOf(test: NoArgTest, outcome: Outcome): String =
    if outcome == null then "FAIL"                                   // aborted before an outcome
    else if outcome.isSucceeded then "PASS"
    else if outcome.isCanceled || outcome.isPending then "SKIP"
    else if test.tags.contains("KnownBug") then "BUG"
    else "FAIL"

  private def stopTracing(test: NoArgTest, outcome: Outcome, keep: Boolean): Unit =
    if Config.trace != Config.TraceMode.Off then
      val base = s"${suiteName}__${test.name}".replaceAll("[^A-Za-z0-9._-]", "_")
      // One trace per test: the dir mirrors the LATEST run. All possible prior names for this test -
      // the four status prefixes plus the pre-status legacy `<base>.zip` - are pruned, EXCEPT the one
      // just written. Pruning runs only after `stop` succeeds (or after a deliberate no-write), so a
      // crash inside `stop` can no longer destroy the previous trace along with the new one.
      def pruneOthers(justWritten: Option[String]): Unit =
        if Files.isDirectory(Config.tracesDir) then
          val candidates = Seq("PASS", "FAIL", "BUG", "SKIP").map(st => s"${st}__$base.zip") :+ s"$base.zip"
          candidates.filterNot(justWritten.contains)
            .foreach(n => Files.deleteIfExists(Config.tracesDir.resolve(n)))
      if keep then
        Files.createDirectories(Config.tracesDir)
        val name = s"${statusOf(test, outcome)}__$base.zip"
        context.tracing().stop(new Tracing.StopOptions().setPath(Config.tracesDir.resolve(name)))
        pruneOthers(Some(name))
      else
        // Deliberate: in retain-on-failure mode a now-passing test removes its stale FAIL trace -
        // the dir reflects current reality; re-record with TRACE=on if you want passing traces too.
        context.tracing().stop()
        pruneOthers(None)

  override def afterAll(): Unit =
    // Surface any per-test cleanup failures loudly, but do NOT fail/abort the suite over them:
    // cleanup hygiene is not a test result (on CI the whole Pulsar container is discarded right
    // after the run; a green 175/175 must not go red over a teardown race). Not-found deletes and
    // one transient retry are already handled inside PulsarFixtures.cleanup - anything reported
    // here failed twice and is a genuine candidate leak.
    val leaks = fixtures.cleanupFailuresSnapshot
    try
      fixtures.close()
      if leaks.nonEmpty then
        System.err.println(
          s"[cleanup] WARNING: ${leaks.size} resource-cleanup failure(s) in ${suiteName} (possible leak):\n  - ${leaks.mkString("\n  - ")}"
        )
    finally super.afterAll()
