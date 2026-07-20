package harness

import com.sun.net.httpserver.{HttpExchange, HttpServer}
import java.net.InetSocketAddress
import java.nio.file.{Files, Path, Paths}
import scala.jdk.CollectionConverters.*

/** Open the Trace Viewer (a local web app: scrubable timeline + a DOM snapshot at every step +
  * network/console/source). With no args it serves EVERY recorded trace merged into one timeline;
  * with args it serves exactly those. Args may contain `*` globs - expanded here, since the quoted
  * sbt command shields them from the shell. Filenames are `<STATUS>__<Suite>__<test>.zip`, so a
  * one-test pick is e.g. the glob "star CS-10 star .zip" (spelled out - a literal star after the
  * directory slash would nest this comment) under target/traces:
  *   sbt "runMain harness.ShowTrace"        # all traces merged
  * Traces are only recorded for FAILING tests by default - record every test with `TRACE=on`. */
object ShowTrace:
  def main(args: Array[String]): Unit =
    val traces = if args.nonEmpty then args.toSeq.flatMap(Trace.expandArg) else Trace.recordedTraces.map(_.toString)
    if traces.isEmpty then Trace.warnNoTraces()
    else com.microsoft.playwright.CLI.main(Array("show-trace", "--host", "127.0.0.1", "--port", "9323") ++ traces)

/** A browse-and-pick dashboard over every recorded test - the closest thing to Node's `--ui` mode.
  * Serves the GENERIC Playwright trace viewer at `/` (same PWA as trace.playwright.dev, so it honors
  * `?trace=<url>` and switches between tests) plus a clickable index at `/dashboard`, all from one
  * local http origin (no HTTPS→HTTP mixed-content block, no cross-origin).
  *   TRACE=on sbt test                     # record a trace per test first
  *   sbt "runMain harness.TraceDashboard"  # then open http://127.0.0.1:9500/dashboard (TRACE_PORT) */
object TraceDashboard:
  def main(args: Array[String]): Unit =
    val port = sys.env.getOrElse("TRACE_PORT", "9500").toInt
    val traces = Trace.recordedTraces
    if traces.isEmpty then { Trace.warnNoTraces(); return }

    // Creating a Playwright instance extracts the driver bundle - which contains the trace-viewer
    // assets - into a temp dir that lives as long as THIS JVM. Keep the instance so the dir persists.
    val pw =
      try com.microsoft.playwright.Playwright.create()
      catch case t: Throwable => { System.err.println(s"Could not start Playwright to locate the viewer: $t"); return }
    // A `match` (not `getOrElse`'s lambda) so the early `return` stays local to main - non-local
    // returns are deprecated in Scala 3 and this was the build's one warning.
    val viewerDir = Trace.locateViewerDir match
      case Some(dir) => dir
      case None =>
        System.err.println("Could not locate the bundled trace viewer assets."); pw.close(); return

    val server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0)
    server.createContext("/", (ex: HttpExchange) =>
      // Everything is same-origin (viewer at `/`, traces at `/traces/`) - deliberately NO CORS header,
      // so other origins the user's browser visits cannot read the trace archives.
      try
        ex.getRequestURI.getPath match
          case "/dashboard" | "/dashboard.html" =>
            // Rebuilt per request: the suite renames/replaces status-stamped traces on every re-run,
            // and a stale one-shot index would link to files that no longer exist.
            val index = Trace.indexHtml(Trace.recordedTraces, port).getBytes("UTF-8")
            ex.getResponseHeaders.add("Content-Type", "text/html; charset=utf-8")
            ex.sendResponseHeaders(200, index.length); ex.getResponseBody.write(index)
          case p if p.startsWith("/traces/") =>
            Trace.serveFrom(ex, Trace.tracesDir, p.stripPrefix("/traces/"))
          case "/" | "" =>
            Trace.serveFrom(ex, viewerDir, "index.html")      // the generic viewer at root
          case p =>
            Trace.serveFrom(ex, viewerDir, p.stripPrefix("/")) // viewer assets (sw.bundle.js, /assets, …)
      catch
        case t: Throwable =>
          System.err.println(s"[trace-dashboard] ${ex.getRequestURI} failed: $t")
          try ex.sendResponseHeaders(500, -1) catch case _: Throwable => () // headers may already be sent
      finally ex.close()
    )
    server.start()
    val url = s"http://127.0.0.1:$port/dashboard"
    println(s"\n  Trace dashboard: $url   (${traces.size} tests)\n  Ctrl-C to stop.\n")
    Trace.openBrowser(url)
    Thread.currentThread.join()

/** Record UI interactions into selectors/code:
  *   sbt "runMain harness.Codegen http://localhost:8090" */
object Codegen:
  def main(args: Array[String]): Unit =
    com.microsoft.playwright.CLI.main("codegen" +: args)

private object Trace:
  val tracesDir: Path = Paths.get("target", "traces").toAbsolutePath.normalize

  def recordedTraces: Seq[Path] =
    if !Files.isDirectory(tracesDir) then Seq.empty
    else Files.list(tracesDir).iterator().asScala.filter(_.toString.endsWith(".zip")).toSeq.sortBy(_.getFileName.toString)

  def warnNoTraces(): Unit =
    System.err.println(s"No traces in $tracesDir.\nRecord one per test with:  TRACE=on sbt test")

  /** The extracted `…/package/lib/vite/traceViewer` dir (newest), created by `Playwright.create()`. */
  def locateViewerDir: Option[Path] =
    val tmp = Paths.get(System.getProperty("java.io.tmpdir"))
    if !Files.isDirectory(tmp) then None
    else
      Files.list(tmp).iterator().asScala
        .filter(_.getFileName.toString.startsWith("playwright-java-"))
        .map(_.resolve("package/lib/vite/traceViewer"))
        .filter(d => Files.isRegularFile(d.resolve("index.html")))
        .toSeq
        .sortBy(d => -Files.getLastModifiedTime(d.resolve("index.html")).toMillis)
        .headOption

  /** Expand a `*` glob against its parent directory (the quoted sbt command shields it from the
    * shell); non-glob args pass through untouched. */
  def expandArg(arg: String): Seq[String] =
    if !arg.contains('*') then Seq(arg)
    else
      val p = Paths.get(arg)
      val dir = Option(p.getParent).getOrElse(Paths.get("."))
      if !Files.isDirectory(dir) then Seq.empty
      else
        val matcher = dir.getFileSystem.getPathMatcher(s"glob:${p.getFileName}")
        Files.list(dir).iterator().asScala
          .filter(f => matcher.matches(f.getFileName)).map(_.toString).toSeq.sorted

  /** Serve `relative` under `baseDir` (path-traversal guarded) with a sensible content type.
    * Bytes are read before any headers are sent, so a trace replaced mid-request by a concurrently
    * running suite yields a clean 404 instead of a dropped connection. */
  def serveFrom(ex: HttpExchange, baseDir: Path, relative: String): Unit =
    val file = baseDir.resolve(relative).normalize
    if !file.startsWith(baseDir) then ex.sendResponseHeaders(404, -1)
    else
      val bytes =
        try if Files.isRegularFile(file) then Some(Files.readAllBytes(file)) else None
        catch case _: java.nio.file.NoSuchFileException => None
      bytes match
        case None => ex.sendResponseHeaders(404, -1)
        case Some(b) =>
          ex.getResponseHeaders.add("Content-Type", mime(file.getFileName.toString))
          ex.sendResponseHeaders(200, b.length)
          ex.getResponseBody.write(b)

  private def mime(name: String): String = name.toLowerCase match
    case n if n.endsWith(".html")         => "text/html; charset=utf-8"
    case n if n.endsWith(".js")           => "text/javascript; charset=utf-8"
    case n if n.endsWith(".mjs")          => "text/javascript; charset=utf-8"
    case n if n.endsWith(".css")          => "text/css; charset=utf-8"
    case n if n.endsWith(".svg")          => "image/svg+xml"
    case n if n.endsWith(".ttf")          => "font/ttf"
    case n if n.endsWith(".woff2")        => "font/woff2"
    case n if n.endsWith(".webmanifest")  => "application/manifest+json"
    case n if n.endsWith(".json")         => "application/json"
    case n if n.endsWith(".zip")          => "application/zip"
    case _                                => "application/octet-stream"

  private val Statuses = Set("PASS", "FAIL", "BUG", "SKIP")

  /** Filename shape is `<STATUS>__<Suite>__<test with _ for spaces>.zip` (status stamped by DekafSuite).
    * Old traces without a status prefix parse as `("", suite, test)`. Returns (status, suite, test). */
  private def parse(p: Path): (String, String, String) =
    val base = p.getFileName.toString.stripSuffix(".zip")
    val head = base.split("__", 3)
    if head.length == 3 && Statuses.contains(head(0)) then (head(0), head(1), head(2).replace('_', ' '))
    else base.split("__", 2) match
      case Array(suite, test) => ("", suite, test.replace('_', ' '))
      case _                  => ("", "(other)", base)

  private def statusLabel(st: String): String = st match
    case "PASS" => "passed"; case "FAIL" => "failed"; case "BUG" => "known bug"
    case "SKIP" => "skipped"; case _ => ""

  def indexHtml(traces: Seq[Path], port: Int): String =
    val esc = (s: String) => s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;")
    val entries = traces.map { p => val (st, suite, test) = parse(p); (st, suite, test, p.getFileName.toString) }
    def count(st: String) = entries.count(_._1 == st)
    // A filter chip per status that actually occurs, in severity order, plus an always-present "All".
    val chipDefs = Seq("FAIL" -> "Failed", "BUG" -> "Known bug", "PASS" -> "Passed", "SKIP" -> "Skipped")
    val chips = (s"""<button data-filter="all" class="chip active">All <b>${entries.size}</b></button>""" +:
      chipDefs.collect { case (st, name) if count(st) > 0 =>
        s"""<button data-filter="${st.toLowerCase}" class="chip ${st.toLowerCase}"><span class="dot"></span>$name <b>${count(st)}</b></button>"""
      }).mkString("\n")

    val bySuite = entries.groupBy(_._2).toSeq.sortBy(_._1)
    val sections = bySuite.map { (suite, es) =>
      val rows = es.sortBy(_._3).map { case (st, _, test, file) =>
        // Same-origin: the generic viewer at `/` loads the trace served at `/traces/<file>`.
        val href = s"/?trace=http://127.0.0.1:$port/traces/${java.net.URLEncoder.encode(file, "UTF-8")}"
        val badge = if st.isEmpty then "" else s"""<span class="badge">${statusLabel(st)}</span>"""
        s"""<li data-status="${st.toLowerCase}"><a class="${st.toLowerCase}" href="${esc(href)}" target="_blank" rel="noopener"><span class="dot"></span><span class="t">${esc(test)}</span>$badge</a></li>"""
      }.mkString("\n")
      s"""<section data-suite><h2>${esc(suite)} <span class="n">${es.size}</span></h2><ul>$rows</ul></section>"""
    }.mkString("\n")

    s"""<!doctype html><meta charset="utf-8"><title>Dekaf E2E - trace dashboard</title>
       |<style>
       | :root{color-scheme:light dark;
       |   --pass:#16a34a; --fail:#dc2626; --bug:#d97706; --skip:#6b7280; --muted:#8884}
       | @media (prefers-color-scheme:dark){:root{--pass:#22c55e; --fail:#f87171; --bug:#fbbf24; --skip:#9ca3af}}
       | body{font:14px/1.5 -apple-system,system-ui,sans-serif;margin:0;padding:24px 32px;max-width:1120px}
       | h1{font-size:20px;margin:0 0 4px} p.sub{color:#888;margin:0 0 16px}
       | .bar{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 24px;position:sticky;top:0;
       |   background:Canvas;padding:8px 0;z-index:1}
       | .chip{font:inherit;cursor:pointer;border:1px solid var(--muted);border-radius:999px;
       |   padding:4px 12px;background:transparent;color:inherit;display:inline-flex;align-items:center;gap:6px}
       | .chip b{font-weight:600;font-variant-numeric:tabular-nums} .chip:hover{border-color:#8888}
       | .chip.active{background:#8882;border-color:#8886}
       | .dot{width:8px;height:8px;border-radius:999px;background:var(--skip);flex:none;display:inline-block}
       | .pass .dot,.chip.pass .dot{background:var(--pass)} .fail .dot,.chip.fail .dot{background:var(--fail)}
       | .bug .dot,.chip.bug .dot{background:var(--bug)} .skip .dot,.chip.skip .dot{background:var(--skip)}
       | section{margin:0 0 20px} h2{font-size:14px;color:#888;
       |   border-bottom:1px solid var(--muted);padding-bottom:4px;margin:0 0 8px}
       | h2 .n{color:#aaa;font-weight:400}
       | ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:1px}
       | a{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;text-decoration:none;color:inherit}
       | a:hover{background:#3b82f622} a .t{flex:1}
       | a:hover .t{color:#3b82f6}
       | .badge{font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:var(--skip);flex:none}
       | .pass .badge{color:var(--pass)} .fail .badge{color:var(--fail)} .bug .badge{color:var(--bug)}
       |</style>
       |<h1>Dekaf E2E - trace dashboard</h1>
       |<p class="sub">${entries.size} recorded traces · click any to open its trace (timeline · DOM snapshots · network · console) in the Playwright viewer. Filter with the chips.</p>
       |<div class="bar">$chips</div>
       |$sections
       |<script>
       | const chips=[...document.querySelectorAll('.chip')];
       | function apply(f){
       |   chips.forEach(c=>c.classList.toggle('active', c.dataset.filter===f));
       |   document.querySelectorAll('li[data-status]').forEach(li=>{
       |     li.style.display=(f==='all'||li.dataset.status===f)?'':'none';
       |   });
       |   document.querySelectorAll('section[data-suite]').forEach(s=>{
       |     const any=[...s.querySelectorAll('li')].some(li=>li.style.display!=='none');
       |     s.style.display=any?'':'none';
       |   });
       | }
       | chips.forEach(c=>c.addEventListener('click',()=>apply(c.dataset.filter)));
       |</script>
       |""".stripMargin

  def openBrowser(url: String): Unit =
    val os = sys.props.getOrElse("os.name", "").toLowerCase
    val cmd = if os.contains("mac") then Array("open", url) else Array("xdg-open", url)
    try Runtime.getRuntime.exec(cmd) catch case _: Throwable => println(s"  Open manually: $url")
