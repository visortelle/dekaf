package harness

import java.net.{ServerSocket, URI}
import java.net.http.{HttpClient, HttpRequest, HttpResponse}
import java.nio.file.{Files, Path, Paths}
import java.time.Duration
import java.util.concurrent.TimeUnit
import scala.jdk.CollectionConverters.*
import scala.util.Using

/** A short-lived Dekaf server started with arbitrary `DEKAF_*` overrides, on a free port, with a
  * data dir of its own - the affordance the CONFIGURATION specs need and that the shared stack
  * cannot give them.
  *
  * Why it has to exist: a configuration property is only observable in a process that was STARTED
  * with it. `scripts/run-dekaf.sh` brings up exactly one Dekaf with one fixed config, so every spec
  * in this suite has so far exercised one point in the config space - and the two cookie-hardening
  * bugs that shipped (`Secure` computed but never interpolated; `cookieSameSite` matched only
  * lowercase, so `Lax` silently emitted NO attribute) were invisible to every tier precisely
  * because nothing ran the env-var -> config-load -> behaviour path end to end. A test that hands
  * the cookie writer its parameters directly cannot see either.
  *
  * The shape mirrors `run-dekaf.sh`: put the per-arch `envoy.bin` on PATH, point the server at the
  * e2e Pulsar, seed a throwaway `DEKAF_DATA_DIR` with `js/` + `proto/` (a bare empty dir does not
  * boot - `ConsumerSessionContext` reads `js/dist/libs.js` from it at startup), start, wait for
  * GENUINE readiness, and always tear down. Two deliberate differences:
  *
  *   - it runs the STAGED launcher (`server/target/universal/stage/bin/dekaf`) rather than
  *     `sbt run`. `sbt run` forks the app into a grandchild JVM, so the handle a test holds is
  *     sbt's, and killing it can leave the app alive holding the port - a leak that makes the NEXT
  *     instance fail for no visible reason. The staged script `exec`s java, so the handle IS the
  *     server and its Envoy child is a plain descendant.
  *   - the port is PROBED from a range well clear of the shared stack (:8090) and of :8080, rather
  *     than hardcoded, so a leftover instance cannot silently take over a later run.
  *
  * That staged build is produced on demand when it is MISSING, and otherwise REUSED - see
  * `launcher` for why staging every run was worse than the staleness it prevents, and for the
  * `DEKAF_SERVER_STAGE=force` escape hatch you want after editing `server/`.
  */
object DekafInstance:

  /** A running instance. `baseUrl` is where the app is actually SERVED (origin + basePath), which
    * is not always `publicBaseUrl` - a reverse proxy that strips the prefix makes them differ. */
  final case class Instance(port: Int, basePath: String, dataDir: Path, log: Path):
    def origin: String = s"http://localhost:$port"
    def baseUrl: String = origin + basePath

    /** Absolute URL for an in-app path. Specs MUST use these: `DekafSuite`'s BrowserContext carries
      * the shared stack's baseURL, so a relative `page.navigate("/overview")` would leave the
      * instance under test entirely. */
    def url(path: String): String = baseUrl + path

  // ---------------------------------------------------------------------------------------------
  // Locations
  // ---------------------------------------------------------------------------------------------

  /** The `e2e/` project. sbt forks tests with the project base as the working directory; the second
    * candidate keeps the harness usable from an IDE that chose the repo root instead. */
  private val e2eRoot: Path =
    Seq(Paths.get("."), Paths.get("e2e"))
      .map(_.toAbsolutePath.normalize)
      .find(p => Files.isRegularFile(p.resolve("build.sbt")) && Files.isDirectory(p.resolve("src/test/scala")))
      .getOrElse(throw new IllegalStateException(
        s"cannot locate the e2e project from ${Paths.get("").toAbsolutePath}"
      ))

  private val repoRoot: Path =
    val root = e2eRoot.getParent
    if root == null || !Files.isRegularFile(root.resolve("server/build.sbt")) then
      throw new IllegalStateException(s"cannot locate the repo root (server/build.sbt) above $e2eRoot")
    root

  /** Everything this helper writes: one log per instance (kept - it is the only diagnosis when a
    * server fails to boot) and the throwaway data dirs (removed, see `withInstance`). Under
    * `e2e/target/`, which is gitignored, same as `target/traces`. */
  private val workDir: Path = e2eRoot.resolve("target/config-instances")

  /** The directory holding the per-arch `envoy.bin`, i.e. what `bin/get-bin-dir.js` prints. The
    * embedded Envoy is what actually listens on `DEKAF_PORT`, so without this nothing serves. */
  private val envoyBinDir: Path =
    val os = System.getProperty("os.name", "").toLowerCase
    val platform =
      if os.contains("mac") || os.contains("darwin") then "darwin"
      else if os.contains("win") then "win32"
      else "linux"
    val arch = System.getProperty("os.arch", "").toLowerCase match
      case "aarch64" | "arm64"          => "arm64"
      case "x86_64" | "amd64" | "x64"   => "x64"
      case other                        => other
    val dir = repoRoot.resolve(s"bin/$platform/$arch")
    if !Files.isDirectory(dir) then
      throw new IllegalStateException(s"no binary dependencies for $platform/$arch: $dir does not exist")
    dir

  // ---------------------------------------------------------------------------------------------
  // The staged launcher
  // ---------------------------------------------------------------------------------------------

  private def stagedLauncher: Path = repoRoot.resolve("server/target/universal/stage/bin/dekaf")

  /** Resolved ONCE per test JVM. `lazy val` is the memoization: only a run that actually starts an
    * instance pays for it, and a suite that starts twelve pays once.
    *
    * Staging runs when the launcher is MISSING, or on `DEKAF_SERVER_STAGE=force`. It is not the
    * default because the sbt that would do it is a second sbt sharing this one's `~/.ivy2` locks,
    * and that contention is real: a `sbt stage` launched from inside a running e2e run intermittently
    * exits 1 with no diagnostic at all, right after loading the meta-build. Hence the retries below,
    * and hence the fall back to an existing launcher rather than failing the whole lane over it.
    *
    * The cost of not staging every time is honest and worth naming: after editing `server/`, these
    * specs test the LAST STAGED build unless you re-stage. `DEKAF_SERVER_STAGE=force` (or
    * `cd server && sbt stage`) is the fix; `e2e/README.md` §6 says so. */
  private lazy val launcher: Path =
    val mode = sys.env.get("DEKAF_SERVER_STAGE").map(_.trim.toLowerCase).getOrElse("")
    val haveLauncher = Files.isExecutable(stagedLauncher)
    if haveLauncher && mode != "force" then
      println(s"[DekafInstance] using the staged server at $stagedLauncher (DEKAF_SERVER_STAGE=force to re-stage)")
      stagedLauncher
    else
      Files.createDirectories(workDir)
      var failures = List.empty[String]
      var staged = false
      var attempt = 1
      while !staged && attempt <= 3 do
        stageOnce(attempt) match
          case None      => staged = true
          case Some(err) => failures = failures :+ err
        attempt += 1
      if staged then stagedLauncher
      else if haveLauncher then
        System.err.println(
          s"[DekafInstance] WARNING: could not re-stage the server; falling back to the EXISTING build at " +
            s"$stagedLauncher, which may predate your server/ changes.\n  ${failures.mkString("\n  ")}"
        )
        stagedLauncher
      else
        throw new IllegalStateException(
          s"could not stage the server, and there is no build at $stagedLauncher to fall back to. These " +
            "specs start their own Dekaf and need it. Stage it directly - `cd server && sbt stage` - inside " +
            s"the nix shell, then re-run.\n  ${failures.mkString("\n  ")}"
        )

  /** One `sbt stage` attempt: `None` on success, `Some(diagnosis)` on failure. */
  private def stageOnce(attempt: Int): Option[String] =
    val log = workDir.resolve(s"sbt-stage-$attempt.log")
    println(s"[DekafInstance] staging the server (attempt $attempt: cd server && sbt stage) -> $log")
    val pb = new ProcessBuilder("sbt", "-batch", "stage")
    pb.directory(repoRoot.resolve("server").toFile)
    pb.redirectErrorStream(true)
    pb.redirectOutput(log.toFile)
    try
      val process = pb.start()
      if !process.waitFor(20, TimeUnit.MINUTES) then
        process.destroyForcibly()
        Some(s"attempt $attempt: timed out after 20 minutes; see $log")
      else if process.exitValue() != 0 then
        Some(s"attempt $attempt: exit ${process.exitValue()}; tail of $log:\n${tail(log, 15)}")
      else if !Files.isExecutable(stagedLauncher) then
        Some(s"attempt $attempt: exit 0 but $stagedLauncher is missing; see $log")
      else None
    catch case e: java.io.IOException => Some(s"attempt $attempt: cannot run `sbt` (${e.getMessage})")

  // ---------------------------------------------------------------------------------------------
  // Ports
  // ---------------------------------------------------------------------------------------------

  /** Deliberately clear of :8080 (an unrelated service is often there) and of :8090 (the shared
    * stack this suite otherwise runs against). Probed rather than hardcoded so a leftover instance
    * cannot make a later run mysterious. */
  private val portRange: Vector[Int] = (8700 to 8799).toVector

  /** A port is free only if nothing ANSWERS on it and it can still be bound.
    *
    * The bind check alone is not enough, and quietly handed out an occupied port: Java's
    * `ServerSocket` sets `SO_REUSEADDR`, so binding the wildcard address succeeds on BSD/macOS even
    * while another process holds the same port on `127.0.0.1`. Envoy then binds the wildcard too,
    * loopback traffic goes to the more specific bind - i.e. to the other program - and the test
    * fails against a server that is not Dekaf. (Seen for real: an unrelated local service on
    * 127.0.0.1:8765 answered the readiness poll with its own 401.) So connect first, on both
    * loopback families, and only trust a refusal. */
  private def isFree(port: Int): Boolean =
    def answers(host: String): Boolean =
      val socket = new java.net.Socket()
      try
        socket.connect(new java.net.InetSocketAddress(host, port), 250)
        true
      catch case _: Throwable => false
      finally try socket.close() catch case _: Throwable => ()
    if answers("127.0.0.1") || answers("::1") then false
    else
      try Using.resource(new ServerSocket(port))(_ => true)
      catch case _: Throwable => false

  private def freePort(): Int =
    // A random start spreads two runs on one box across the range instead of racing on 8700.
    val offset = scala.util.Random.nextInt(portRange.size)
    portRange.indices.iterator
      .map(i => portRange((offset + i) % portRange.size))
      .find(isFree)
      .getOrElse(throw new IllegalStateException(
        s"no free port in ${portRange.head}..${portRange.last} - something is holding the whole range"
      ))

  // ---------------------------------------------------------------------------------------------
  // Data dirs
  // ---------------------------------------------------------------------------------------------

  private def safe(label: String): String = label.replaceAll("[^A-Za-z0-9._-]", "-")

  private def copyTree(from: Path, to: Path): Unit =
    Using.resource(Files.walk(from)) { walk =>
      walk.iterator().asScala.foreach { src =>
        val dst = to.resolve(from.relativize(src).toString)
        if Files.isDirectory(src) then Files.createDirectories(dst)
        else
          Files.createDirectories(dst.getParent)
          Files.copy(src, dst)
      }
    }

  /** A seeded, EMPTY-library data dir. The caller owns it (see `withDataDir`); `withInstance` makes
    * and removes one per instance, which is what keeps Library state from bleeding between specs.
    *
    * A bare empty dir does not boot: the server reads `js/dist/libs.js` and `proto/` out of it at
    * startup. Same seeding as `run-dekaf.sh`'s `DEKAF_FRESH_DATA=1` block. */
  def newDataDir(label: String): Path =
    Files.createDirectories(workDir)
    val dir = Files.createTempDirectory(workDir, s"${safe(label)}-data-")
    Files.createDirectories(dir.resolve("library"))
    copyTree(repoRoot.resolve("server/data/js"), dir.resolve("js"))
    copyTree(repoRoot.resolve("server/data/proto"), dir.resolve("proto"))
    dir

  def deleteTree(dir: Path): Unit =
    if Files.exists(dir) then
      Using.resource(Files.walk(dir)) { walk =>
        walk.sorted(java.util.Comparator.reverseOrder()).iterator().asScala.foreach(Files.deleteIfExists)
      }

  /** A data dir that OUTLIVES a single instance - for asserting that two instances started on the
    * same `dataDir` share state while two on different ones do not. Always removed. */
  def withDataDir[T](label: String)(body: Path => T): T =
    val dir = newDataDir(label)
    try body(dir)
    finally deleteTree(dir)

  // ---------------------------------------------------------------------------------------------
  // Start / stop
  // ---------------------------------------------------------------------------------------------

  /** Pinned to HTTP/1.1 deliberately. The JDK client defaults to HTTP/2, which on cleartext means an
    * `Upgrade: h2c` probe on the first request to each new origin - and Jetty behind Envoy answers
    * that with `400 Invalid Upgrade header`. Every instance here is a NEW origin (a new port), so
    * the readiness poll would intermittently see a 400 that says nothing about readiness and burn
    * the whole timeout on a server that was already up. */
  private val http: HttpClient =
    HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(2)).build()

  private def get(url: String): Option[(Int, String)] =
    try
      val request = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(5)).GET().build()
      val response = http.send(request, HttpResponse.BodyHandlers.ofString())
      Some(response.statusCode -> response.body)
    catch case _: Throwable => None

  private def tail(file: Path, lines: Int): String =
    try Files.readString(file).linesIterator.toList.takeRight(lines).mkString("\n")
    catch case _: Throwable => s"(no log at $file)"

  /** Poll a REAL precondition, never a sleep: `/health` answers 200 "ok" only once the gRPC server
    * is up (`GrpcServer.isRunning`) AND the request survived the round trip through the embedded
    * Envoy that fronts it - which is also the only thing in this suite that exercises Envoy's
    * `basePath` routing. A dead process fails immediately rather than burning the timeout. */
  private def awaitReady(instance: Instance, process: Process, timeoutMs: Long): Unit =
    val deadline = System.currentTimeMillis() + timeoutMs
    var lastSeen = "no response yet"
    while System.currentTimeMillis() < deadline do
      if !process.isAlive then
        throw new IllegalStateException(
          s"Dekaf on :${instance.port} exited with code ${process.exitValue()} before becoming ready.\n" +
            s"--- ${instance.log} (tail) ---\n${tail(instance.log, 40)}"
        )
      get(instance.url("/health")) match
        case Some((200, body)) if body.trim == "ok" => return
        case Some((code, body))                     => lastSeen = s"HTTP $code: ${body.take(200)}"
        case None                                   => lastSeen = "no connection"
      Thread.sleep(200)
    throw new IllegalStateException(
      s"Dekaf on :${instance.port} did not become ready within ${timeoutMs}ms (last: $lastSeen).\n" +
        s"--- ${instance.log} (tail) ---\n${tail(instance.log, 40)}"
    )

  /** Kill the server AND its Envoy child. Envoy is a plain descendant of the JVM, so it is
    * snapshotted before the parent dies (a dead parent has no descendants to enumerate) and swept
    * afterwards; a surviving Envoy would hold the port and make the next instance fail for a reason
    * that has nothing to do with the test that failed. */
  private def stop(instance: Instance, process: Process): Unit =
    val children = process.descendants().iterator().asScala.toList
    process.destroy()
    if !process.waitFor(20, TimeUnit.SECONDS) then
      process.destroyForcibly()
      process.waitFor(10, TimeUnit.SECONDS)
    children.filter(_.isAlive).foreach(_.destroy())
    val deadline = System.currentTimeMillis() + 10000
    while children.exists(_.isAlive) && System.currentTimeMillis() < deadline do Thread.sleep(100)
    children.filter(_.isAlive).foreach(_.destroyForcibly())
    // The port must actually come back, or the next instance inherits a mystery.
    val portDeadline = System.currentTimeMillis() + 15000
    while !isFree(instance.port) && System.currentTimeMillis() < portDeadline do Thread.sleep(100)
    if !isFree(instance.port) then
      System.err.println(s"[DekafInstance] WARNING: :${instance.port} is still held after stopping ${instance.log}")

  /** Start a Dekaf with `overrides` on a free port and a fresh data dir, hand it to `body`, and
    * ALWAYS tear it down - the data dir included. */
  def withInstance[T](label: String, overrides: (String, String)*)(body: Instance => T): T =
    val dataDir = newDataDir(label)
    try withInstanceOn(label, dataDir, overrides*)(body)
    finally deleteTree(dataDir)

  /** As `withInstance`, but on a data dir the CALLER owns (and must remove).
    *
    * The port is only known once it has been probed, so an override that has to REFER to it - a
    * `publicBaseUrl` that differs from where the app is served, which is what a prefix-stripping
    * reverse proxy looks like - writes `{origin}` and gets `http://localhost:<port>`. */
  def withInstanceOn[T](label: String, dataDir: Path, overrides: (String, String)*)(body: Instance => T): T =
    val launcherPath = launcher // stage before claiming a port: staging can take minutes
    val port = freePort()
    val requested = overrides.toMap.view.mapValues(_.replace("{origin}", s"http://localhost:$port")).toMap
    // `normalizeConfig` strips the trailing slash, so the default "/" is served at the origin root.
    val basePath = requested.getOrElse("DEKAF_BASE_PATH", "/").stripSuffix("/")
    Files.createDirectories(workDir)
    val log = workDir.resolve(s"${safe(label)}-$port.log")
    val instance = Instance(port = port, basePath = basePath, dataDir = dataDir, log = log)

    val env = Map(
      "DEKAF_PORT" -> port.toString,
      "DEKAF_PUBLIC_BASE_URL" -> instance.baseUrl,
      "DEKAF_PULSAR_WEB_URL" -> Config.pulsarAdminUrl,
      "DEKAF_PULSAR_BROKER_URL" -> Config.pulsarServiceUrl,
      "DEKAF_DATA_DIR" -> dataDir.toString
    ) ++ requested

    val pb = new ProcessBuilder(launcherPath.toString)
    // cwd = server/: this is not a binary build, so Javalin serves the UI bundle from the RELATIVE
    // `src/main/resources/ui/static`, exactly as `run-dekaf.sh`'s `sbt run` does.
    pb.directory(repoRoot.resolve("server").toFile)
    pb.redirectErrorStream(true)
    pb.redirectOutput(log.toFile)
    pb.environment().put("PATH", s"${sys.env.getOrElse("PATH", "")}:${envoyBinDir.toString}")
    env.foreach((k, v) => pb.environment().put(k, v))

    val process = pb.start()
    try
      awaitReady(instance, process, timeoutMs = 120000)
      body(instance)
    catch
      case t: Throwable =>
        // The server log is the only place a config-rejection or a boot failure is visible.
        System.err.println(s"[DekafInstance] $label on :$port failed: ${t.getMessage}\n${tail(log, 25)}")
        throw t
    finally stop(instance, process)
